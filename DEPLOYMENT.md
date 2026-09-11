# Deploy Nexus SM (GitHub + Neon/Supabase + Render / Vercel)

This app is a **custom Node server** (`server.ts`): Next.js + Socket.io live chat + an in-process SLA worker. A free subdomain is enough for HTTPS, but the **host must be a long-running Node process**.

| Host | Free subdomain | Full app (chat + SLA)? |
| --- | --- | --- |
| **Render** (recommended) | `https://<service>.onrender.com` | Yes — start command runs `server.ts` |
| **Vercel** | `https://<project>.vercel.app` | **No** — serverless cannot run `server.ts` |
| Docker on a VPS | Your own domain | Yes — see Option C below |

Use **Render + Neon** (or Supabase) for a working free/low-cost public demo. Use Vercel only if you accept that realtime chat and automatic SLA follow-ups will not run.

This project does **not** use NextAuth. `NEXTAUTH_SECRET` is accepted only as an alias for the JWT cookie secret.

---

## 1. Git & GitHub

`.gitignore` already excludes `.env`, `.env.local`, `.env.production`, `node_modules`, and `.next`. Example env files (`.env.example`, `.env.production.example`) are allowed.

### Install Git (Windows)

If `git` is not recognized in PowerShell, install [Git for Windows](https://git-scm.com/download/win), then open a **new** terminal.

### Create a GitHub repo and push

Replace `YOUR_GITHUB_USER` and `YOUR_REPO` (for example `nexus-sm`).

**PowerShell** (this machine):

```powershell
cd D:\ticket
git init -b main
git add .
git status
git commit -m "Initial commit: Nexus SM ITSM application"
gh repo create YOUR_REPO --private --source=. --remote=origin --push
```

If you do not have the GitHub CLI (`gh`), create an empty repository at github.com (do not add a README), then:

```powershell
cd D:\ticket
git init -b main
git add .
git commit -m "Initial commit: Nexus SM ITSM application"
git remote add origin https://github.com/YOUR_GITHUB_USER/YOUR_REPO.git
git push -u origin main
```

**Git Bash / macOS / Linux:**

```bash
cd /path/to/ticket
git init -b main
git add .
git commit -m "Initial commit: Nexus SM ITSM application"
git remote add origin https://github.com/YOUR_GITHUB_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Never commit `.env` or `.env.local`. Confirm with `git status` that they are untracked.

---

## 2. Production PostgreSQL (Neon or Supabase)

You need two URLs on Neon/Supabase:

- **`DATABASE_URL`** — pooled connection (app runtime)
- **`DIRECT_URL`** — direct / non-pooled connection (Prisma migrations)

On a single local Postgres instance, set both to the same URL.

### Neon

1. Sign in at [neon.tech](https://neon.tech) and create a project (free tier).
2. Open **Dashboard → Connection details**.
3. Copy the **pooled** connection string (host contains `-pooler`) into `DATABASE_URL`.
4. Copy the **direct** connection string (no `-pooler`) into `DIRECT_URL`.
5. Keep `?sslmode=require` on both.

Example shape (not a real secret):

```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database**.
3. **Connection string → URI**.
4. Use the **Transaction** / pooled URI as `DATABASE_URL` (port `6543`, often with `pgbouncer=true`).
5. Use the **Direct** / Session URI as `DIRECT_URL` (port `5432`).

Replace `[YOUR-PASSWORD]` with the database password.

### Apply Prisma migrations (required)

This repo already has migrations under `prisma/migrations`. Use **`migrate deploy`** against the cloud database. Do **not** use `prisma migrate dev` in production.

**PowerShell:**

```powershell
cd D:\ticket
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
$env:DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
npx prisma migrate deploy
```

**Git Bash / macOS / Linux:**

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
export DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
npx prisma migrate deploy
```

Render can run the same command on every boot via `npm run start:migrate`.

`npx prisma db push` skips the migration history. Use it only for a throwaway prototype. Prefer `migrate deploy` for this app.

Production does **not** auto-seed. After the first deploy, create an admin (or run a one-off seed from the host shell):

```bash
npx prisma db seed
```

Seeded demo passwords are for local development only. Change them immediately if you seed a public instance.

---

## 3. Environment variables

Set these in the Render or Vercel dashboard (Production). Values from `.env.local` are not uploaded.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Cloud Postgres (pooled) connection string |
| `DIRECT_URL` | Yes | Direct Postgres URL for `prisma migrate deploy` |
| `AUTH_SECRET` | Yes* | Signs the `nexus_session` JWT cookie |
| `JWT_SECRET` | Alias | Used only if `AUTH_SECRET` is unset |
| `NEXTAUTH_SECRET` | Alias | Used only if `AUTH_SECRET` and `JWT_SECRET` are unset. This is **not** NextAuth. |
| `APP_URL` | Yes | Public origin, e.g. `https://nexus-sm.onrender.com` |
| `TWO_FACTOR_ENCRYPTION_KEY` | Recommended | Encrypts TOTP secrets. Falls back to the auth secret if omitted |
| `TWO_FACTOR_ISSUER` | Optional | Authenticator app label (default `Nexus SM`) |
| `HOST` | Render: yes | Bind address. Use `0.0.0.0` on Render |
| `PORT` | No | Render sets this automatically. Do not override it on Render |
| `NODE_ENV` | Yes | `production` |

\* Set **one** of `AUTH_SECRET`, `JWT_SECRET`, or `NEXTAUTH_SECRET`. Prefer `AUTH_SECRET`.

Generate secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run twice: once for `AUTH_SECRET`, once for `TWO_FACTOR_ENCRYPTION_KEY`.

---

## 4. Deploy on Render (recommended — free subdomain)

1. Push the repo to GitHub (section 1).
2. Create the Neon or Supabase database and apply migrations (section 2), or let Render run `migrate deploy` on start.
3. Go to [render.com](https://render.com) → **New → Blueprint** and connect the GitHub repo (`render.yaml`), **or** **New → Web Service** and select the repo.
4. Settings if you create the service manually:
   - **Runtime:** Node
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `npm run start:migrate`
   - **Instance:** Free / Starter (free web services spin down when idle; the first request after idle can take ~50s)
5. Add the environment variables from the table above. Set `APP_URL` to the `onrender.com` URL Render shows (or your custom domain).
6. Deploy. Open `https://<service>.onrender.com/login`.

Render injects `PORT`. Keep `HOST=0.0.0.0`.

---

## 5. Deploy on Vercel (UI only — chat and SLA will not run)

Vercel runs `next build` as serverless functions. It **does not** start `server.ts`, so Socket.io and the SLA cron never run.

If you still want the HTTP UI on a `*.vercel.app` subdomain:

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Framework: Next.js. Build command: `npm run build` (already in `vercel.json`).
3. Add every required env var **before** the first production build (`DATABASE_URL` and `DIRECT_URL` are needed so Prisma can generate the client).
4. Set `APP_URL` to `https://<project>.vercel.app`.
5. Deploy. Run `npx prisma migrate deploy` locally against Neon/Supabase if the Vercel build does not apply migrations.

To restore live chat and SLA while keeping the Vercel UI, run `server.ts` on Render (or another always-on Node host) and point Socket.io at that origin — that is extra work, not enabled by default.

---

## 6. Local build check

From the project root, with `.env` pointing at a reachable Postgres:

```powershell
cd D:\ticket
npm run lint
npm run build
```

`npm run build` runs `prisma generate` then `next build` (TypeScript). `npm run lint` is ESLint with `--max-warnings 0`.

---

## Option C — VPS with Docker and Nginx

Copy `.env.production.example` to `.env.production` and fill every value. Point DNS at the VPS, issue certificates, then:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

See the previous Docker notes in git history if you need Certbot copy steps. Uploads persist in the `uploads_prod` volume. Postgres is not published to the internet.

---

## After go-live

1. Sign in over HTTPS.
2. Open **Account** and enable 2FA. Store backup codes.
3. If you used the demo seed, change every password immediately.
4. Confirm tickets load. On Render, confirm live chat and follow-ups. On Vercel, expect chat to stay polling-less / disconnected.
5. Never commit `.env`, `.env.local`, or `.env.production`.
