## TRAE — Sprint 1: Sistema Vivo (Auth + Event Bus + Leads + Pipeline + Tracking + WhatsApp MVP)

> Objetivo do sprint: colocar o **Growth OS “vivo”** ponta a ponta — capturar lead com tracking, registrar eventos, mover pipeline, logar mensagens e mostrar o básico no dashboard.  
> Prioridade absoluta: **velocidade de execução** + base arquitetural correta (multi-tenant + event-driven).

---

### 1) Entregas (o que deve existir ao final do Sprint 1)

#### BACK-END (Node + Supabase/Postgres + Redis + BullMQ)
1) **Auth + Workspace (multi-tenant desde o início)**
2) **Event Bus** (persistência de evento + endpoint `/events`)
3) **Leads Core**
   - CRUD completo
   - search/filter/pagination
   - tracking interno (origem, campanha, variante, hook, criativo, CTA)
   - **timeline** do lead (eventos + mensagens)
4) **Pipeline**
   - kanban simples (status fixos)
   - atualizar status gera evento (sempre)
5) **Tracking**
   - gerar links com UTM + IDs internos
6) **WhatsApp MVP**
   - gerador de `wa.me` + mensagem pré-preenchida
   - logs de mensagem (enviada/recebida manual ou via webhook se disponível)
7) **Infra**
   - Redis conectado
   - BullMQ rodando com 1–2 filas (webhooks/messaging)

### 1.1) Estrutura ideal do back-end (padrão de código)
> Objetivo: modularidade + disciplina. Evitar “lógica espalhada”.

Estrutura recomendada:
```
/src
  ├── modules
  │    ├── auth
  │    ├── leads
  │    ├── pipeline
  │    ├── campaigns
  │    ├── messaging
  │    ├── tracking
  │    ├── events
  │    └── metrics
  ├── workers
  │    ├── messaging
  │    ├── webhooks
  │    ├── metrics
  │    └── ai
  └── shared
       ├── db
       ├── redis
       ├── queue
       ├── utils
       └── types
```

**O que NÃO pode acontecer (hard rules)**
- controller escrevendo lógica de negócio (controller só orquestra request/response)
- front chamando banco diretamente (sempre via API/Server Actions)
- evento sendo disparado manualmente em qualquer lugar (evento só sai do **service layer** / módulo `events`)
- lógica espalhada sem contrato

**Fluxo correto (service layer central)**
Exemplo (padrão obrigatório):
`createLead()`
1) valida workspace/permissão  
2) salva lead  
3) emite `lead.created` (Event Bus)  
4) enfileira jobs necessários (BullMQ)  
5) retorna resultado  

#### FRONT-END (Next.js App Router + shadcn/ui)
1) Login
2) Dashboard **shell** (cards vazios com KPIs “base” + filtros de período)
3) Leads: tabela com filtros + paginação + detalhe (timeline)
4) Pipeline: kanban drag-and-drop (simples)
5) Campaigns: tabela simples (campanhas + variantes)

#### AUTOMAÇÃO (mínimo operacional)
1) Webhook inbound/outbound (estrutura pronta, mesmo que ainda “pouco usada”)
2) Geração de wa.me com tracking
3) Message logs integrados na timeline do lead

---

### 2) NÃO FAZER no Sprint 1 (hard rules)
- IA complexa / “chat” / copiloto na tela
- automação avançada
- insights “mágicos”
- analytics avançado
- micro-features
- visual exagerado (nada de glow/carnaval)

---

### 3) Módulo 1 — Auth + Workspace (multi-tenant)

#### 3.1 Estrutura lógica (escopo)
Workspace é a raiz de tudo:
```
workspace
 ├── users
 ├── campaigns
 ├── leads
 ├── events
 ├── messages
 ├── metrics
```

#### 3.2 Decisões técnicas
- Multi-tenant obrigatório: **todas** as tabelas com `workspace_id`.
- No front, toda query deve ser “scoped” por workspace.
- No back, toda mutation valida membership.

