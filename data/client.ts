import { Voter, WalkList, User, InteractionCreate, Interaction, Assignment, Organization, UserRole, Job, PlatformEvent, AuditLogEntry, JobStatus } from '../types';
import { mockVoters, mockUsers, mockWalkLists, mockAssignments, mockInteractions, mockOrg } from '../services/mockData';
import { RealDataClient } from './RealDataClient';

/**
 * API GATEWAY CONTRACT
 * 
 * The IDataClient interface defines the strict boundary between the UI and the Data Layer.
 * 
 * ⚠️ FROZEN CONTRACT RULES:
 * 1. The Frontend must ONLY access data via these methods.
 * 2. The Backend (or Mock) must implement these methods exactly as typed.
 * 3. All operations must explicitly handle context (Org, User, Request ID).
 * 4. All write operations must be idempotent where possible.
 */
export interface IDataClient {
    // --- Session & Identity ---
    /** Returns the currently authenticated user with context. Throws if no session. */
    getCurrentUser(): Promise<User>;
    /** Returns the current tenant organization. Throws if no org context. */
    getCurrentOrg(): Promise<Organization>;
    /** Development utility: simulates re-authenticating as a different role. */
    switchRole(role: UserRole): Promise<void>; 

    // --- Voter Management ---
    /** 
     * Retrieves voters for the current org. 
     * @param params - Optional search/filter parameters (e.g., { limit: 100, offset: 0 }) 
     */
    getVoters(params?: any): Promise<Voter[]>;
    
    /**
     * Queues an asynchronous job to import voters.
     * @returns A Job object to track progress.
     */
    importVoters(voters: Partial<Voter>[]): Promise<Job>; 

    /** 
     * Adds a single voter synchronously.
     * @param voter - Minimal voter details (name, address).
     */
    addVoter(voter: Partial<Voter>): Promise<Voter>;
    
    /** Updates specific fields on a voter record. Audit logged. */
    updateVoter(voterId: string, updates: Partial<Voter>): Promise<void>;

    // --- List Management ---
    /** Retrieves all walk lists for the current org. */
    getWalkLists(): Promise<WalkList[]>;
    
    /** 
     * Creates a new static walk list.
     * @param voterIds - Array of UUIDs for voters included in this list.
     */
    createWalkList(name: string, voterIds: string[]): Promise<WalkList>;

    // --- Field Operations (Assignments) ---
    /** Admin view: Get all assignments across the org. */
    getAssignments(): Promise<Assignment[]>; 
    
    /** Canvasser view: Get assignments for the current user only. */
    getMyAssignments(): Promise<Assignment[]>; 
    
    /** Assigns a specific list to a specific canvasser. */
    assignList(listId: string, canvasserId: string): Promise<Assignment>;

    // --- Interaction Logging ---
    /**
     * Records a canvas result.
     * Must be idempotent based on `client_interaction_uuid`.
     */
    logInteraction(interaction: InteractionCreate): Promise<Interaction>;
    
    /** Retrieves interaction history. */
    getInteractions(): Promise<Interaction[]>;
    
    // --- User Management ---
    /** Returns all users with 'canvasser' role in the current org. */
    getCanvassers(): Promise<User[]>;
    
    /** Invites a new canvasser to the org. */
    addCanvasser(user: Partial<User>): Promise<User>;

    // --- Platform Infrastructure ---
    /** Polling endpoint for Async Job status. */
    getJob(jobId: string): Promise<Job>;
}

export class MockDataClient implements IDataClient {
    private voters = [...mockVoters];
    private users = [...mockUsers];
    private lists = [...mockWalkLists];
    private assignments = [...mockAssignments];
    private interactions = [...mockInteractions];
    private currentOrg = mockOrg;
    
    // Platform Stores (Mock Database Tables)
    private jobs: Job[] = [];
    private events: PlatformEvent[] = [];
    private auditLog: AuditLogEntry[] = [];

    // Simulate session
    private currentUserId = 'user-admin'; 

    // --- Internal Platform Helpers ---

    private structuredLog(context: { requestId: string, orgId?: string, userId?: string }, message: string, data: any) {
        console.log(JSON.stringify({
            level: 'info',
            message,
            ...context,
            ...data,
            timestamp: new Date().toISOString()
        }));
    }

    private emitEvent(eventType: string, metadata: any = {}) {
        const event: PlatformEvent = {
            id: `evt-${Date.now()}-${Math.random()}`,
            event_type: eventType,
            occurred_at: new Date().toISOString(),
            org_id: this.currentOrg.id,
            user_id: this.currentUserId,
            metadata
        };
        this.events.push(event);
        // In a real app, this would push to an event bus
    }

    private logAudit(action: string, metadata: any = {}) {
        const entry: AuditLogEntry = {
            id: `audit-${Date.now()}-${Math.random()}`,
            action,
            actor_user_id: this.currentUserId,
            target_org_id: this.currentOrg.id,
            occurred_at: new Date().toISOString(),
            metadata
        };
        this.auditLog.push(entry);
    }

