# Growth OS — API (Sprint 1)

## O que isso entrega
- Multi-tenant (workspace_id em tudo)
- Event Bus central (`/events`) com `correlation_id` + `idempotency_key`
- Leads (CRUD + search/pagination + timeline)
- Pipeline (Kanban via `PATCH /leads/:id/status` + `lead_status_history`)
- Campaigns/Variants + tracking
- WhatsApp MVP (gera `wa.me` + loga `message.sent`)
- Workers BullMQ (`webhooks`, `messaging`, `metrics`)

## Setup rápido (dev)
1) Suba um Redis local (ou use um Redis gerenciado) e copie a URL.
2) No Supabase, rode as migrations em `db/migrations/` (na ordem).
3) Crie `.env` baseado em `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL`
   - `INGEST_SECRET` (recomendado para captura sem login)

## Rodar
```bash
npm run dev          # API
npm run dev:workers  # workers
```

## Captura sem login (LP/webhook)
`POST /ingest/leads`
- Header: `x-ingest-secret: <INGEST_SECRET>`
- Body: `{ workspace_id, name, whatsapp, ...tracking }`

