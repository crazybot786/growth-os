## TRAE — Growth OS (Arquitetura Modular Expansível)

> Objetivo: transformar o MVP (funil + CRM + WhatsApp + dashboard) em um **sistema modular e expansível**, com **event-driven architecture**, **jobs assíncronos**, **IA plugável** e **memória acumulativa** — sem perder velocidade.

---

### 0) Princípios (não negociáveis)
1) **Velocity > perfeição**: primeiro coletar dados e aprender rápido.
2) **Tudo vira evento**: qualquer ação importante gera evento (rastreável e reprocessável).
3) **Módulos independentes**: cada módulo tem responsabilidades claras + contratos (API + eventos).
4) **IA é plug-in, não “feature”**: IA entra como worker/serviço reagindo a eventos.
5) **Memória é produto**: registrar, aprender, recomendar. O sistema não pode “executar e esquecer”.

---

### 1) Stack alvo (com adições para escalabilidade)
**Front**
- Next.js + Tailwind + shadcn/ui + Framer Motion

**Back**
- Node.js + Supabase/Postgres
- **Redis (adicionar)**: cache + rate limit + locks + filas
- **BullMQ (adicionar)**: jobs, retries, cron jobs internos, processamento assíncrono

**Automação**
- n8n (preferencial) via webhooks
- WhatsApp: wa.me (MVP) → Evolution API/Baileys (depois)

**Deploy**
- Vercel (front)
- Railway ou VPS (API + workers + webhooks)

---

### 2) Mental model (camadas do sistema)
**Camada 1 — Aquisição**
- Entrada de leads (Meta, Google, TikTok, Orgânico, Indicação, WhatsApp, LPs)
- Tracking: hook, criativo, CTA, CPL, origem, ângulo, campanha, variante

**Camada 2 — CRM Operacional**
- Pipeline simples + atividade + logs + status
- Meta: “quem está em que etapa” e “o que fazer agora”

**Camada 3 — Motor de Testes**
- Clona campanhas/variantes rápido, troca 1 variável, mede e mostra vencedor
- Meta: “o que repetir / o que matar / o que testar depois”

**Camada 4 — Motor Cognitivo (IA)**
- Analisa padrões, classifica, sugere variantes, gera ativos (copy/criativo) quando fizer sentido
- Meta: aumentar qualidade e velocidade de decisão (não “chat bonitinho”)

**Camada 5 — Memória / Inteligência acumulativa**
- Banco de padrões comerciais por segmento, ticket, canal, ângulo
- Meta: recomendações que ficam melhores com o tempo

---

### 3) Arquitetura orientada a eventos (o coração do Growth OS)
#### 3.1 Eventos canônicos (MVP → escala)
Eventos mínimos:
- `lead.created`
- `lead.updated`
- `lead.status_changed`
- `campaign.created`
- `variant.created`
- `variant.updated`
- `message.sent`
- `message.received`
- `appointment.scheduled` (manual no MVP)
- `deal.won`
- `deal.lost`
- `metric.recorded` (ex.: cpl, reply_rate, etc.)

Eventos de crescimento (quando expandir):
- `abtest.started`
- `abtest.variant_switched`
- `abtest.ended`
- `insight.generated`
- `asset.generated` (copy, roteiro, criativo)
- `recommendation.generated`

#### 3.2 Regras de ouro dos eventos
1) Evento é **fato** (não opinião): “o que aconteceu”.
2) Evento sempre carrega:
   - `event_id`, `event_type`, `timestamp`
   - `workspace_id` (empresa/conta)
   - `actor` (user/system/automation)
   - `entity_type`, `entity_id` (lead/campaign/variant)
   - `payload` (dados)
3) Todo evento é **persistido** (para auditoria e “replay”).

---

### 4) Módulos (boundaries) e contratos
> A regra: cada módulo oferece **API + eventos**. Os outros módulos não “invadem” tabelas internas sem contrato.

#### M1 — Auth & Workspace
Responsabilidades:
- usuários, equipes, permissões, workspaces (empresas)
- multi-tenant desde o MVP

API (mínimo):
- login/logout
- CRUD workspace e membros

Eventos:
- `user.created`, `workspace.created`, `member.invited`

#### M2 — Leads (core)
Responsabilidades:
- CRUD de lead + dados obrigatórios (nome, whatsapp, empresa, origem, hook, data, obs, status)

API:
- criar lead (LP/WhatsApp/webhook)
- listar/pesquisar
- atualizar status

Eventos:
- `lead.created`, `lead.status_changed`, `lead.updated`

#### M3 — Pipeline (Kanban)
Responsabilidades:
- visão operacional do pipeline + drag & drop
- regras de status (pipeline fixo no MVP)

API:
- reorder/drag
- update status + motivo (perdido)

Eventos:
- `lead.status_changed` (sempre emitido por aqui)

#### M4 — Tracking (UTM + IDs internos)
Responsabilidades:
- gerar links com tracking
- armazenar atribuição (campanha/variante/hook/CTA/criativo)

API:
- criar campanha
- criar variante
- gerar link rastreável

Eventos:
- `campaign.created`, `variant.created`, `variant.updated`

#### M5 — Messaging (WhatsApp/Email)
Responsabilidades:
- templates, envio, logs e ingestão de resposta (quando possível)
- no MVP: wa.me + logs; depois API real + webhooks

API:
- send message (com template)
- list messages por lead

Eventos:
- `message.sent`, `message.received`

