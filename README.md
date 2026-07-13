# Infotact-project

LedgerGuard is a dynamic multi-tenant billing engine with isolated tenant data paths and idempotent ledger semantics.

## Week 1 + Week 2 Status

### Backend (Node.js, Express, Redis, MongoDB)
- API gateway JWT middleware with RS256 verification and tenant extraction
- Dynamic tenant Mongo connection manager with LRU + TTL eviction
- Idempotent ledger endpoint with:
  - Redis distributed lock
  - lock ownership-safe unlock (Lua compare-and-delete)
  - Mongo transaction wrapper
  - unique tenant + entry id constraint semantics

### Frontend (React)
- Login view and enterprise dashboard shell
- Ledger page with search/filter/cards/table
- Add-transaction modal and toast notifications
- Professionalized visual system (design tokens, typography, responsive layout)

## Local Setup

## Prerequisites
- Node.js 20+
- MongoDB running locally or reachable URI per tenant
- Redis running locally at default URL or custom URL

## Backend
1. Open terminal in backend folder.
2. Install packages:
	- `npm install`
3. Copy env template:
	- `copy .env.example .env` (Windows)
4. Fill values in `.env`:
	- `JWT_PUBLIC_KEYS` map
	- `DB_URI_<TENANT>` for each tenant
5. Start backend:
	- `npm run dev` or `npm start`

Health check:
- `GET http://localhost:4000/health`

Ledger endpoint:
- `POST http://localhost:4000/ledger/entries`
- Requires Bearer token with tenant claim (`tid` or `tenant` or `org`)

Example body:
```json
{
  "entryId": "evt_1001",
  "amount": 2500,
  "meta": { "source": "api" }
}
```

## Frontend
1. Open terminal in frontend folder.
2. Install packages:
	- `npm install`
3. Run dev server:
	- `npm run dev`

## Security Notes
- Tenant DB URI fallback to shared DB is intentionally disabled.
- JWT algorithm is restricted to RS256.
- Optional issuer/audience checks can be enforced from env.
- API is rate-limited and has security headers enabled.