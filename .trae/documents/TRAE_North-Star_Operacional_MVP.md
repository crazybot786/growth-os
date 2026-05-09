## TRAE — North Star Operacional (MVP) | A Decisão Campeã

> Objetivo deste documento: dar ao TRAE **identidade operacional**, **stack**, **fluxo de execução**, **padrão visual** e **prioridade técnica** para construir o MVP com velocidade.

---

### 1) Identidade Operacional (o que o produto “é”)
O produto é um **sistema operacional de aquisição e conversão** para donos de negócios locais.  
Ele precisa passar a sensação: **“Consigo usar isso hoje e vender mais.”**

**Não é**: acadêmico, complexo, técnico demais, “coach”, motivacional, enfeitado.

**Palavras prioritárias na interface e mensagens:**
vender, fechar, faturamento, meta, processo, sistema, resultado, conversão, dinheiro na mesa.

**Palavras proibidas (hard rule):**
mindset, alta performance, transformação pessoal, mentalidade vencedora.

---

### 2) USP oficial (base de toda comunicação)
> “O Único Sistema Prático de Vendas para Donos de Negócio Local que Transforma uma Equipe que Não Veste a Camisa em uma Equipe que Fecha Vendas Todos os Dias — em 30 Dias, Sem Custo de Entrada e com Resultado Garantido.”

**Regra**: toda copy do sistema, textos de UI, anúncios, automações e LP devem girar em torno dessa promessa.

---

### 3) Stack principal (alvo)
**Front-end**
- Next.js
- TailwindCSS
- Framer Motion
- shadcn/ui

**Back-end**
- Node.js
- Supabase (Auth + Storage opcional)
- PostgreSQL

**Automações**
- WhatsApp API
- Evolution API **ou** Baileys
- Webhooks
- n8n (**preferencial**)

**Hospedagem**
- Vercel (front)
- Railway **ou** VPS (backend/webhooks)

---

### 4) Objetivo do MVP (escopo mínimo)
O MVP **não precisa**: ser bonito demais, IA avançada, automação perfeita, sistema complexo.  
O MVP **precisa** (velocidade absoluta):
1) **Captar leads**
2) **Organizar leads**
3) **Mandar mensagens**
4) **Acompanhar status**
5) **Permitir testes rápidos**
6) **Gerar aprendizado rápido** (dashboard simples)

**Foco inicial**: Loja/Varejo (negócio local), mas com estrutura que aceita outros nichos depois.

---

### 5) Estrutura do funil (ponta a ponta)
#### Etapa 1 — Tráfego
Objetivo: **curiosidade + identificação imediata**.

**Dores principais (vocabulário do avatar)**
- equipe desmotivada / “não veste a camisa”
- baixo faturamento
- funcionário não vende
- dono cansado de cobrar

**Hooks base**
- “Sua equipe não veste a camisa?”
- “O problema não é motivação. É processo.”
- “Você está deixando dinheiro na mesa.”

#### Etapa 2 — Landing Page (LP)
Objetivo: **capturar lead**.

Estrutura mínima:
- Headline forte (USP/variação)
- Quebra de crença (problema é processo)
- Explicação simples do método (3 passos)
- Prova (ou prova por mecanismo)
- CTA único: **“Quero o Treinamento Gratuito”**

#### Etapa 3 — Nutrição
Canais: WhatsApp, Email, vídeos curtos, Stories.  
Objetivo: confiança + lógica do método + erros comuns + “o problema é falta de processo”.

#### Etapa 4 — Conversão
Objetivo: levar para reunião/diagnóstico/fechamento.  
Tom: sem pressão exagerada; orientado a resultado; segurança; simplicidade.

---

### 6) Modelo de dados (CRM + Growth) — mínimo viável
> Banco: Postgres (Supabase). Estrutura feita para capturar origem, campanha e testes.

#### 6.1 Pipeline do CRM (status do lead)
Pipeline fixo (MVP):
1. Novo Lead
2. Contatado
3. Respondeu
4. Qualificado
5. Agendado
6. Fechado
7. Perdido

#### 6.2 Lead — campos obrigatórios
Cada lead deve ter:
- Nome
- WhatsApp
- Empresa
- Origem do anúncio (canal: Meta/Google/Orgânico/etc.)
- Hook do anúncio
- Data (criação)
- Observações
- Status (pipeline)

#### 6.3 Campanhas / Anúncios — campos obrigatórios
Todo anúncio/teste deve ter:
- Hook principal
- Ângulo
- Dor
- Mecanismo
- CTA
- Versão (ex.: A, B, C)
- Data de teste

