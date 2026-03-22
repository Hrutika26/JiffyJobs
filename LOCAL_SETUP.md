# Local setup (quick start)

Follow these steps **in order**. You only need **Docker** for Postgres (or install PostgreSQL yourself and set `DATABASE_URL`).

## 1. Start PostgreSQL

```bash
# From repo root — start Docker Desktop first if you see "Cannot connect to the Docker daemon"
docker compose up -d
```

Default DB (matches `docker-compose.yml`):

- User: `jiffyjobs_user`
- Password: `jiffyjobs_password`
- Database: `jiffyjobs_dev`
- Port: `5432`

## 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env if needed — DATABASE_URL should match Docker Postgres above
npm install
npm run prisma:generate
npx dotenv -e .env -- prisma migrate deploy
npm run dev
```

**First-time or “drift” errors:** If Prisma says the database is out of sync with migrations, reset the **dev** DB (deletes all data):

```bash
npx dotenv -e .env -- prisma migrate reset
```

**Optional keys (not required to boot the API locally):**

- `RESEND_API_KEY` — leave empty; verification/password emails are skipped (URLs are logged in dev).
- `STRIPE_*` — leave empty; the server starts; payment endpoints fail until you add Stripe test keys.

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**. The app expects the API at **http://localhost:5001/api** (see `VITE_API_URL`).

## 4. Health check

With the backend running:

```bash
curl http://localhost:5001/api/health
```

You should see `{"status":"OK",...}`.

## Common issues

| Problem | Fix |
|--------|-----|
| Docker daemon not running | Open **Docker Desktop**, wait until it’s ready, then `docker compose up -d` again. |
| Port 5432 in use | Stop other Postgres or change the host port in `docker-compose.yml` and `DATABASE_URL`. |
| Prisma drift / migration errors | `npx dotenv -e .env -- prisma migrate reset` (dev only; wipes data). |
| CORS errors | Set `FRONTEND_URL=http://localhost:5173` in `backend/.env`. |
