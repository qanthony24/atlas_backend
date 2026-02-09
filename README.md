## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend MVP (Local)

This repo now includes a full backend implementation under `backend/`.

### One-command environment (recommended)

```
docker compose up --build
```

This starts:
- PostgreSQL
- Redis (queue)
- MinIO (S3-compatible storage)
- Backend API (`http://localhost:3000`)
- Worker (import jobs)

### Local scripts (without Docker)

1. Start Postgres + Redis + MinIO manually
2. Run schema:
   - `backend/schema.sql`
3. Start API:
   - `npm run backend:start`
4. Start worker:
   - `npm run worker:start`

### Default dev users

- `admin@example.com` / `password`
- `bob@example.com` / `password`
