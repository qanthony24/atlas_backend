
import { IDataClient } from './client';
import { 
    User, Organization, UserRole, Voter, WalkList, 
    Assignment, InteractionCreate, Interaction, Job 
} from '../types';

/**
 * PRODUCTION API CLIENT
 * 
 * This implementation connects to the real backend defined in API_SPEC.md.
 * It enforces the IDataClient contract strictly.
 */
export class RealDataClient implements IDataClient {
    private baseUrl = '/api/v1';

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: this.getHeaders(),
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized (redirect to login in a real app)
                throw new Error("Unauthorized");
            }
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // Handle empty responses (like 204 No Content)
        const text = await response.text();
        return text ? JSON.parse(text) : undefined;
    }

    // --- Session & Identity ---

    async getCurrentUser(): Promise<User> {
        return this.request<User>('GET', '/me');
    }

    async getCurrentOrg(): Promise<Organization> {
        return this.request<Organization>('GET', '/org');
    }

    async switchRole(role: UserRole): Promise<void> {
        // In a real JWT stateless setup, switching roles usually involves 
        // requesting a new token with different claims or hitting a context switch endpoint.
        // For Phase 2, we assume the backend handles the context switch via this endpoint
        // and sets a new cookie or returns a new token.
        await this.request<void>('POST', '/auth/switch-role', { role });
    }

    // --- Voter Management ---

    async getVoters(params?: any): Promise<Voter[]> {
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request<Voter[]>('GET', `/voters${queryString}`);
    }

    async importVoters(voters: Partial<Voter>[]): Promise<Job> {
        return this.request<Job>('POST', '/jobs/import-voters', voters);
    }

    async addVoter(voter: Partial<Voter>): Promise<Voter> {
        return this.request<Voter>('POST', '/voters', voter);
    }

    async updateVoter(voterId: string, updates: Partial<Voter>): Promise<void> {
        await this.request<void>('PATCH', `/voters/${voterId}`, updates);
    }

    // --- List Management ---

    async getWalkLists(): Promise<WalkList[]> {
        return this.request<WalkList[]>('GET', '/lists');
    }

    async createWalkList(name: string, voterIds: string[]): Promise<WalkList> {
        return this.request<WalkList>('POST', '/lists', { name, voter_ids: voterIds });
    }

    // --- Field Operations (Assignments) ---

    async getAssignments(): Promise<Assignment[]> {
        // Default to 'org' scope for Admin view matching IDataClient expectation
        return this.request<Assignment[]>('GET', '/assignments?scope=org');
    }

    async getMyAssignments(): Promise<Assignment[]> {
        return this.request<Assignment[]>('GET', '/assignments?scope=me');
    }

    async assignList(listId: string, canvasserId: string): Promise<Assignment> {
        return this.request<Assignment>('POST', '/assignments', { 
            list_id: listId, 
            canvasser_id: canvasserId 
        });
    }

    // --- Interaction Logging ---

    async logInteraction(interaction: InteractionCreate): Promise<Interaction> {
        return this.request<Interaction>('POST', '/interactions', interaction);
    }

    async getInteractions(): Promise<Interaction[]> {
        return this.request<Interaction[]>('GET', '/interactions');
    }

    // --- User Management ---

    async getCanvassers(): Promise<User[]> {
        return this.request<User[]>('GET', '/users?role=canvasser');
    }

    async addCanvasser(user: Partial<User>): Promise<User> {
        return this.request<User>('POST', '/users/invite', user);
    }

    // --- Platform Infrastructure ---

    async getJob(jobId: string): Promise<Job> {
        return this.request<Job>('GET', `/jobs/${jobId}`);
    }
}