Exemplo padrão:
- Hook: “Sua equipe não veste a camisa?”
- Ângulo: equipe improdutiva
- Dor: funcionário não vende
- CTA: treinamento grátis

#### 6.4 Teste A/B — comportamento do sistema
O sistema deve:
- duplicar campanhas rapidamente (clonar “anúncio/variante” internamente)
- trocar apenas **1 variável**
- salvar resultados
- mostrar vencedores

Variáveis suportadas:
Hook, CTA, Criativo, Headline, Garantia, Tempo da promessa, Objeções.

---

### 7) Fluxo de execução (como o sistema funciona na prática)
#### 7.1 Fluxo principal (Happy Path)
1) Usuário cria/seleciona **Campanha**
2) Cria **Anúncio/Variante** com: hook/ângulo/dor/mecanismo/CTA/versão
3) Gera link de captura (LP ou WhatsApp) com tracking (UTM + IDs internos)
4) Lead se cadastra (LP) → entra como **Novo Lead**
5) Disparo de WhatsApp/Email (automação) → status vira **Contatado**
6) Lead responde → **Respondeu**
7) Usuário qualifica → **Qualificado**
8) Agendamento de diagnóstico → **Agendado**
9) Resultado final → **Fechado** ou **Perdido**
10) Dashboard consolida: CPL, respostas, agendamentos, conversão, melhor hook/criativo/CTA

#### 7.2 Eventos (para automações)
Eventos mínimos que devem existir (mesmo que no MVP sejam simples):
- `lead.created`
- `lead.status_changed`
- `message.sent`
- `message.received`
- `appointment.scheduled` (pode ser manual no MVP)
- `deal.won`
- `deal.lost`

**Regra**: automação sempre reage a evento (webhook) e atualiza o lead.

---

### 8) Integração WhatsApp (MVP-first)
MVP precisa “funcionar hoje”:
- Primeiro degrau aceitável: link `wa.me` + mensagem pré-preenchida + tracking por parâmetros.
- Degrau seguinte: integração via Evolution API ou Baileys com webhooks.

**No MVP**: priorizar o caminho mais rápido e estável para:
- enviar mensagem (template básico)
- registrar que enviou (log)
- registrar resposta (quando possível via webhook)

---

### 9) Dashboard principal (decisão rápida)
Mostrar (MVP):
- CPL
- Leads gerados
- Taxa de resposta
- Agendamentos
- Conversão
- ROI (quando houver receita informada)
- Melhor hook
- Melhor criativo
- Melhor CTA

**Objetivo do dashboard**: decisão rápida (“o que repetir / o que matar / o que testar depois”).

Definições mínimas (para evitar ambiguidade):
- **Leads gerados**: contagem de `lead.created` no período
- **Taxa de resposta**: leads com status >= Respondeu / leads contatados
- **Conversão**: fechados / leads gerados (ou fechados / qualificados; escolher e deixar explícito no UI)
- **Melhor hook/criativo/CTA**: ranking por KPI primário (default: CPL ou agendamentos)

---

### 10) Direção visual da interface (UI)
Padrão:
- Dark premium
- Minimalista
- Empresarial
- Muito limpo
- Hierarquia forte (títulos claros, números grandes no dashboard)

Referências: Stripe, Linear, Notion, Vercel, Framer.

Evitar:
- aparência de infoproduto
- aparência de coach
- excesso de gradiente
- visual chamativo demais

Regras práticas (para o TRAE aplicar):
- Paleta: fundo quase preto + cinzas frios + azul escuro como “primary”.
- Componentes shadcn/ui (botões, cards, tabelas, tabs, dialogs) com pouca decoração.
- Animação (Framer Motion): usar só para microtransições (entrada/saída de modal, troca de tab). Nada “show”.

---

### 11) Prioridade de build (ordem obrigatória)
1) LP funcional
2) Captura de lead
3) Integração WhatsApp
4) CRM
5) Dashboard básico
6) Automações
7) Testes A/B
8) IA
9) Escalabilidade

**Regra**: tudo que não aumenta velocidade de teste/aprendizado fica para depois.

---

### 12) Roadmap (futuro, não-MVP)
Pode existir depois (não bloquear MVP):
- gerar criativos com IA
- gerar copies automaticamente
- analisar anúncios vencedores
- sugerir hooks
- relatórios automáticos
- automações inteligentes
- pontuação de leads

