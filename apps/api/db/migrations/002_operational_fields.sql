-- Sprint 1 (Operação de lançamento): campos operacionais para velocidade
-- Motivo: leads table precisa mostrar "último contato", "tempo parado" e "prioridade" sem fricção.

alter table public.leads
  add column if not exists last_contact_at timestamptz,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists priority smallint not null default 0; -- 0=normal, 1=alta, 2=urgente (MVP)

create index if not exists leads_last_contact_at_idx on public.leads(last_contact_at desc);
create index if not exists leads_priority_idx on public.leads(priority desc);