#### M6 — Automations (n8n + webhooks + rules)
Responsabilidades:
- reagir a evento e executar fluxo (mensagem, tarefa, lembrete, etc.)
- gestão básica de regras no app (MVP: poucas regras fixas)

Integração:
- webhook outbound: o sistema dispara eventos para o n8n
- webhook inbound: n8n devolve resultado (ex.: message sent)

Eventos:
- `automation.triggered`, `automation.completed` (opcional)

#### M7 — Dashboard & Metrics
Responsabilidades:
- métricas e KPIs (CPL, leads, reply rate, agendamentos, conversão, ROI)
- rankings: melhor hook/criativo/CTA

Estratégia:
- calcular via agregações no Postgres (MVP)
- depois, materialized views / jobs de agregação no BullMQ

Eventos:
- `metric.recorded` (quando registrar)

#### M8 — A/B Tests (motor)
Responsabilidades:
- clonar variante
- garantir “1 variável por vez”
- registrar resultados e vencedor

API:
- create test (base + variações)
- mark winner

Eventos:
- `abtest.started`, `abtest.ended`, `abtest.variant_switched`

#### M9 — AI Orchestrator (plugável)
Responsabilidades:
- roteamento de tarefas de IA por tipo (classificação, insight, geração)
- controlar custos (rate limits, filas, thresholds)
- armazenar outputs como ativos (e.g., sugestões) e/ou eventos

Eventos:
- `insight.generated`, `recommendation.generated`, `asset.generated`

---

### 5) “Memória” do sistema (inteligência acumulativa)
> Memória = eventos + métricas + padrões + recomendações.

#### 5.1 O que precisa ser armazenado desde cedo (MVP+)
1) **Event log**: tudo que aconteceu (para replay e auditoria)
2) **Message log**: mensagens enviadas/recebidas (texto + metadados)
3) **Atribuição**: lead ↔ variante ↔ campanha ↔ hook/CTA/criativo
4) **Resultados**: status final (won/lost) + motivo (quando houver)

#### 5.2 Padrões (exemplos de “memória” útil)
- “Hooks de equipe improdutiva convertem melhor em varejo de ticket baixo”
- “CTA emocional performa melhor em cidade pequena”

Implementação incremental:
- MVP: regras e insights simples por agregação (SQL + dashboard)
- Depois: jobs de detecção de padrões (BullMQ) + “insight cards”

---

### 6) IA: divisão de responsabilidades (sem virar bagunça)
> IA entra como workers reagindo a evento, com “gates” (regras) para evitar custo e ruído.

#### 6.1 Perfis sugeridos
- **Claude (Anthropic)**: raciocínio estratégico e texto longo
  - análise de campanhas, objeções, estrutura de funil, melhoria de pitch, recomendações profundas
- **GPT (OpenAI)**: execução operacional
  - classificação rápida, parsing, roteamento, enriquecimento, geração curta em volume, tool calling
- **Gemini (Google AI Studio)**: multimodal e escala
  - OCR, leitura de criativos/imagens, análise de vídeo, extração barata em volume

#### 6.2 Como plugar (arquitetura)
1) Evento ocorre (ex.: `message.received`)
2) Worker decide se roda IA (gating):
   - tamanho do lead (qualificado?)
   - estágio do funil
   - custo permitido
3) Worker chama modelo adequado
4) Salva output como:
   - campo estruturado (ex.: `lead.intent = ...`)
   - evento (`insight.generated`)
   - ativo (`asset.generated`) quando for copy/criativo

#### 6.3 “Gates” (regras anti-perda-de-velocity)
- IA só roda:
  - quando vai gerar decisão prática (próxima ação)
  - ou quando vai reduzir tempo do operador
- Sem “chat genérico” no MVP.

---

### 7) Jobs, filas e retries (Redis + BullMQ)
Use BullMQ para qualquer coisa que:
- dependa de webhooks
- precise de retry (WhatsApp API instável)
- rode em background (agregações, insights, geração de assets)

Jobs típicos:
- `send_message`
- `ingest_webhook`
- `aggregate_metrics_daily`
- `generate_insights`
- `generate_assets` (futuro)

---

### 8) Padrão visual (UI) — Growth OS “executivo”
Direção:
- dark premium, minimalista, empresarial, limpo, hierarquia forte
- sem aparência de infoproduto/coach

Aplicação prática:
- layout em “cards” (dashboard) + tabela (leads) + kanban (pipeline)
- poucas cores: neutros + azul escuro como primária
- micro-animações só para reforçar feedback (Framer Motion)

---

### 9) Ordem de build (módulos) — mantendo o MVP campeão
Ordem obrigatória (respeitando seu North Star):
1) Auth & Workspace
2) Leads (CRUD) + Pipeline (Kanban)
3) Tracking (campanhas/variantes/UTM/IDs)
4) WhatsApp MVP (wa.me + templates + logs)
5) Eventos + Webhooks (base event-driven)
6) Dashboard básico (KPIs + rankings)
7) Motor de testes A/B (clonar, 1 variável, vencedor)
8) IA (começa só com 1–2 automações úteis e baratas)
9) Memória inteligente + auto-otimização (jobs + insights)

---

### 10) Critério de sucesso (o sistema está “vivo”)
O sistema está correto quando ele:
1) captura lead com atribuição completa (origem/hook/variante)
2) registra eventos e consegue “replay”
3) manda mensagens e loga tudo
4) move pipeline e mostra gargalo
5) mostra vencedor (hook/criativo/CTA) com base em dados
6) sugere próxima ação (primeiro insight simples) sem complexidade