    private createJob(type: Job['type'], metadata: any = {}): Job {
        const job: Job = {
            id: `job-${Date.now()}`,
            org_id: this.currentOrg.id,
            user_id: this.currentUserId,
            type,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata
        };
        this.jobs.push(job);
        return job;
    }

    private updateJob(jobId: string, status: JobStatus, error?: string, result?: any) {
        const job = this.jobs.find(j => j.id === jobId);
        if (job) {
            job.status = status;
            job.updated_at = new Date().toISOString();
            if (error) job.error = error;
            if (result) job.result = result;
        }
    }

    // Wrapper to ensure every request has context
    private async executeWithContext<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        const requestId = crypto.randomUUID(); // Simulated Request ID
        const context = { requestId, orgId: this.currentOrg.id, userId: this.currentUserId };
        
        this.structuredLog(context, `Request Started: ${operation}`, {});
        const start = Date.now();

        try {
            const result = await fn();
            const duration = Date.now() - start;
            this.structuredLog(context, `Request Completed: ${operation}`, { duration, status: 'success' });
            return result;
        } catch (e: any) {
            const duration = Date.now() - start;
            this.structuredLog(context, `Request Failed: ${operation}`, { duration, status: 'error', error: e.message });
            throw e;
        }
    }

    // --- Public API Implementation ---

    async getCurrentUser(): Promise<User> {
        return this.executeWithContext('getCurrentUser', async () => {
            const user = this.users.find(u => u.id === this.currentUserId);
            if (!user) throw new Error("User not found");
            return user;
        });
    }

    async getCurrentOrg(): Promise<Organization> {
        return this.executeWithContext('getCurrentOrg', async () => this.currentOrg);
    }

    async switchRole(role: UserRole): Promise<void> {
        return this.executeWithContext('switchRole', async () => {
            if (role === 'canvasser') {
                this.currentUserId = 'user-1'; 
            } else {
                this.currentUserId = 'user-admin';
            }
            this.emitEvent('user.login', { role });
        });
    }

    async getVoters(): Promise<Voter[]> {
        return this.executeWithContext('getVoters', async () => {
             return this.voters.map(v => {
                const voterInteractions = this.interactions
                    .filter(i => i.voter_id === v.id)
                    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
                
                const latest = voterInteractions[0];
                return {
                    ...v,
                    lastInteractionStatus: latest ? latest.result_code : undefined,
                    lastInteractionTime: latest ? latest.occurred_at : undefined
                };
            });
        });
    }

    // Refactored to be an Async Job
    async importVoters(newVoters: Partial<Voter>[]): Promise<Job> {
        return this.executeWithContext('importVoters', async () => {
            // 1. Create Job synchronously
            const job = this.createJob('import_voters', { count: newVoters.length });
            this.logAudit('import.create', { jobId: job.id, count: newVoters.length });
            this.emitEvent('import.started', { jobId: job.id });

            // 2. Simulate Async Worker Process
            setTimeout(() => {
                try {
                    this.updateJob(job.id, 'processing');
                    
                    // Simulate processing delay
                    const imported: Voter[] = newVoters.map((v, i) => ({
                        id: `voter-new-${Date.now()}-${i}`,
                        orgId: this.currentOrg.id,
                        externalId: v.externalId || `ext-${Date.now()}-${i}`,
                        firstName: v.firstName || 'Unknown',
                        middleName: v.middleName,
                        lastName: v.lastName || 'Unknown',
                        suffix: v.suffix,
                        age: v.age,
                        gender: v.gender,
                        race: v.race,
                        phone: v.phone,
                        address: v.address || 'Unknown',
                        unit: v.unit,
                        city: v.city || 'Unknown',
                        state: v.state || 'LA',
                        zip: v.zip || '',
                        party: v.party || 'Unenrolled',
                        geom: v.geom || { lat: 0, lng: 0 }
                    }));
                    this.voters = [...this.voters, ...imported];

                    this.updateJob(job.id, 'completed', undefined, { imported_count: imported.length });
                    this.emitEvent('import.completed', { jobId: job.id, count: imported.length });
                    this.logAudit('import.success', { jobId: job.id });
                } catch (e: any) {
                    this.updateJob(job.id, 'failed', e.message);
                    this.emitEvent('import.failed', { jobId: job.id, error: e.message });
                }
            }, 3000); // 3 second processing time

            return job;
        });
    }

    async addVoter(voter: Partial<Voter>): Promise<Voter> {
        return this.executeWithContext('addVoter', async () => {
             const newVoter: Voter = {
                id: `voter-manual-${Date.now()}`,
                orgId: this.currentOrg.id,
                externalId: `MAN-${Date.now()}`,
                firstName: voter.firstName || 'Unknown',
                lastName: voter.lastName || 'Unknown',
                middleName: voter.middleName,
                suffix: voter.suffix,
                age: voter.age,
                gender: voter.gender,
                race: voter.race,
                phone: voter.phone,
                party: voter.party || 'Unenrolled',
                address: voter.address || 'Unknown',
                unit: voter.unit,
                city: voter.city || 'Unknown',
                state: voter.state || 'LA',
                zip: voter.zip || '',
                // Add some random jitter to location for demo purposes so they don't stack perfectly on 0,0
                geom: { lat: 40.7128 + (Math.random() * 0.01), lng: -74.0060 + (Math.random() * 0.01) }, 
                lastInteractionStatus: undefined,
                lastInteractionTime: undefined
             };
             
             this.voters.push(newVoter);
             this.logAudit('voter.create', { voterId: newVoter.id, name: `${newVoter.firstName} ${newVoter.lastName}` });
             return newVoter;
        });
    }
    
    async getJob(jobId: string): Promise<Job> {
        return this.executeWithContext('getJob', async () => {
            const job = this.jobs.find(j => j.id === jobId);
            if (!job) throw new Error("Job not found");
            return job;
        });
    }

    async updateVoter(voterId: string, updates: Partial<Voter>): Promise<void> {
        return this.executeWithContext('updateVoter', async () => {
            this.voters = this.voters.map(v => 
                v.id === voterId ? { ...v, ...updates } : v
            );
            this.logAudit('voter.update', { voterId, fields: Object.keys(updates) });
        });
    }

    async getWalkLists(): Promise<WalkList[]> {
        return this.executeWithContext('getWalkLists', async () => this.lists);
    }

    async createWalkList(name: string, voterIds: string[]): Promise<WalkList> {
        return this.executeWithContext('createWalkList', async () => {
            const list: WalkList = {
                id: `list-${Date.now()}`,
                orgId: this.currentOrg.id,
                name,
                voterIds,
                createdAt: new Date().toISOString(),
                createdByUserId: this.currentUserId
            };
            this.lists.push(list);
            this.emitEvent('list.created', { listId: list.id, count: voterIds.length });
            this.logAudit('list.create', { listId: list.id, name });
            return list;
        });
    }

    async getAssignments(): Promise<Assignment[]> {
        return this.executeWithContext('getAssignments', async () => this.assignments);
    }

    async getMyAssignments(): Promise<Assignment[]> {
        return this.executeWithContext('getMyAssignments', async () => 
            this.assignments.filter(a => a.canvasserId === this.currentUserId)
        );
    }

    async assignList(listId: string, canvasserId: string): Promise<Assignment> {
        return this.executeWithContext('assignList', async () => {
            const assignment: Assignment = {
                id: `assign-${Date.now()}`,
                orgId: this.currentOrg.id,
                listId,
                canvasserId,
                status: 'assigned',
                createdAt: new Date().toISOString()
            };
            this.assignments.push(assignment);
            this.emitEvent('assignment.created', { assignmentId: assignment.id, listId, canvasserId });
            return assignment;
        });
    }

    async logInteraction(payload: InteractionCreate): Promise<Interaction> {
        return this.executeWithContext('logInteraction', async () => {
            const existing = this.interactions.find(i => i.client_interaction_uuid === payload.client_interaction_uuid);
            if (existing) return existing;

            const interaction: Interaction = {
                ...payload,
                id: `int-${Date.now()}`,
                user_id: this.currentUserId,
                org_id: this.currentOrg.id
            };
            this.interactions.push(interaction);
            this.emitEvent('interactions.created', { interactionId: interaction.id, resultCode: payload.result_code });
            return interaction;
        });
    }

    async getInteractions(): Promise<Interaction[]> {
        return this.executeWithContext('getInteractions', async () => this.interactions);
    }

    async getCanvassers(): Promise<User[]> {
        return this.executeWithContext('getCanvassers', async () => this.users.filter(u => u.role === 'canvasser'));
    }

    async addCanvasser(user: Partial<User>): Promise<User> {
        return this.executeWithContext('addCanvasser', async () => {
            const newUser: User = {
                id: `user-${Date.now()}`,
                orgId: this.currentOrg.id,
                name: user.name || 'Unknown',
                email: user.email || '',
                phone: user.phone || '',
                role: 'canvasser'
            };
            this.users.push(newUser);
            this.logAudit('user.invite', { newUserId: newUser.id, role: 'canvasser' });
            return newUser;
        });
    }
}

// Environment Variable Switch
// In Vite, env vars are accessed via import.meta.env.VITE_*
// We default to MOCK if the variable is not explicitly set to 'true'
const useRealApi = (import.meta as any).env?.VITE_USE_REAL_API === 'true';

// Singleton for the app
export const client = useRealApi ? new RealDataClient() : new MockDataClient();