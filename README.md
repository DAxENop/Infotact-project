# LedgerGuard

Dynamic multi-tenant billing engine with isolated tenant data paths, idempotent ledger semantics, and real-time updates.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Frontend (React + Vite + DaisyUI + TailwindCSS)     │
│  Socket.io client ← real-time ledger updates         │
├──────────────────────────────────────────────────────┤
│  Express 5 API Gateway                               │
│  ├── JWT middleware (RS256 + HS256 dual path)         │
│  ├── Rate limiting + Helmet security headers          │
│  └── Socket.io server (WebSocket layer)              │
├──────────────────────────────────────────────────────┤
│  Ledger Service                                       │
│  ├── Redis distributed lock (Lua compare-and-delete) │
│  ├── Unique compound index (tenant + entryId)        │
│  ├── MongoDB aggregation pipeline (stats)            │
│  └── Per-tenant DB isolation (LRU connection cache)  │
└──────────────────────────────────────────────────────┘
```

## Features

### Backend
- **API Gateway** — Express 5 with helmet, CORS, rate limiting
- **JWT Auth** — RS256 asymmetric verification with per-tenant public key map + HS256 fallback
- **Redis Distributed Locks** — Atomic acquire/release via Lua scripts, 30s TTL, safe-unlock pattern
- **Idempotent Ledger** — Three-layer defense: Redis lock → findOne → unique compound index
- **Per-tenant DB Isolation** — Separate MongoDB connection per tenant, LRU cache with TTL eviction
- **Real-time Events** — Socket.io emits `ledger:created` to tenant room on new entries
- **Analytics Aggregation** — MongoDB `$aggregate` for revenue, transaction counts, status breakdown, daily trends

### Frontend
- **Enterprise Login** — Register/login with Zod validation, JWT persistence
- **Dashboard** — Revenue stats, transaction counts, daily trends
- **Charts** — Bar (transactions/day), Line (revenue trend), Doughnut (status breakdown)
- **Date Range Filter** — 7d / 30d / 90d quick filters
- **Ledger Page** — Paginated table, search, add-entry modal with JSON metadata
- **Real-time Updates** — Socket.io listener refreshes dashboard on new entries
- **Toast Notifications** — Success/error feedback on all operations
- **Dark Mode** — Theme context with system preference detection

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB running locally or reachable URI per tenant
- Redis running locally (optional — degrades gracefully without it)

### Backend
```bash
cd backend
npm install
copy .env.example .env   # Windows
# Fill JWT_PUBLIC_KEYS and DB_URI_<TENANT> in .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 4000) |
| `MONGO_URI` | Yes | Main MongoDB URI for auth |
| `DB_URI_<TENANT>` | Yes | Per-tenant MongoDB URI (e.g., `DB_URI_ACME`) |
| `JWT_SECRET` | Yes | HMAC fallback secret |
| `JWT_PUBLIC_KEYS` | No | JSON map of tenant→public key for RS256 |
| `REDIS_URL` | No | Redis connection string (default: `redis://127.0.0.1:6379`) |
| `CORS_ORIGIN` | No | Allowed origin (default: `http://localhost:5173`) |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Login, returns JWT |
| `POST` | `/ledger/entries` | JWT | Create ledger entry (idempotent) |
| `GET` | `/ledger/entries` | JWT | List entries (paginated) |
| `GET` | `/ledger/stats` | JWT | Aggregated analytics |

### Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join` | Client→Server | `tenantId` (string) |
| `ledger:created` | Server→Client | Ledger document object |

## Security
- Tenant DB URI fallback to shared DB is intentionally disabled
- JWT algorithm restricted to RS256 (asymmetric) for API tokens, HS256 for internal auth
- Optional issuer/audience checks enforceable from env
- API rate-limited with security headers (Helmet)
- Redis lock uses Lua compare-and-delete — only lock owner can release
