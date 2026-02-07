
# VoterField Phase 2: Real API Contract

**Version:** 1.0.0
**Status:** Frozen
**Base URL:** `/api/v1`

## 1. Core Principles

1.  **Strict Multi-Tenancy**: The `org_id` is derived strictly from the Authentication Token. It is never passed as a URL parameter or body field for security, except in `/internal` endpoints.
2.  **Idempotency**: All `POST` requests related to transactional data (Interactions) require a client-generated UUID `idempotency_key` (mapped to `client_interaction_uuid`).
3.  **JSON Standard**: All requests and responses use `application/json`.
4.  **Dates**: All timestamps are ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ssZ`).

---

## 2. Authentication & Context

**Headers Required:**
`Authorization: Bearer <jwt_token>`

**Token Payload Claims:**
```json
{
  "sub": "user_uuid",
  "org_id": "org_uuid",
  "role": "admin" | "canvasser"
}
```

**Error Responses:**
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Valid token but insufficient permissions for the resource.
*   `429 Too Many Requests`: Rate limit exceeded.

---

## 3. Public Endpoints (Client Facing)

### A. Identity & Session

**GET /me**
Returns current user context.
*   **Maps to**: `client.getCurrentUser()`
*   **Response**: `User` object

**GET /org**
Returns current organization details.
*   **Maps to**: `client.getCurrentOrg()`
*   **Response**: `Organization` object

---

### B. Voter Management

**GET /voters**
Retrieves paginated list of voters.
*   **Maps to**: `client.getVoters(params)`
*   **Query Params**:
    *   `limit`: integer (default 100)
    *   `offset`: integer (default 0)
    *   `search`: string (optional, name/address match)
*   **Response**: `Voter[]`

**POST /voters**
Creates a single voter synchronously.
*   **Maps to**: `client.addVoter(voter)`
*   **Body**: `Partial<Voter>` (Required: firstName, lastName, address)
*   **Response**: `Voter`

**PATCH /voters/{id}**
Updates a voter record.
*   **Maps to**: `client.updateVoter(id, updates)`
*   **Body**: `Partial<Voter>`
*   **Response**: `200 OK`

---

### C. Jobs (Async Operations)

**POST /jobs/import-voters**
Initiates bulk voter import.
*   **Maps to**: `client.importVoters(voters)`
*   **Body**: `Array<Partial<Voter>>`
*   **Response**: `Job` object (Status: 'pending')

**GET /jobs/{id}**
Polls job status.
*   **Maps to**: `client.getJob(id)`
*   **Response**: `Job` object
    *   If `status` == 'completed', `result` contains summary stats.
    *   If `status` == 'failed', `error` contains message.

---

### D. Turf & Lists

**GET /lists**
Get all walk lists.
*   **Maps to**: `client.getWalkLists()`
*   **Response**: `WalkList[]`

**POST /lists**
Create a new static walk list.
*   **Maps to**: `client.createWalkList(name, voterIds)`
*   **Body**:
    ```json
    {
      "name": "Downtown Turf 1",
      "voter_ids": ["uuid-1", "uuid-2"]
    }
    ```
*   **Response**: `WalkList`

---

### E. Assignments

**GET /assignments**
Get assignments. Behavior varies by role.
*   **Maps to**: `client.getAssignments()` (Admin) / `client.getMyAssignments()` (Canvasser)
*   **Query Params**:
    *   `scope`: 'me' | 'org' (Default 'me' for canvassers, 'org' for admins)
*   **Response**: `Assignment[]`

**POST /assignments**
Assign a list to a user.
*   **Maps to**: `client.assignList(listId, canvasserId)`
*   **Body**:
    ```json
    {
      "list_id": "uuid",
      "canvasser_id": "uuid"
    }
    ```
*   **Response**: `Assignment`

---

### F. Interactions

**GET /interactions**
Get history of interactions.
*   **Maps to**: `client.getInteractions()`
*   **Response**: `Interaction[]`

**POST /interactions**
Log a canvass result.
*   **Maps to**: `client.logInteraction(interaction)`
*   **Body**: `InteractionCreate` schema
    *   `client_interaction_uuid` is MANDATORY for idempotency.
*   **Response**: `Interaction`

---

### G. User Management

**GET /users**
Get users in the org.
*   **Maps to**: `client.getCanvassers()`
*   **Query Params**: `role=canvasser`
*   **Response**: `User[]`

**POST /users/invite**
Invite a new user.
*   **Maps to**: `client.addCanvasser(user)`
*   **Body**:
    ```json
    {
      "name": "Alice",
      "email": "alice@example.com",
      "role": "canvasser"
    }
    ```
*   **Response**: `User`

---

## 4. Internal Endpoints (Staff Only)

**Base URL:** `/internal`
**Auth:** Requires Super Admin Token (separate from Org tokens).

**GET /organizations**
List all tenants.

**GET /organizations/{id}/health**
System health check for a specific tenant.
*   **Response**:
    ```json
    {
      "org_id": "uuid",
      "status": "active",
      "last_activity_at": "ISO_DATE",
      "metrics": {
        "user_count": 12,
        "voter_count": 5000,
        "active_jobs": 0
      }
    }
    ```
