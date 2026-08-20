# LedgerGuard

**Dynamic multi-tenant billing engine** with isolated tenant data paths, idempotent ledger semantics, and real-time updates.

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
- **Request Tracing** — Per-request audit trail with traceId, latency percentiles, tenant context

### Frontend
- **Dashboard** — Revenue stats, transaction counts, daily trends with animated counters
- **Charts** — Bar (transactions/day), Line (revenue trend), Doughnut (status breakdown)
- **Date Range Filter** — 7d / 30d / 90d quick filters
- **Ledger Page** — Paginated table, search, add-entry modal with JSON metadata
- **Real-time Updates** — Socket.io listener refreshes dashboard on new entries
- **Toast Notifications** — Success/error feedback on all operations
- **Dark Mode** — Theme context with system preference detection

## Performance

### Query Benchmarks (sub-5ms on indexed paths)

Benchmarked on 10,000 seeded ledger entries:

| Operation | Latency | Status |
|-----------|---------|--------|
| `findOne` (compound index) | **~1.3ms** | ✅ sub-5ms |
| `countDocuments` | **~3.1ms** | ✅ sub-5ms |
| `lru-cache.get` | **~0.1ms** | ✅ sub-5ms |
| Aggregation (summary) | ~37ms | Worker thread |
| Aggregation (daily) | ~40ms | Worker thread |
| Aggregation (status) | ~40ms | Worker thread |

### Viewport Benchmarks (60 FPS = 16.67ms budget)

| Operation | p95 Latency | Status |
|-----------|-------------|--------|
| Stat card render | **0.004ms** | ✅ PASS |
| Table render (100 rows) | **0.166ms** | ✅ PASS |
| Search filter (100 items) | **0.050ms** | ✅ PASS |
| JSON parse metadata | **0.001ms** | ✅ PASS |

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB running locally
- Redis running locally (optional — degrades gracefully)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DB_URI_TEST_TENANT=mongodb://127.0.0.1:27017/ledgerguard_test_tenant
npm run seed    # Populate demo data
npm run dev     # Start server on :4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Start Vite on :5173
```

### Run Benchmarks
```bash
cd backend
npm run bench   # Seed 10k entries + measure query latency
cd ../frontend
npm run bench   # Viewport render performance
```

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
| `GET` | `/ledger/stats` | JWT | Aggregated analytics |
| `PATCH` | `/ledger/entries/:id/status` | JWT | Update entry status |

### Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join` | Client → Server | `tenantId` (string) |
| `ledger:created` | Server → Client | Ledger document |
| `ledger:updated` | Server → Client | Ledger document |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 4000) |
| `MONGO_URI` | Yes | Main MongoDB URI for auth |
| `DB_URI_<TENANT>` | Yes | Per-tenant MongoDB URI (e.g., `DB_URI_TEST_TENANT`) |
| `JWT_SECRET` | Yes | HMAC fallback secret |
| `JWT_PUBLIC_KEYS` | No | Comma-separated `tenant:publicKey` pairs for RS256 |
| `REDIS_URL` | No | Redis connection (default: `redis://127.0.0.1:6379`) |
| `CORS_ORIGIN` | No | Allowed origin (default: `http://localhost:5173`) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, DaisyUI 5, TailwindCSS 4, Chart.js 4, Socket.io-client, Framer Motion |
| Backend | Node.js, Express 5, Socket.io, JWT, Zod, ioredis, LRU-cache |
| Database | MongoDB (Mongoose 9), Redis |
| Security | RSA-256 asymmetric JWT, Helmet, CORS, rate limiting, Lua-based Redis locks |
| Concurrency | worker_threads for aggregation, requestAnimationFrame for UI animations |
| Observability | Structured trace logging with traceId, latency percentiles |

## Security

- Tenant DB URI fallback to shared DB is intentionally disabled
- JWT algorithm restricted to RS256 (asymmetric) for API tokens, HS256 for internal auth
- Optional issuer/audience checks enforceable from env
- API rate-limited with security headers (Helmet)
- Redis lock uses Lua compare-and-delete — only lock owner can release
- All user input sanitized via DOMPurify before API submission
- Request-level trace logging for audit trail
