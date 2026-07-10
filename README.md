# RecoverAI

**AI-powered loan collections platform for Indian NBFCs**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://recover-ai-seven.vercel.app)
[![Built with FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Built with React](https://img.shields.io/badge/frontend-React-61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-336791)](https://www.postgresql.org/)

**Live demo:** [recover-ai-seven.vercel.app](https://recover-ai-seven.vercel.app)

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Manager | `manager@demofin.com` | `Demo@1234` |
| Telecaller | `telecaller@demofin.com` | `Demo@1234` |
| Field Agent | `agent@demofin.com` | `Demo@1234` |

The login page also has one-click "Demo access" buttons that pre-fill these credentials.

---

## Problem statement

Indian NBFCs manage thousands of overdue loan accounts manually. Collections managers have no prioritization system — they work from flat Excel exports. Telecallers call in random order, with no sense of which accounts are most at risk. Field agents get paper lists. Nobody has visibility into who has been contacted, what was promised, or what the outcome was — so the same borrower can get called twice in a day while another goes untouched for a week.

**RecoverAI** replaces the spreadsheet with an AI-ranked collections queue, role-based workflows for each type of agent, and real-time outcome logging so every promise, refusal, and payment is tracked centrally.

---

## Product overview

RecoverAI supports three user roles, each with a purpose-built workflow rather than one generic screen:

| Role | Workflow |
|---|---|
| **Collections Manager** | Sees the full AI-ranked dashboard, assigns accounts to telecallers/field agents, tracks daily assignment and contact progress, uploads new borrower data |
| **Telecaller** | Sees only their assigned accounts for today as a call queue, logs call outcomes, records Promises to Pay (PTPs) |
| **Field Agent** | Sees only their assigned field-visit cases, split into "Visit Required" and "On Hold — PTP Active," logs visit outcomes |

Each role lands on a different home screen after login and sees a sidebar scoped to their job — a manager never sees a telecaller's queue and vice versa.

---

## Key features

- **CSV upload → instant ranked borrower list**, sorted by DPD, SMA bucket, and outstanding balance
- **SMA bucket classification** (SMA-0 / SMA-1 / SMA-2 / NPA) derived from days-past-due, aligned with RBI's income recognition and asset classification norms
- **Rule-based priority scoring** with a plain-language reason attached to every ranked row (e.g. *"Serious delinquency — 75 days overdue. WhatsApp reminder with payment link."*)
- **Role-based assignment** — the assignee dropdown is filtered by the account's recommended action: field-visit accounts only show field agents, telecall/WhatsApp accounts only show telecallers
- **Interaction logging** with structured outcomes (Promise to Pay, Not Reachable, Refused, Dispute, Already Paid, Payment Collected) and PTP date/amount capture
- **Case assignments persisted to the database** — today's assignments survive a page refresh, browser restart, or agent logout
- **Dark / light mode**, theme-aware across the whole app
- **Mobile responsive**, with a collapsible slide-in sidebar and overlay below the `lg` breakpoint

---

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + TypeScript | Component-driven UI, type-safe API contracts |
| Frontend | Vite | Dev server and production bundler |
| Frontend | Tailwind CSS v4 | Utility-first styling, theming via CSS variables |
| Frontend | shadcn/ui (Base UI primitives) | Accessible unstyled components (Dialog, Select, Dropdown, etc.) |
| Frontend | React Router v7 | Client-side routing, role-based redirects and route guards |
| Backend | FastAPI (Python) | REST API framework, automatic OpenAPI docs |
| Backend | SQLAlchemy | ORM for all data models |
| Backend | Alembic | Database schema migrations |
| Backend | Pydantic | Request/response validation and settings management |
| Backend | PyJWT | JWT issuing and verification for auth |
| Backend | bcrypt | Password hashing |
| Database | PostgreSQL | Primary datastore (Neon serverless Postgres in production) |
| Queue | Redis + ARQ | Background job queue for asynchronous CSV processing |
| Storage | MinIO (local dev) / in-memory (production) | CSV file handling — persisted locally for debugging, processed in-memory in production to avoid object storage cost |
| Hosting | Vercel | Frontend hosting, global CDN, auto-deploy on push |
| Hosting | Render | Backend API + worker hosting |
| Hosting | Neon | Managed serverless PostgreSQL |
| Hosting | Upstash | Managed serverless Redis |

---

## Architecture

```
                    ┌─────────────────────┐
                    │   Browser (Vercel)   │
                    │  React + TypeScript  │
                    └──────────┬───────────┘
                               │ HTTPS / JSON
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI (Render)   │
                    │  REST API + JWT auth │
                    └──────┬───────┬───────┘
                           │       │
              ┌────────────┘       └────────────┐
              ▼                                  ▼
   ┌─────────────────────┐          ┌─────────────────────┐
   │  PostgreSQL (Neon)   │          │  Redis (Upstash)     │
   │  Source of truth     │          │  Job queue           │
   └─────────────────────┘          └──────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌─────────────────────┐
                                     │   ARQ Worker         │
                                     │  CSV parsing,        │
                                     │  SMA/priority scoring│
                                     └─────────────────────┘
```

CSV uploads are enqueued as background jobs so the upload endpoint responds immediately; the ARQ worker parses rows, classifies each borrower's SMA bucket from `dpd_days`, computes a priority action and a plain-language reason, and upserts borrower records — all off the request/response cycle.

---

## Data model

Six tables back the application:

| Table | Purpose |
|---|---|
| `users` | Login accounts. `role` is one of `manager`, `telecaller`, `field_agent`; scoped to an NBFC via `nbfc_id` |
| `nbfcs` | The lending institution (tenant). Also holds placeholder WhatsApp Business API credentials for the V2 integration |
| `borrowers` | One row per loan account — contact info, DPD, outstanding balance, computed `sma_bucket`, `priority_score`, `priority_reason`, and `priority_action` |
| `csv_uploads` | Upload history — filename, row/ingested/skipped counts, per-row error summary, and processing status |
| `interaction_logs` | Every call/visit/WhatsApp touchpoint — outcome, PTP date/amount, and whether it was logged offline and synced later |
| `case_assignments` | Which agent is assigned to which borrower, for which date, and its status — this is what powers each agent's "today" queue |

---

## API endpoints

| Method | Path | Typical caller | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Admin / seed script | Create a new user account |
| `POST` | `/auth/login` | Anyone | Authenticate with email/password, receive a JWT |
| `GET` | `/auth/me` | Any logged-in user | Current user's profile + NBFC name (drives role-based routing) |
| `GET` | `/borrowers/` | Manager | List all active borrowers |
| `GET` | `/borrowers/ranked` | Manager | Ranked borrower list — filterable by SMA bucket, priority action, outstanding range |
| `GET` | `/borrowers/{id}` | Any logged-in user | Single borrower detail |
| `POST` | `/borrowers/` | Manager | Create a borrower record directly |
| `PATCH` | `/borrowers/{id}` | Manager | Update a borrower's fields |
| `DELETE` | `/borrowers/{id}` | Manager | Soft-delete a borrower (`is_active = false`) |
| `POST` | `/uploads/csv` | Manager | Upload a CSV; enqueues an async ARQ job to parse and ingest it |
| `GET` | `/uploads/` | Manager | Upload history (last 20) |
| `GET` | `/uploads/{id}/status` | Manager | Poll processing status of a given upload |
| `POST` | `/interactions/` | Telecaller / Field Agent | Log a call or visit outcome, including PTP details |
| `GET` | `/interactions/{borrower_id}` | Any logged-in user | Interaction history for a borrower |
| `POST` | `/assignments/` | Manager | Assign one borrower to an agent for today |
| `POST` | `/assignments/bulk` | Manager | Assign multiple borrowers to one agent in a single call |
| `GET` | `/assignments/today` | Any logged-in user | Today's assignments (agents filter client-side by their own user id) |
| `PATCH` | `/assignments/{borrower_id}/status` | Any logged-in user | Update an assignment's status |
| `GET` | `/users/` | Manager | List active users in the same NBFC (populates assignee dropdowns) |
| `GET` | `/health` | Infra (UptimeRobot) | DB connectivity check, used to keep the Render instance warm |

Interactive OpenAPI docs are available at `/docs` on any running instance of the backend.

---

## Local development setup

**Prerequisites:** Python 3.11+, Node 18+, Docker Desktop

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd recoverai
   ```

2. **Copy environment variables and fill in values**
   ```bash
   cp .env.example .env
   ```

3. **Start Postgres, Redis, and MinIO**
   ```bash
   docker compose up -d
   ```

4. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

5. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

6. **Seed demo data**
   ```bash
   python seed_data.py
   ```

7. **Start the API server** (Terminal 1)
   ```bash
   uvicorn app.main:app --reload
   ```

8. **Start the background worker** (Terminal 2)
   ```bash
   arq app.worker.main.WorkerSettings
   ```

9. **Install and start the frontend** (Terminal 3)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

10. **Open the app**
    ```
    http://localhost:5173
    ```

---

## Production deployment

| Service | Used for | Why |
|---|---|---|
| **Vercel** | Frontend hosting | Global CDN, zero-config auto-deploy on every push to `main` |
| **Render** | Backend API + worker | Native Python support, generous free tier for a portfolio project |
| **Neon** | PostgreSQL | Serverless Postgres, Mumbai region for low latency to Indian users, no 90-day free-tier expiry unlike some alternatives |
| **Upstash** | Redis | Serverless Redis, Mumbai region, 500k requests/month on the free tier — comfortably covers the ARQ job queue |
| **UptimeRobot** | Keep-alive | Pings `/health` every 5 minutes so Render's free-tier instance doesn't cold-start on the first request after idling |

In production, `USE_MINIO` is unset (`false`), so uploaded CSVs are parsed entirely in memory and the borrower rows are written straight to Postgres — no object storage is provisioned or billed for.

---

## Environment variables

| Name | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Full PostgreSQL connection string (used directly in production; local dev can leave this unset and rely on the `POSTGRES_*` vars below) |
| `POSTGRES_USER` | Local dev | Postgres username for the Docker container |
| `POSTGRES_PASSWORD` | Local dev | Postgres password for the Docker container |
| `POSTGRES_DB` | Local dev | Postgres database name for the Docker container |
| `REDIS_URL` | Production | Full Redis connection string (Upstash) |
| `REDIS_HOST` | Local dev | Redis host, defaults to `localhost` |
| `REDIS_PORT` | Local dev | Redis port, defaults to `6379` |
| `REDIS_PASSWORD` | Production (if applicable) | Redis auth password |
| `MINIO_ENDPOINT` | Local dev only | MinIO endpoint, defaults to `localhost:9000` |
| `MINIO_ROOT_USER` | Local dev only | MinIO access key |
| `MINIO_ROOT_PASSWORD` | Local dev only | MinIO secret key |
| `USE_MINIO` | Yes | `true` in local dev (CSVs stored in MinIO for debugging); `false`/unset in production (CSVs processed in memory only) |
| `JWT_SECRET_KEY` | Yes | Secret used to sign and verify JWTs |
| `JWT_ALGORITHM` | No | JWT signing algorithm, defaults to `HS256` |
| `JWT_EXPIRE_HOURS` | No | Token lifetime in hours, defaults to `8` |
| `ENVIRONMENT` | No | `development` or `production`, informational |
| `VITE_API_URL` | Yes (frontend) | Base URL of the backend API; defaults to `http://localhost:8000` if unset |

---

## PM context — why I built this

I'm a frontend developer transitioning into Product Management, and I built RecoverAI end-to-end to demonstrate product thinking, not just implementation ability. I wrote the PRD, designed the data model, made the architecture decisions, and built the full stack myself.

A few decisions I made deliberately, and why:

- **Rule-based priority scoring over ML for V1.** With no historical interaction data at launch, a black-box model would be both unnecessary and untrustworthy to a collections manager who needs to explain to their team *why* an account is top of the queue. A transparent rule (DPD → SMA bucket → recommended action, with a plain-language reason attached) is auditable from day one and gives me a clean baseline to compare an ML model against once real interaction history accumulates.
- **A single, flat `borrowers` table rather than a normalized loan/customer/account schema.** NBFCs onboard by dropping in a CSV export from whatever core banking system they already use. A single-table model with permissive nullable fields means a new NBFC can be onboarded on day zero without a data migration project, at the cost of some normalization I'd revisit once the product has more than one large customer.
- **In-memory CSV processing in production, MinIO in local dev.** Object storage is a real ongoing cost and an operational surface area (bucket lifecycle, access policy, backups) that a CSV-in/borrowers-out pipeline doesn't need if nothing downstream ever needs to re-read the raw file. Local dev still uses MinIO so the storage path is exercised and testable, but production skips it entirely — a small architecture decision, but one I could justify to an engineer or a CFO in one sentence each.

The target user throughout was a collections manager at an Indian NBFC who is currently doing this entire job in Excel — every screen, from the ranked dashboard down to the field agent's "Visit Required" list, was designed against that person's actual workflow.

---

## Roadmap (V2)

- **WhatsApp Business API integration** for automated payment reminders and PTP confirmations (the `nbfcs` table already has placeholder fields for this)
- **ML-based priority scoring** once enough interaction history has accumulated to train and validate against the rule-based baseline
- **PWA for field agents** with offline-first case logging — field visits often happen in low-connectivity areas, and `interaction_logs` already has `is_offline_log` / `synced_at` fields anticipating this
- **Multi-NBFC support with tenant isolation** — the schema already carries `nbfc_id` on every table; this needs to become an enforced boundary rather than an optional column
- **DPDP Act 2023 compliance fields** — consent tracking and data retention controls for borrower PII, ahead of India's Digital Personal Data Protection Act enforcement

---

## License

MIT