#### 3.3 Supabase Auth (recomendação prática)
- Usar Supabase Auth para login.
- Manter tabela `workspaces` + `workspace_members`.

**Eventos mínimos**
- `workspace.created`
- `member.added`
- `user.invited` (opcional)

---

### 4) Módulo 2 — Event Bus (coração do sistema)

#### 4.1 Endpoints (mínimo)
- `POST /events` (inserir evento canônico)
- `GET /events?workspace_id=...&entity_type=lead&entity_id=...` (timeline)

> Regra absoluta: **tudo gera evento**.  
> Ex.: lead criado → `lead.created` → worker reage → envia whatsapp → `message.sent` → status muda → `lead.status_changed` → dashboard agrega.

#### 4.2 Schema do evento (canônico)
Campos obrigatórios:
- `event_id` (uuid)
- `event_type` (string: `lead.created`, `message.sent`, etc.)
- `timestamp` (timestamptz)
- `workspace_id` (uuid)
- `correlation_id` (uuid/string) — conecta uma cadeia inteira (ex.: lead.created → message.sent → lead.status_changed)
- `idempotency_key` (string, opcional mas recomendado) — evita duplicação (webhooks/mensagens/jobs)
- `entity_type` (`lead`, `campaign`, `variant`, `message`, `metric`)
- `entity_id` (uuid)
- `actor_type` (`user` | `system` | `automation`)
- `actor_id` (uuid opcional)
- `payload` (jsonb)

#### 4.3 Regras de consistência
- Evento é “fato”. Sem opinião.
- Evento nunca apaga. No máximo “corrige” com novo evento.
- Qualquer write relevante no banco deve emitir evento (via service layer).

**Nota (importante): Event Bus é módulo real**
Eventos não são “logs”. Eventos são **infraestrutura crítica**. Tratar como módulo real (`modules/events`) com:
- funções únicas para emitir eventos (ex.: `emitEvent(...)`)
- validação de schema
- geração consistente de `correlation_id` e `idempotency_key`
- persistência + queries de timeline

---

### 5) Módulo 3 — Leads Core (produto visível)

#### 5.1 CRUD + busca
Requisitos:
- `create`, `update`, `search`, `filter`, `pagination`
- filtros mínimos: status, período, origem (canal), campanha, variante, hook

#### 5.2 Tracking interno (atribuição)
Cada lead deve carregar:
- `source_channel` (Meta/Google/TikTok/Orgânico/Indicação/WhatsApp/LP)
- `campaign_id` (nullable)
- `variant_id` (nullable)
- `hook` (texto)
- `cta` (texto)
- `creative_id` ou `creative_label` (string) (MVP pode ser label)
- UTM: `utm_source`, `utm_campaign`, `utm_content` (jsonb ok)

#### 5.3 Timeline (histórico completo)
Tela de detalhe do lead deve mostrar:
- eventos (event bus)
- mensagens (message logs)
- mudanças de status

**Eventos mínimos emitidos por Lead**
- `lead.created`
- `lead.updated`
- `lead.status_changed`

---

### 6) Módulo 4 — Pipeline (Kanban simples)
Objetivo:
- mover lead rápido
- visualizar gargalo
- agir rápido

#### 6.1 Status fixos (MVP)
1. Novo Lead
2. Contatado
3. Respondeu
4. Qualificado
5. Agendado
6. Fechado
7. Perdido

#### 6.2 Regras
- Drag & drop apenas atualiza `status` + registra evento `lead.status_changed`.
- “Perdido” deve registrar `payload.reason` (string curta, opcional no MVP).

---

### 7) Tracking (campanhas e variantes)

#### 7.1 Campanhas e variantes (campos)
**Campaign**
- nome, canal, objetivo, status (ativo/pausado), datas

**Variant / Ad (obrigatório)**
- hook principal
- ângulo
- dor
- mecanismo
- CTA
- versão
- data de teste

#### 7.2 Link rastreável (mínimo)
Gerar uma URL de LP/WhatsApp contendo:
- UTMs
- IDs internos (`campaign_id`, `variant_id`)
Ao capturar lead, salvar atribuição + emitir `lead.created` com payload incluindo tracking.

