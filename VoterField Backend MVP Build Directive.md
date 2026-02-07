# **Backend MVP Build Directive**

**Audience: Backend Engineering Team (New to Project)**

## **Purpose**

You are joining a project where the **frontend architecture and API contract are already defined and frozen**. Your role is **not** to redesign or reinterpret the system, but to **implement a real backend that satisfies the existing contract** and proves the platform works end-to-end with persistent data, tenant isolation, and async jobs.

This memo explains:

* What already exists  
* What assumptions you should make  
* What “Backend MVP” means  
* The exact build order and acceptance criteria

---

## **What Already Exists (You Should Treat This as Canon)**

Before writing backend code, you should review these files in the repo:

### **1\. `types.ts` — Canonical Domain Models**

* This file defines the authoritative domain entities (Voter, List, Assignment, Interaction, etc.).  
* It is considered **the source of truth**.  
* Backend schemas and responses must conform to these models.

### **2\. `IDataClient` (`data/client.ts`) — Frozen API Contract**

* This interface defines **every operation the frontend expects**.  
* Your backend must implement endpoints that satisfy this interface.  
* The frontend will not be rewritten to accommodate backend differences.

### **3\. `API_SPEC.md` — REST API Specification**

* This maps every `IDataClient` method to concrete HTTP endpoints.  
* It defines:  
  * Routes  
  * Request/response shapes  
  * Error behavior  
  * Authentication expectations  
  * Multi-tenant scoping rules  
  * Idempotency requirements

You should assume:

* The frontend currently runs against a mock implementation of this contract.  
* Your backend’s job is to replace that mock without breaking the UI.

---

## **Core Architectural Assumptions (Non-Negotiable)**

1. **Multi-tenant SaaS**  
   * Every campaign is an organization (tenant).  
   * Every relevant table and query must be scoped by `org_id`.  
   * Cross-tenant access must be impossible by construction.  
2. **Contract-first**  
   * You implement the contract; you do not redefine it.  
   * If something in the contract is unclear or insufficient, raise it early.  
3. **Async jobs are real**  
   * Imports and exports must run outside request/response cycles.  
   * Jobs must be persistent, retry-safe, and observable.  
4. **Idempotency is required**  
   * Bulk interaction submissions must not duplicate on retry.  
   * Client-generated UUIDs are part of the contract.  
5. **Observability is required**  
   * All requests and jobs must log `request_id`, `org_id`, and `user_id`.  
   * Audit logs and platform events must be written by the backend.

---

## **Backend MVP: What “Done” Means**

Backend MVP is complete when:

* The frontend can switch from `MockDataClient` to `RealDataClient`  
* No React components are modified  
* A real backend API responds over HTTP  
* Data persists in PostgreSQL  
* Async jobs run via a real queue \+ worker  
* A full campaign workflow runs end-to-end:  
  1. User logs in  
  2. Voters are imported (async job)  
  3. Lists are created and populated  
  4. Lists are assigned to canvassers  
  5. Canvasser loads assignment and voters  
  6. Canvasser submits interactions in bulk (idempotent)  
  7. Admin views basic field metrics

---

## **Non-Goals for Backend MVP**

Do **not** spend time on:

* UI changes or frontend features  
* Texting, phone, or email integrations  
* Advanced analytics or BI dashboards  
* Performance tuning beyond basic indexing  
* Row-Level Security (RLS) in Postgres (enforce tenancy in app code for MVP)  
* Internal admin UI (API endpoints only)

---

## **Required Local Development Environment**

You are expected to provide a local environment that runs with one command.

Minimum services:

* PostgreSQL  
* Redis (job queue)  
* S3-compatible storage (MinIO recommended)  
* Backend API service  
* Worker service

Preferred setup: `docker-compose`

Required endpoints:

* `/health` — process up  
* `/ready` — DB, queue, and storage reachable

---

## **Backend MVP Build Order (Follow This Exactly)**

### **Step 1: Repo Initialization & OpenAPI**

* Convert `API_SPEC.md` into OpenAPI 3.0.  
* Treat OpenAPI as the executable contract.  
* Add request/response validation where feasible.

Acceptance:

* OpenAPI file committed and referenced by backend.

---

### **Step 2: Auth \+ Tenancy “Handshake”**

Implement:

* Tables: `organizations`, `users`, `memberships`  
* Auth endpoints per spec:  
  * `POST /api/v1/auth/login`  
  * `GET /api/v1/me`  
* Middleware that resolves:  
  * `request_id`  
  * `user_id`  
  * `org_id`  
  * `role`

Acceptance:

* Tenant isolation enforced in code.  
* User in Org A cannot access Org B data (tests required).

---

### **Step 3: Voters (Read \+ Single Add)**

Implement:

* `voters` table with `unique(org_id, voter_id_external)`  
* Endpoints:  
  * `GET /voters` (paginated)  
  * `GET /voters/:id`  
  * `POST /voters`

Acceptance:

* Frontend “Voter Universe” works in REAL mode with no UI changes.

---

### **Step 4: Lists, Members, Assignments**

Implement:

* Tables: `lists`, `list_members`, `assignments`  
* Endpoints per spec:  
  * create list  
  * bulk add members  
  * assign list  
  * canvasser fetches assignments

Acceptance:

* Canvasser sees real assigned lists and voters.

---

### **Step 5: Interactions (Bulk, Idempotent)**

Implement:

* `interactions` table with `unique(org_id, client_interaction_uuid)`  
* `survey_responses` table  
* `POST /interactions/bulk`

Acceptance:

* Bulk submissions persist.  
* Retries do not duplicate.  
* Audit logs and platform events emitted.

---

### **Step 6: Imports as Async Jobs**

Implement:

* `import_jobs` table  
* File upload to S3/MinIO  
* Queue \+ worker  
* Louisiana-style voter file parsing (headers split on first comma)

Endpoints:

* `POST /imports/voters`  
* `GET /imports/:id`

Acceptance:

* Imports run asynchronously.  
* Frontend polling works in REAL mode.  
* Re-import updates voter fields without deleting interactions.

---

### **Step 7: Minimal Metrics**

Implement:

* `GET /metrics/field/summary`

Acceptance:

* Admin sees basic field completion stats from real data.

---

### **Step 8: Internal (Staff) Endpoints**

Implement:

* Staff auth concept (simple config-backed acceptable)  
* Endpoints:  
  * `GET /internal/organizations`  
  * `GET /internal/organizations/:id/health`

Acceptance:

* Inaccessible to campaign users.  
* Callable via Postman/curl for support use.

---

## **Testing Requirements (Minimum)**

You must include:

1. Tenant isolation tests  
2. Idempotency tests for interactions  
3. Async import job tests

---

## **Definition of Done (Backend MVP)**

Backend MVP is complete when:

* REAL mode runs end-to-end  
* Data persists in Postgres  
* Jobs run via queue \+ worker  
* Tenant isolation and idempotency tests pass  
* Logs include request\_id/org\_id/user\_id  
* Audit logs capture sensitive actions

---

## **Final Note**

You are implementing a backend **to an existing, frozen contract**.  
Your success is measured by how cleanly the frontend swaps from mock to real.

If anything in the contract is unclear or insufficient, surface it early.  
If something feels tempting but not required to complete the workflow, defer it.

Correctness \> speed at this stage.