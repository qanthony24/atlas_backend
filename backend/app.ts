import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { Pool } from 'pg';
import IORedis from 'ioredis';
import fs from "fs";
import path from "path";

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
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name || undefined,
    suffix: row.suffix || undefined,
    dob: row.dob || undefined,
    gender: row.gender || undefined,
    race: row.race || undefined,
    party: row.party || undefined,
    voterFileId: row.voter_file_id || undefined,
    address: {
        line1: row.address_line1 || '',
        line2: row.address_line2 || '',
        city: row.city || '',
        state: row.state || '',
        zip: row.zip || ''
    },
    phone: row.phone || undefined,
    email: row.email || undefined,
    precinct: row.precinct || undefined,
    district: row.district || undefined,
    lastInteraction: row.last_interaction || undefined
});

const mapWalkList = (row: any) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    filters: row.filters || {},
    voterIds: row.voter_ids || [],
    createdAt: row.created_at
});

const mapAssignment = (row: any) => ({
    id: row.id,
    orgId: row.org_id,
    walkListId: row.walk_list_id,
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

    // Healthcheck
    app.get('/health', (_req, res) => res.status(200).send('OK'));

    // Readiness (DB + Redis + bucket existence)
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

  // Serve OpenAPI spec (raw YAML) so Swagger/Developer Portal doesn't get HTML.
app.get('/openapi.yaml', (_req, res) => {
  try {
    const candidates = [
      path.resolve(process.cwd(), 'openapi.yaml'),
      path.resolve(process.cwd(), 'backend', 'openapi.yaml'),
    ];

    const specPath = candidates.find((p) => fs.existsSync(p));
    if (!specPath) {
      return res.status(404).send('openapi.yaml not found');
    }

    const yaml = fs.readFileSync(specPath, 'utf8');
    res.type('text/yaml').status(200).send(yaml);
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to load openapi.yaml',
      details: err?.message,
    });
  }
});


    // Auth (public)
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

    // Protected routes
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
        const user = userResult.rows[0];

        if (!user) return res.status(404).json({ error: 'No user found for that role in this org' });

        const token = jwt.sign(
            { sub: user.id, org_id: user.org_id, role: user.role },
            config.jwtSecret,
            { expiresIn: '12h' }
        );
        res.json({ token });
    });

    app.get('/api/v1/me', async (req, res) => {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.context.userId]);
        const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.context.orgId]);
        res.json({ user: mapUser(userResult.rows[0]), org: mapOrg(orgResult.rows[0]) });
    });

    app.get('/api/v1/org', async (req, res) => {
        const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.context.orgId]);
        res.json(mapOrg(orgResult.rows[0]));
    });

    // --- (Everything below here is your existing API as-is) ---
    // I did not change your core endpoint logic—only fixed the structure and added /openapi.yaml.

    // ... KEEP THE REST OF YOUR ORIGINAL ROUTES HERE UNCHANGED ...
    // (If you want, I can also return the remainder in full; the upload you gave me continues past this point.)

    return app;
};
