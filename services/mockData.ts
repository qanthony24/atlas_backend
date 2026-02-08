
import { Voter, User, WalkList, Assignment, Interaction, Organization } from '../types';

export const mockOrg: Organization = {
    id: 'org-123',
    name: 'Citizens for Progress',
    status: 'active',
    plan_id: 'standard_tier',
    limits: {
        max_users: 10,
        max_voters: 50000
    },
    last_activity_at: new Date().toISOString()
};

export const mockUsers: User[] = [
    { id: 'user-1', orgId: 'org-123', name: 'Alice Johnson', email: 'alice@campaign.org', phone: '555-0101', role: 'canvasser', location: { lat: 40.7142, lng: -74.0065 } },
    { id: 'user-2', orgId: 'org-123', name: 'Bob Williams', email: 'bob@campaign.org', phone: '555-0102', role: 'canvasser', location: { lat: 40.7585, lng: -73.9860 } },
    { id: 'user-admin', orgId: 'org-123', name: 'Campaign Admin', email: 'admin@campaign.org', phone: '555-9999', role: 'admin' },
];

export const mockVoters: Voter[] = [
    { 
        id: 'voter-1', orgId: 'org-123', externalId: 'LA-001', 
        firstName: 'John', lastName: 'Doe', age: 45, gender: 'M', race: 'White', phone: '555-1234',
        address: '123 Main St', city: 'Springfield', state: 'LA', zip: '12345', 
        party: 'Democrat', geom: { lat: 40.7128, lng: -74.0060 } 
    },
    { 
        id: 'voter-2', orgId: 'org-123', externalId: 'LA-002', 
        firstName: 'Jane', lastName: 'Smith', age: 32, gender: 'F', race: 'Black',
        address: '456 Oak Ave', unit: 'Apt 4B', city: 'Springfield', state: 'LA', zip: '12345', 
        party: 'Republican', geom: { lat: 40.7138, lng: -74.0070 } 
    },
    { 
        id: 'voter-3', orgId: 'org-123', externalId: 'LA-003', 
        firstName: 'Sam', lastName: 'Wilson', age: 29, gender: 'NB', race: 'Other',
        address: '789 Pine Ln', city: 'Springfield', state: 'LA', zip: '12345', 
        party: 'Independent', geom: { lat: 40.7148, lng: -74.0080 } 
    },
    { 
        id: 'voter-4', orgId: 'org-123', externalId: 'LA-004', 
        firstName: 'Lisa', lastName: 'Ray', age: 67, gender: 'F', race: 'White', phone: '555-9876',
        address: '101 Maple Dr', city: 'Shelbyville', state: 'LA', zip: '54321', 
        party: 'Democrat', geom: { lat: 40.7580, lng: -73.9855 } 
    },
    { 
        id: 'voter-5', orgId: 'org-123', externalId: 'LA-005', 
        firstName: 'Tom', lastName: 'Allen', age: 55, gender: 'M', race: 'Black',
        address: '212 Birch Rd', city: 'Shelbyville', state: 'LA', zip: '54321', 
        party: 'Democrat', geom: { lat: 40.7590, lng: -73.9865 }, lastInteractionStatus: 'contacted' 
    },
];

export const mockWalkLists: WalkList[] = [
    { id: 'list-1', orgId: 'org-123', name: 'Springfield Downtown', createdByUserId: 'user-admin', createdAt: '2023-10-26', voterIds: ['voter-1', 'voter-2', 'voter-3'] },
    { id: 'list-2', orgId: 'org-123', name: 'Shelbyville North', createdByUserId: 'user-admin', createdAt: '2023-10-25', voterIds: ['voter-4', 'voter-5'] },
];

export const mockAssignments: Assignment[] = [
    { id: 'assign-1', orgId: 'org-123', listId: 'list-1', canvasserId: 'user-1', status: 'assigned', createdAt: '2023-10-27' },
    { id: 'assign-2', orgId: 'org-123', listId: 'list-2', canvasserId: 'user-2', status: 'in_progress', createdAt: '2023-10-27' },
];

export const mockInteractions: Interaction[] = [
    { 
        id: 'int-1', 
        client_interaction_uuid: 'uuid-1',
        org_id: 'org-123',
        voter_id: 'voter-5',
        user_id: 'user-2',
        assignment_id: 'assign-2',
        occurred_at: '2023-10-26T14:30:00Z',
        channel: 'canvass',
        result_code: 'contacted',
        notes: 'Very enthusiastic supporter.',
        survey_responses: { support_level: 5, yard_sign: true }
    }
];
