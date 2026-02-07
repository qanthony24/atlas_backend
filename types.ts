
/**
 * CORE DOMAIN CONTRACT
 * 
 * This file defines the canonical data models for the VoterField platform.
 * These types represent the shared understanding between the Frontend and Backend.
 * 
 * ⚠️ FROZEN CONTRACT RULES:
 * 1. Modifying these types requires a database migration plan.
 * 2. Field removals must be backward-compatible (deprecate first).
 * 3. Enums (like UserRole, InteractionResultCode) are strict constraints.
 * 4. All IDs are UUID strings unless otherwise specified.
 */

export type UserRole = 'admin' | 'canvasser';

export interface Organization {
    id: string;
    name: string;
    // SaaS Scaffolding
    status: 'active' | 'suspended' | 'pending_delete';
    plan_id: string; // e.g. 'starter', 'growth', 'enterprise'
    limits: Record<string, number>; // e.g. { max_users: 5 }
    last_activity_at: string;
}

export interface User {
    id: string; // UUID
    orgId: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    location?: { lat: number; lng: number };
}

export interface Voter {
    id: string; // UUID
    orgId: string;
    externalId: string; // e.g., REG_NUMBER
    
    // Demographics
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    age?: number;
    gender?: string;
    race?: string;
    party?: string;
    
    // Contact
    phone?: string;
    
    // Address
    address: string; // Street 1 / Primary Address Line
    unit?: string;   // Apt, Suite, etc.
    city: string;
    state?: string;
    zip: string;
    geom: { lat: number; lng: number };
    
    // Derived state
    lastInteractionStatus?: string; 
    lastInteractionTime?: string;
}

export interface WalkList {
    id: string; // UUID
    orgId: string;
    name: string;
    voterIds: string[];
    createdAt: string;
    createdByUserId: string;
}

export interface Assignment {
    id: string; // UUID
    orgId: string;
    listId: string;
    canvasserId: string;
    status: 'assigned' | 'in_progress' | 'completed';
    createdAt: string;
}

// The canonical event payload for the Field app
export interface InteractionCreate {
    client_interaction_uuid: string; // Idempotency key
    org_id: string; 
    voter_id: string;
    assignment_id?: string;
    occurred_at: string;
    channel: 'canvass';
    result_code: InteractionResultCode;
    notes?: string;
    survey_responses?: Record<string, any>;
}

export interface Interaction extends InteractionCreate {
    id: string; // Server ID
    user_id: string; // Who logged it
}

export type InteractionResultCode = 'contacted' | 'not_home' | 'refused' | 'moved' | 'inaccessible' | 'deceased';

export type MappedHeaders = { [key: string]: keyof Voter | '' };

// --- Platform Foundations ---

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
    id: string;
    org_id: string;
    user_id: string;
    type: 'import_voters' | 'export_data';
    status: JobStatus;
    created_at: string;
    updated_at: string;
    result?: any;
    error?: string;
    metadata?: any;
}

export interface PlatformEvent {
    id: string;
    event_type: string; // e.g. 'user.login', 'import.completed'
    occurred_at: string;
    org_id: string;
    user_id?: string;
    metadata?: any;
}

export interface AuditLogEntry {
    id: string;
    action: string;
    actor_user_id: string;
    target_org_id: string;
    occurred_at: string;
    metadata?: any;
}
