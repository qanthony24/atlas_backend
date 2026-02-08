import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { Pool } from 'pg';
import IORedis from 'ioredis';
import { authMiddleware, requireAdmin, requireInternal } from './middleware/auth';
import { config } from './config';
import { ensureBucket, putObject } from './storage';

export interface ImportQueue {
    add: (name: string, data: any) => Promise<any>;
}

interface AppDependencies {
    pool: Pool;
    importQueue: ImportQueue;
    s3Client: any;
}

const mapUser = (row: any) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: row.role
});

const mapOrg = (row: any) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    plan_id: row.plan_id,
    limits: row.limits || {},
    last_activity_at: row.last_activity_at
});

const mapVoter = (row: any) => ({
    id: row.id,
    orgId: row.org_id,
    externalId: row.external_id,
    firstName: row.first_name,
    middleName: row.middle_name || undefined,
    lastName: row.last_name,
    suffix: row.suffix || undefined,
    age: row.age || undefined,
    gender: row.gender || undefined,
    race: row.race || undefined,
    party: row.party || undefined,
    phone: row.phone || undefined,
    address: row.address,
    unit: row.unit || undefined,
    city: row.city,
    state: row.state || undefined,
    zip: row.zip,
    geom: row.geom_lat && row.geom_lng ? { lat: row.geom_lat, lng: row.geom_lng } : { lat: 0, lng: 0 },
    lastInteractionStatus: row.last_interaction_status || undefined,
    lastInteractionTime: row.last_interaction_time || undefined
});

const mapList = (row: any) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    voterIds: row.voter_ids || [],
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id
});

const mapAssignment = (row: any) => ({
    id: row.id,
    orgId: row.org_id,
    listId: row.list_id,
    canvasserId: row.canvasser_id,
    status: row.status,
    createdAt: row.created_at
});

const mapInteraction = (row: any) => ({
    id: row.id,
    org_id: row.org_id,
    user_id: row.user_id,
    voter_id: row.voter_id,
    assignment_id: row.assignment_id || undefined,
    occurred_at: row.occurred_at,
    channel: row.channel,
    result_code: row.result_code,
    notes: row.notes || undefined,
    client_interaction_uuid: row.client_interaction_uuid,
    survey_responses: row.survey_responses || undefined
});

