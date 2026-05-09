-- Growth OS — Sprint 1 (Sistema Vivo)
-- Fonte da verdade: TRAE_Sprint1_Sistema-Vivo_Spec.md
-- Objetivo: schema multi-tenant + Event Bus central + tracking + CRM operacional

-- Extensões
create extension if not exists pgcrypto;

-- =========================
-- ENUMS (domínio)
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'new',         -- Novo Lead
      'contacted',   -- Contatado
      'replied',     -- Respondeu
      'qualified',   -- Qualificado
      'scheduled',   -- Agendado
      'won',         -- Fechado
      'lost'         -- Perdido
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'actor_type') then
    create type actor_type as enum ('user', 'system', 'automation');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_direction') then
    create type message_direction as enum ('outbound', 'inbound');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_channel') then
    create type message_channel as enum ('whatsapp', 'email');
  end if;

  if not exists (select 1 from pg_type where typname = 'campaign_channel') then
    create type campaign_channel as enum ('meta', 'google', 'tiktok', 'organic', 'referral', 'whatsapp', 'landing_page');
  end if;
end $$;

-- =========================
-- WORKSPACES (multi-tenant)
-- =========================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Membros do workspace (mapeia users do Supabase Auth)
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null, -- referencia auth.users(id) no Supabase (FK opcional fora do schema public)
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);

-- Perfil opcional (evita depender de metadata do Auth)
create table if not exists public.profiles (
  id uuid primary key, -- auth.users.id
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- CAMPAIGNS + VARIANTS (tracking)
-- =========================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  channel campaign_channel not null,
  objective text,
  status text not null default 'active', -- active|paused|archived
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_workspace_id_idx on public.campaigns(workspace_id);
create index if not exists campaigns_channel_idx on public.campaigns(channel);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,

  -- Estrutura do anúncio / teste (obrigatório no Growth OS)
  hook text not null,
  angle text,
  pain text,
  mechanism text,
  cta text not null,
  version text not null, -- ex.: A, B, C
  test_date date,

  -- Campos extras (para evolução do motor de testes)
  headline text,
  guarantee text,
  promise_time text, -- ex.: "30 dias"
  creative_label text, -- MVP: label; futuro: referência ao asset/arquivo

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists variants_workspace_id_idx on public.variants(workspace_id);
create index if not exists variants_campaign_id_idx on public.variants(campaign_id);

-- =========================
-- LEADS (core CRM)
-- =========================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Campos obrigatórios do Sprint 1
  name text not null,
  whatsapp text not null,
  company text,
  source_channel campaign_channel not null default 'landing_page',

  -- Tracking profundo
  campaign_id uuid references public.campaigns(id) on delete set null,
  variant_id uuid references public.variants(id) on delete set null,
  hook text,
  cta text,
  creative_label text,
  utm jsonb not null default '{}'::jsonb,

  notes text,
  status lead_status not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_workspace_id_idx on public.leads(workspace_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_campaign_id_idx on public.leads(campaign_id);
create index if not exists leads_variant_id_idx on public.leads(variant_id);
create index if not exists leads_hook_idx on public.leads using gin (to_tsvector('portuguese', coalesce(hook,'')));

-- Histórico explícito de status (complementa Event Bus)
create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_status lead_status,
  to_status lead_status not null,
  reason text,
  actor_type actor_type not null,
  actor_id uuid,
  correlation_id uuid,
  idempotency_key text,
  created_at timestamptz not null default now()
);
create index if not exists lead_status_history_lead_id_idx on public.lead_status_history(lead_id, created_at desc);
create index if not exists lead_status_history_workspace_id_idx on public.lead_status_history(workspace_id);
create unique index if not exists lead_status_history_idem_idx
  on public.lead_status_history(workspace_id, idempotency_key)
  where idempotency_key is not null;

-- =========================
-- EVENTS (Event Bus central)
-- =========================
create table if not exists public.events (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  timestamp timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  correlation_id uuid not null default gen_random_uuid(),
  idempotency_key text,

  entity_type text not null, -- lead|campaign|variant|message|metric
  entity_id uuid not null,

  actor_type actor_type not null,
  actor_id uuid,

  payload jsonb not null default '{}'::jsonb
);
create index if not exists events_workspace_ts_idx on public.events(workspace_id, timestamp desc);
create index if not exists events_entity_idx on public.events(workspace_id, entity_type, entity_id, timestamp desc);
create index if not exists events_type_idx on public.events(workspace_id, event_type, timestamp desc);
create unique index if not exists events_idem_idx
  on public.events(workspace_id, event_type, idempotency_key)
  where idempotency_key is not null;

-- =========================
-- MESSAGES (log)
-- =========================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,

  channel message_channel not null default 'whatsapp',
  direction message_direction not null,
  body text not null,

  provider_message_id text, -- quando houver API real
  correlation_id uuid,
  idempotency_key text,

  actor_type actor_type not null,
  actor_id uuid,

  created_at timestamptz not null default now()
);
create index if not exists messages_lead_id_idx on public.messages(lead_id, created_at desc);
create index if not exists messages_workspace_id_idx on public.messages(workspace_id);
create unique index if not exists messages_idem_idx
  on public.messages(workspace_id, idempotency_key)
  where idempotency_key is not null;

-- =========================
-- METRICS (base do dashboard)
-- =========================
create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, -- ex.: cpl, leads_generated, reply_rate, scheduled, conversion, roi
  value numeric not null,
  dimensions jsonb not null default '{}'::jsonb, -- ex.: {"campaign_id": "...", "variant_id":"...", "hook":"..."}
  correlation_id uuid,
  recorded_at timestamptz not null default now()
);
create index if not exists metrics_workspace_time_idx on public.metrics(workspace_id, recorded_at desc);
create index if not exists metrics_name_idx on public.metrics(workspace_id, name, recorded_at desc);