---

### 8) WhatsApp (MVP) — sem enrolar
Primeiro degrau (Sprint 1):
- botão “Enviar WhatsApp” que gera `wa.me` com mensagem curta, direta e comercial (CTA: treinamento grátis → diagnóstico).
- registrar `message.sent` (mesmo que o envio seja “manual via wa.me”).

Evolução (Sprint 2+):
- Evolution API/Baileys + webhook de recebimento → `message.received`.

---

### 9) Infra: Redis + BullMQ (infra crítica)

#### 9.1 Redis (obrigatório)
Usos já no Sprint 1:
- queue backend (BullMQ)
- rate limit (webhooks / endpoints sensíveis)
- dedupe (evitar evento duplicado em webhook)
- locks simples (processamento idempotente)

#### 9.2 BullMQ (infra crítica)
Estrutura recomendada:
```
/workers
 ├── messaging
 ├── webhooks
 ├── metrics
 └── ai (vazio no sprint 1; só scaffold)
```

Filas mínimas:
- `webhooks` (ingestão + retry)
- `messaging` (log/envio + retry)
- `metrics` (opcional no sprint 1: agregação simples)

Jobs típicos (Sprint 1):
- `ingest_webhook`
- `log_message_sent`
- `aggregate_metrics_basic` (pode rodar sob demanda)

Regras:
- Jobs sempre idempotentes (usar dedupe key no Redis).
- Retries configurados (ex.: 3–5) + backoff.

---

### 10) Next.js (App Router) + estrutura do projeto

#### 10.1 Rotas obrigatórias
```
/app
 ├── dashboard
 ├── leads
 ├── pipeline
 ├── campaigns
 └── settings
```

#### 10.2 Server Actions / RSC (diretriz)
Use:
- React Server Components para listagens e páginas
- Server Actions para mutations (create/update/status)
- streaming onde fizer sentido (tabelas grandes / carregamento progressivo)

Regra: mutations sempre:
1) validam workspace
2) escrevem no banco
3) emitem evento (Event Bus)

#### 10.3 Bibliotecas recomendadas (velocidade visual)
- **Tabelas**: TanStack Table  
- **Kanban**: dnd-kit  
- **Estado**: Zustand  
- **Fetching/cache**: TanStack Query (React Query)  

---

### 11) Design system (sem vibes de infoproduto)
Estrutura recomendada:
```
/components
 ├── ui
 ├── cards
 ├── tables
 ├── kanban
 ├── charts
 ├── dialogs
 └── forms
```

Direção visual:
- Dark premium, minimalista, empresarial
- Referência: Linear / Vercel / Stripe / Notion
- Evitar: glow, excesso de gradiente, “dashboard carnavalesco”

---

### 12) Critério de “sistema vivo” (checklist final)
1) Lead entra com tracking (origem/campanha/variante/hook/CTA)
2) `lead.created` é persistido no Event Bus
3) Status muda no Kanban e gera `lead.status_changed`
4) Existe log de mensagem `message.sent` (ao menos via wa.me)
5) Timeline do lead mostra eventos + mensagens
6) Dashboard mostra pelo menos: leads gerados, taxa de resposta (placeholder ok), melhor hook (por contagem/qualquer KPI base)

---

### Apêndice A — Postgres (tabelas principais + adições recomendadas)
**Tabelas principais**
- `workspaces`
- `workspace_members`
- `users` (ou Supabase Auth + profile)
- `leads`
- `campaigns`
- `variants`
- `messages`
- `events`
- `metrics`

**O que está faltando (e deve entrar cedo)**
1) `lead_status_history`  
   - mesmo com Event Bus, histórico explícito ajuda MUITO em query rápida e analytics futuros  
2) `idempotency_key`  
   - essencial para webhooks/mensagens/jobs (evita duplicação, loops e inconsistência)  
3) `correlation_id`  
   - tracing/debugging/replay/observabilidade (cadeias de eventos conectadas)  
