# LedgerGuard

Dynamic multi-tenant billing engine with isolated tenant data paths, idempotent ledger semantics, and real-time updates.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + DaisyUI + TailwindCSS)            │
│  ├── Socket.io client ← real-time ledger updates            │
│  ├── DOMPurify ← XSS sanitization on all user input        │
│  └── RequestAnimationFrame ← smooth stat counter animations │
├─────────────────────────────────────────────────────────────┤
│  Express 5 API Gateway                                      │
│  ├── JWT middleware (RS256 + HS256 dual path)                │
│  ├── Rate limiting + Helmet security headers                 │
│  ├── Trace middleware (request-level audit logging)          │
│  └── Socket.io server (WebSocket layer)                     │
├─────────────────────────────────────────────────────────────┤
│  Ledger Service                                              │
│  ├── Redis distributed lock (Lua compare-and-delete)        │
│  ├── Unique compound index (tenant + entryId)               │
│  ├── worker_threads ← aggregation offloaded off main loop   │
│  └── Per-tenant DB isolation (LRU connection cache)         │
└─────────────────────────────────────────────────────────────┘
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
- **worker_threads** — Heavy aggregation queries offloaded to worker threads (non-blocking main loop)
- **Trace Logging** — Request-level audit trail with traceId, latency, tenant, status code
- **Trace API** — `GET /trace/recent` (last 100 traces), `GET /trace/stats` (p50/p95/p99 latencies)

### Frontend
- **Enterprise Login** — Register/login with Zod validation, JWT persistence
- **Dashboard** — Revenue stats, transaction counts, daily trends
- **Charts** — Bar (transactions/day), Line (revenue trend), Doughnut (status breakdown)
- **Date Range Filter** — 7d / 30d / 90d quick filters
- **Animated Stats** — RequestAnimationFrame-based smooth number counting on stat cards
- **DOMPurify** — All user input sanitized before API calls (XSS prevention)
- **Ledger Page** — Paginated table, search, add-entry modal with JSON metadata
- **Real-time Updates** — Socket.io listener refreshes dashboard on new entries
- **Toast Notifications** — Success/error feedback on all operations
- **Dark Mode** — Theme context with system preference detection

## Performance Benchmarks

### Query Performance (sub-5ms on indexed paths)

Benchmarked on 10,000 seeded ledger entries:

| Operation | Latency | Status |
|-----------|---------|--------|
| `findOne` (compound index) | **1.31ms** | ✅ sub-5ms |
| `countDocuments` | **3.09ms** | ✅ sub-5ms |
| `lru-cache.get` | **0.11ms** | ✅ sub-5ms |
| Aggregation (summary) | ~37ms | Worker thread (off main loop) |
| Aggregation (daily) | ~40ms | Worker thread (off main loop) |
| Aggregation (status) | ~40ms | Worker thread (off main loop) |

Run: `cd backend && npm run bench`

### Viewport Performance (60 FPS = 16.67ms budget)

| Operation | p95 Latency | Status |
|-----------|-------------|--------|
| Stat card render | **0.004ms** | ✅ PASS |
| Table render (100 rows) | **0.166ms** | ✅ PASS |
| Search filter (100 items) | **0.050ms** | ✅ PASS |
| JSON parse metadata | **0.001ms** | ✅ PASS |
| Chart data transform | ~18ms | Single-render only (not per-frame) |

Run: `cd frontend && npm run bench`

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
| `GET` | `/trace/recent` | No | Last 100 request traces |
| `GET` | `/trace/stats` | No | Latency percentiles (p50/p95/p99) |
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Login, returns JWT |
| `POST` | `/ledger/entries` | JWT | Create ledger entry (idempotent) |
| `GET` | `/ledger/entries` | JWT | List entries (paginated) |
| `GET` | `/ledger/stats` | JWT | Aggregated analytics (worker thread) |

### Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join` | Client→Server | `tenantId` (string) |
| `ledger:created` | Server→Client | Ledger document object |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, DaisyUI 5, TailwindCSS 4, Chart.js 4, Socket.io-client, DOMPurify |
| Backend | Node.js, Express 5, Socket.io, JSONWebToken, Zod, ioredis, LRU-cache |
| Database | MongoDB (Mongoose 9), Redis |
| Security | RSA-256 asymmetric JWT, Helmet, CORS, rate limiting, Lua-based Redis locks |
| Concurrency | worker_threads for aggregation, RequestAnimationFrame for UI animations |
| Observability | Structured trace logging with traceId, latency percentiles |

## Security
- Tenant DB URI fallback to shared DB is intentionally disabled
- JWT algorithm restricted to RS256 (asymmetric) for API tokens, HS256 for internal auth
- Optional issuer/audience checks enforceable from env
- API rate-limited with security headers (Helmet)
- Redis lock uses Lua compare-and-delete — only lock owner can release
- All user input sanitized via DOMPurify before API submission
- Request-level trace logging for audit trail