export const createApp = ({ pool, importQueue, s3Client }: AppDependencies) => {
    const app = express();
    const upload = multer({ storage: multer.memoryStorage() });

    app.use(express.json({ limit: '10mb' }));
    app.use(cors());

    app.get('/health', (_req, res) => res.status(200).send('OK'));

    app.get('/ready', async (_req, res) => {
        try {
            await pool.query('SELECT 1');
            const redis = new IORedis(config.redisUrl);
            await redis.ping();
            await redis.quit();
            await ensureBucket(s3Client, config.s3Bucket);
            res.status(200).json({ status: 'ready' });
        } catch (err: any) {
            res.status(503).json({ status: 'not_ready', error: err.message });
        }
    });

    app.post('/api/v1/auth/login', async (req, res) => {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const stored = user.password_hash || '';
        const valid = stored.startsWith('$2') ? await bcrypt.compare(password, stored) : password === stored;
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const org = await pool.query('SELECT * FROM organizations WHERE id = $1', [user.org_id]);
        const token = jwt.sign(
            { sub: user.id, org_id: user.org_id, role: user.role },
            config.jwtSecret,
            { expiresIn: '12h' }
        );
        res.json({ token, user: mapUser(user), org: mapOrg(org.rows[0]) });
    });

    app.use('/api/v1', authMiddleware);

    app.post('/api/v1/auth/switch-role', async (req, res) => {
        const { role } = req.body || {};
        if (role !== 'admin' && role !== 'canvasser') {
            return res.status(400).json({ error: 'Invalid role' });
        }

        if (req.context.role === role) {
            const token = jwt.sign(
                { sub: req.context.userId, org_id: req.context.orgId, role },
                config.jwtSecret,
                { expiresIn: '12h' }
            );
            return res.json({ token });
        }

        if (req.context.role !== 'admin' && role === 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const userQuery = role === 'admin'
            ? `SELECT * FROM users WHERE org_id = $1 AND role = 'admin' LIMIT 1`
            : `SELECT * FROM users WHERE org_id = $1 AND role = 'canvasser' LIMIT 1`;
        const userResult = await pool.query(userQuery, [req.context.orgId]);
        const nextUser = userResult.rows[0];
        if (!nextUser) return res.status(404).json({ error: 'No user for role' });

        const token = jwt.sign(
            { sub: nextUser.id, org_id: req.context.orgId, role: nextUser.role },
            config.jwtSecret,
            { expiresIn: '12h' }
        );
        res.json({ token });
    });

    app.get('/api/v1/me', async (req, res) => {
        const user = await pool.query('SELECT * FROM users WHERE id = $1 AND org_id = $2', [req.context.userId, req.context.orgId]);
        if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(mapUser(user.rows[0]));
    });

    app.get('/api/v1/org', async (req, res) => {
        const org = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.context.orgId]);
        if (!org.rows[0]) return res.status(404).json({ error: 'Org not found' });
        res.json(mapOrg(org.rows[0]));
    });

    app.get('/api/v1/voters', async (req, res) => {
        const limit = Number(req.query.limit || 100);
        const offset = Number(req.query.offset || 0);
        const search = (req.query.search as string | undefined)?.toLowerCase();
        const searchClause = search ? `AND (LOWER(first_name) LIKE $4 OR LOWER(last_name) LIKE $4 OR LOWER(address) LIKE $4)` : '';
        const params = search ? [req.context.orgId, limit, offset, `%${search}%`] : [req.context.orgId, limit, offset];

        const result = await pool.query(
            `SELECT v.*,
                li.result_code AS last_interaction_status,
                li.occurred_at AS last_interaction_time
             FROM voters v
             LEFT JOIN (
                SELECT DISTINCT ON (voter_id, org_id)
                    voter_id, org_id, result_code, occurred_at
                FROM interactions
                WHERE org_id = $1
                ORDER BY voter_id, org_id, occurred_at DESC
             ) li ON li.voter_id = v.id AND li.org_id = v.org_id
             WHERE v.org_id = $1 ${searchClause}
             ORDER BY v.last_name ASC, v.first_name ASC
             LIMIT $2 OFFSET $3`,
            params
        );
        res.json(result.rows.map(mapVoter));
    });

    app.get('/api/v1/voters/:id', async (req, res) => {
        const result = await pool.query(
            `SELECT v.*,
                li.result_code AS last_interaction_status,
                li.occurred_at AS last_interaction_time
             FROM voters v
             LEFT JOIN (
                SELECT DISTINCT ON (voter_id, org_id)
                    voter_id, org_id, result_code, occurred_at
                FROM interactions
                WHERE org_id = $1
                ORDER BY voter_id, org_id, occurred_at DESC
             ) li ON li.voter_id = v.id AND li.org_id = v.org_id
             WHERE v.org_id = $1 AND v.id = $2`,
            [req.context.orgId, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Voter not found' });
        res.json(mapVoter(result.rows[0]));
    });

    app.post('/api/v1/voters', async (req, res) => {
        const voter = req.body || {};
        if (!voter.firstName || !voter.lastName || !voter.address) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const externalId = voter.externalId || `MAN-${crypto.randomUUID()}`;
        const result = await pool.query(
            `INSERT INTO voters (
                org_id, external_id, first_name, middle_name, last_name, suffix,
                age, gender, race, party, phone, address, unit, city, state, zip,
                geom_lat, geom_lng
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18
            ) RETURNING *`,
            [
                req.context.orgId,
                externalId,
                voter.firstName,
                voter.middleName || null,
                voter.lastName,
                voter.suffix || null,
                voter.age || null,
                voter.gender || null,
                voter.race || null,
                voter.party || null,
                voter.phone || null,
                voter.address,
                voter.unit || null,
                voter.city || 'Unknown',
                voter.state || 'LA',
                voter.zip || '',
                voter.geom?.lat || 40.7128 + Math.random() * 0.01,
                voter.geom?.lng || -74.006 + Math.random() * 0.01
            ]
        );
        await pool.query(
            `INSERT INTO audit_logs (action, actor_user_id, target_org_id, metadata)
             VALUES ('voter.create', $1, $2, $3)`,
            [req.context.userId, req.context.orgId, { voter_id: result.rows[0].id }]
        );
        res.status(201).json(mapVoter(result.rows[0]));
    });

    app.patch('/api/v1/voters/:id', async (req, res) => {
        const updates = req.body || {};
        const fields = [];
        const values = [];
        let idx = 1;
        const map: Record<string, string> = {
            firstName: 'first_name',
            middleName: 'middle_name',
            lastName: 'last_name',
            suffix: 'suffix',
            age: 'age',
            gender: 'gender',
            race: 'race',
            party: 'party',
            phone: 'phone',
            address: 'address',
            unit: 'unit',
            city: 'city',
            state: 'state',
            zip: 'zip'
        };
        Object.keys(map).forEach(key => {
            if (updates[key] !== undefined) {
                fields.push(`${map[key]} = $${idx++}`);
                values.push(updates[key]);
            }
        });
        if (updates.geom?.lat !== undefined) {
            fields.push(`geom_lat = $${idx++}`);
            values.push(updates.geom.lat);
        }
        if (updates.geom?.lng !== undefined) {
            fields.push(`geom_lng = $${idx++}`);
            values.push(updates.geom.lng);
        }
        if (fields.length === 0) return res.status(400).json({ error: 'No updates provided' });
        values.push(req.context.orgId, req.params.id);

        await pool.query(
            `UPDATE voters SET ${fields.join(', ')}, updated_at = NOW()
             WHERE org_id = $${idx++} AND id = $${idx}`,
            values
        );
        await pool.query(
            `INSERT INTO audit_logs (action, actor_user_id, target_org_id, metadata)
             VALUES ('voter.update', $1, $2, $3)`,
            [req.context.userId, req.context.orgId, { voter_id: req.params.id, fields: Object.keys(updates) }]
        );
        res.status(200).json({ ok: true });
    });

    app.get('/api/v1/lists', async (req, res) => {
        const result = await pool.query(
            `SELECT l.*,
                COALESCE(array_agg(m.voter_id) FILTER (WHERE m.voter_id IS NOT NULL), '{}') AS voter_ids
             FROM walk_lists l
             LEFT JOIN list_members m ON m.list_id = l.id AND m.org_id = l.org_id
             WHERE l.org_id = $1
             GROUP BY l.id
             ORDER BY l.created_at DESC`,
            [req.context.orgId]
        );
        res.json(result.rows.map(mapList));
    });

    app.post('/api/v1/lists', requireAdmin, async (req, res) => {
        const { name, voter_ids } = req.body || {};
        if (!name || !Array.isArray(voter_ids)) return res.status(400).json({ error: 'Invalid payload' });
        const listResult = await pool.query(
            `INSERT INTO walk_lists (org_id, name, created_by_user_id)
             VALUES ($1, $2, $3) RETURNING *`,
            [req.context.orgId, name, req.context.userId]
        );
        const listId = listResult.rows[0].id;
        for (const voterId of voter_ids) {
            await pool.query(
                `INSERT INTO list_members (org_id, list_id, voter_id)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [req.context.orgId, listId, voterId]
            );
        }
        await pool.query(
            `INSERT INTO platform_events (org_id, user_id, event_type, metadata)
             VALUES ($1, $2, 'list.created', $3)`,
            [req.context.orgId, req.context.userId, { list_id: listId, count: voter_ids.length }]
        );
        res.status(201).json(mapList({ ...listResult.rows[0], voter_ids }));
    });

    app.get('/api/v1/assignments', async (req, res) => {
        const scope = (req.query.scope as string) || (req.context.role === 'admin' ? 'org' : 'me');
        if (scope === 'org' && req.context.role !== 'admin') {
            return res.status(403).json({ error: 'Insufficient Permissions' });
        }
        const result = scope === 'org'
            ? await pool.query('SELECT * FROM assignments WHERE org_id = $1 ORDER BY created_at DESC', [req.context.orgId])
            : await pool.query('SELECT * FROM assignments WHERE org_id = $1 AND canvasser_id = $2 ORDER BY created_at DESC', [req.context.orgId, req.context.userId]);
        res.json(result.rows.map(mapAssignment));
    });

    app.post('/api/v1/assignments', requireAdmin, async (req, res) => {
        const { list_id, canvasser_id } = req.body || {};
        if (!list_id || !canvasser_id) return res.status(400).json({ error: 'Invalid payload' });
        const result = await pool.query(
            `INSERT INTO assignments (org_id, list_id, canvasser_id, status)
             VALUES ($1, $2, $3, 'assigned') RETURNING *`,
            [req.context.orgId, list_id, canvasser_id]
        );
        await pool.query(
            `INSERT INTO platform_events (org_id, user_id, event_type, metadata)
             VALUES ($1, $2, 'assignment.created', $3)`,
            [req.context.orgId, req.context.userId, { assignment_id: result.rows[0].id }]
        );
        res.status(201).json(mapAssignment(result.rows[0]));
    });

    app.get('/api/v1/interactions', async (req, res) => {
        const result = await pool.query(
            `SELECT i.*, s.responses AS survey_responses
             FROM interactions i
             LEFT JOIN survey_responses s ON s.interaction_id = i.id
             WHERE i.org_id = $1
             ORDER BY i.occurred_at DESC`,
            [req.context.orgId]
        );
        res.json(result.rows.map(mapInteraction));
    });

    app.post('/api/v1/interactions', async (req, res) => {
        const payload = req.body || {};
        if (!payload.client_interaction_uuid || !payload.voter_id || !payload.result_code || !payload.occurred_at) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await client.query(
                `SELECT i.*, s.responses AS survey_responses
                 FROM interactions i
                 LEFT JOIN survey_responses s ON s.interaction_id = i.id
                 WHERE i.org_id = $1 AND i.client_interaction_uuid = $2`,
                [req.context.orgId, payload.client_interaction_uuid]
            );
            if (existing.rows[0]) {
                await client.query('COMMIT');
                return res.json(mapInteraction(existing.rows[0]));
            }

            const result = await client.query(
                `INSERT INTO interactions (
                    org_id, user_id, voter_id, assignment_id, occurred_at, channel,
                    result_code, notes, client_interaction_uuid
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9
                ) RETURNING *`,
                [
                    req.context.orgId,
                    req.context.userId,
                    payload.voter_id,
                    payload.assignment_id || null,
                    payload.occurred_at,
                    payload.channel || 'canvass',
                    payload.result_code,
                    payload.notes || null,
                    payload.client_interaction_uuid
                ]
            );
            if (payload.survey_responses) {
                await client.query(
                    `INSERT INTO survey_responses (org_id, interaction_id, responses)
                     VALUES ($1, $2, $3)`,
                    [req.context.orgId, result.rows[0].id, payload.survey_responses]
                );
            }
            await client.query(
                `INSERT INTO platform_events (org_id, user_id, event_type, metadata)
                 VALUES ($1, $2, 'interaction.created', $3)`,
                [req.context.orgId, req.context.userId, { interaction_id: result.rows[0].id }]
            );
            await client.query('COMMIT');
            res.status(201).json(mapInteraction({ ...result.rows[0], survey_responses: payload.survey_responses }));
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    });

    app.post('/api/v1/interactions/bulk', async (req, res) => {
        const items = Array.isArray(req.body) ? req.body : [];
        if (items.length === 0) return res.status(400).json({ error: 'No interactions provided' });
        const inserted: string[] = [];
        for (const payload of items) {
            if (!payload.client_interaction_uuid || !payload.voter_id || !payload.result_code || !payload.occurred_at) {
                continue;
            }
            const result = await pool.query(
                `INSERT INTO interactions (
                    org_id, user_id, voter_id, assignment_id, occurred_at, channel,
                    result_code, notes, client_interaction_uuid
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9
                ) ON CONFLICT (org_id, client_interaction_uuid) DO NOTHING
                RETURNING id`,
                [
                    req.context.orgId,
                    req.context.userId,
                    payload.voter_id,
                    payload.assignment_id || null,
                    payload.occurred_at,
                    payload.channel || 'canvass',
                    payload.result_code,
                    payload.notes || null,
                    payload.client_interaction_uuid
                ]
            );
            if (result.rowCount > 0) {
                inserted.push(payload.client_interaction_uuid);
            }
        }
        await pool.query(
            `INSERT INTO audit_logs (action, actor_user_id, target_org_id, metadata)
             VALUES ('interactions.bulk', $1, $2, $3)`,
            [req.context.userId, req.context.orgId, { count: inserted.length }]
        );
        await pool.query(
            `INSERT INTO platform_events (org_id, user_id, event_type, metadata)
             VALUES ($1, $2, 'interactions.bulk', $3)`,
            [req.context.orgId, req.context.userId, { count: inserted.length }]
        );
        res.json({ inserted: inserted.length });
    });

    app.get('/api/v1/users', async (req, res) => {
        const role = req.query.role as string | undefined;
        const result = role
            ? await pool.query('SELECT * FROM users WHERE org_id = $1 AND role = $2 ORDER BY created_at DESC', [req.context.orgId, role])
            : await pool.query('SELECT * FROM users WHERE org_id = $1 ORDER BY created_at DESC', [req.context.orgId]);
        res.json(result.rows.map(mapUser));
    });

    app.post('/api/v1/users/invite', requireAdmin, async (req, res) => {
        const { name, email, phone } = req.body || {};
        if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
        const result = await pool.query(
            `INSERT INTO users (org_id, name, email, phone, role, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.context.orgId, name, email, phone || '', 'canvasser', 'password']
        );
        await pool.query(
            `INSERT INTO memberships (org_id, user_id, role)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [req.context.orgId, result.rows[0].id, result.rows[0].role]
        );
        await pool.query(
            `INSERT INTO audit_logs (action, actor_user_id, target_org_id, metadata)
             VALUES ('user.invite', $1, $2, $3)`,
            [req.context.userId, req.context.orgId, { user_id: result.rows[0].id }]
        );
        res.status(201).json(mapUser(result.rows[0]));
    });

    app.post('/api/v1/jobs/import-voters', async (req, res) => {
        const voters = Array.isArray(req.body) ? req.body : [];
        const job = await pool.query(
            `INSERT INTO import_jobs (org_id, user_id, type, status, metadata)
             VALUES ($1, $2, 'import_voters', 'pending', $3) RETURNING *`,
            [req.context.orgId, req.context.userId, { count: voters.length }]
        );
        await pool.query(
            `INSERT INTO audit_logs (action, actor_user_id, target_org_id, metadata)
             VALUES ('import.create', $1, $2, $3)`,
            [req.context.userId, req.context.orgId, { job_id: job.rows[0].id, count: voters.length }]
        );
        await importQueue.add('import_voters', {
            jobId: job.rows[0].id,
            orgId: req.context.orgId,
            userId: req.context.userId,
            voters
        });
        res.status(201).json(job.rows[0]);
    });

    app.post('/api/v1/imports/voters', upload.single('file'), async (req, res) => {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'File required' });
        const key = `imports/${req.context.orgId}/${Date.now()}-${file.originalname}`;
        await ensureBucket(s3Client, config.s3Bucket);
        await putObject(s3Client, config.s3Bucket, key, file.buffer);

        const job = await pool.query(
            `INSERT INTO import_jobs (org_id, user_id, type, status, file_key, metadata)
             VALUES ($1, $2, 'import_voters', 'pending', $3, $4) RETURNING *`,
            [req.context.orgId, req.context.userId, key, { filename: file.originalname }]
        );
        await pool.query(
            `INSERT INTO audit_logs (action, actor_user_id, target_org_id, metadata)
             VALUES ('import.create', $1, $2, $3)`,
            [req.context.userId, req.context.orgId, { job_id: job.rows[0].id, filename: file.originalname }]
        );
        await importQueue.add('import_voters', {
            jobId: job.rows[0].id,
            orgId: req.context.orgId,
            userId: req.context.userId,
            fileKey: key
        });
        res.status(201).json(job.rows[0]);
    });

    app.get('/api/v1/jobs/:id', async (req, res) => {
        const result = await pool.query(
            `SELECT * FROM import_jobs WHERE id = $1 AND org_id = $2`,
            [req.params.id, req.context.orgId]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Job not found' });
        res.json(result.rows[0]);
    });

    app.get('/api/v1/metrics/field/summary', requireAdmin, async (req, res) => {
        const voters = await pool.query('SELECT COUNT(*)::int AS count FROM voters WHERE org_id = $1', [req.context.orgId]);
        const interactions = await pool.query('SELECT COUNT(*)::int AS count FROM interactions WHERE org_id = $1', [req.context.orgId]);
        const contacted = await pool.query(
            `SELECT COUNT(*)::int AS count FROM interactions WHERE org_id = $1 AND result_code = 'contacted'`,
            [req.context.orgId]
        );
        const total = voters.rows[0].count || 0;
        const completion = total > 0 ? Number(((contacted.rows[0].count / total) * 100).toFixed(1)) : 0;
        res.json({
            total_voters: total,
            total_interactions: interactions.rows[0].count || 0,
            contacted_count: contacted.rows[0].count || 0,
            completion_percentage: completion
        });
    });

    app.get('/api/v1/internal/organizations', requireInternal, async (_req, res) => {
        const result = await pool.query('SELECT * FROM organizations ORDER BY created_at DESC');
        res.json(result.rows.map(mapOrg));
    });

    app.get("/health", (_req, res) => res.status(200).send("ok"));
app.get("/ready", async (_req, res) => {
  // Optional: do lightweight checks here if you want
  res.status(200).send("ready");
});

    app.get('/api/v1/internal/organizations/:id/health', requireInternal, async (req, res) => {
        const org = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
        if (!org.rows[0]) return res.status(404).json({ error: 'Org not found' });
        const userCount = await pool.query('SELECT COUNT(*)::int AS count FROM users WHERE org_id = $1', [req.params.id]);
        const voterCount = await pool.query('SELECT COUNT(*)::int AS count FROM voters WHERE org_id = $1', [req.params.id]);
        const activeJobs = await pool.query(
            `SELECT COUNT(*)::int AS count FROM import_jobs WHERE org_id = $1 AND status IN ('pending', 'processing')`,
            [req.params.id]
        );
        res.json({
            org_id: req.params.id,
            status: org.rows[0].status,
            last_activity_at: org.rows[0].last_activity_at,
            metrics: {
                user_count: userCount.rows[0].count,
                voter_count: voterCount.rows[0].count,
                active_jobs: activeJobs.rows[0].count
            }
        });
    });

    return app;
};
