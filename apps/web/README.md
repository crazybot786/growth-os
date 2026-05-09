# Growth OS — Web (Sprint 1)

## Objetivo
Interface operacional (cockpit) para:
- Leads (tabela compacta + ação rápida WhatsApp)
- Lead detail (tracking + timeline completa)
- Pipeline (Kanban drag-and-drop)
- Dashboard (KPIs mínimos)
- Settings (token + workspace)

## Setup
Crie `.env.local` baseado em `.env.example`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Rodar
```bash
npm run dev
```

## Operação (Sprint 1)
1) Vá em **Settings**
2) Cole:
   - Token Supabase (Bearer)
   - Workspace ID
3) Volte para **Leads** / **Pipeline**

