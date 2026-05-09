'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Lead = {
  id: string;
  name: string;
  whatsapp: string;
  company?: string | null;
  status: string;
  priority: number;
  source_channel: string;
  campaign_id?: string | null;
  variant_id?: string | null;
  hook?: string | null;
  cta?: string | null;
  creative_label?: string | null;
  utm?: Record<string, any>;
  notes?: string | null;
};

type Timeline = {
  events: Array<any>;
  messages: Array<any>;
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    new: 'Novo',
    contacted: 'Contatado',
    replied: 'Respondeu',
    qualified: 'Qualificado',
    scheduled: 'Agendado',
    won: 'Fechado',
    lost: 'Perdido',
  };
  return map[status] ?? status;
}

function eventLabel(eventType: string) {
  const map: Record<string, string> = {
    'lead.created': 'Lead criado',
    'lead.status_changed': 'Mudança de status',
    'message.sent': 'Mensagem enviada',
    'message.received': 'Mensagem recebida',
  };
  return map[eventType] ?? eventType;
}

function priorityLabel(p: number) {
  if (p >= 2) return <Badge variant="red">URGENTE</Badge>;
  if (p === 1) return <Badge variant="yellow">ALTA</Badge>;
  return <Badge variant="neutral">NORMAL</Badge>;
}

function toTs(item: any) {
  if (item.timestamp) return new Date(item.timestamp).getTime();
  if (item.created_at) return new Date(item.created_at).getTime();
  return 0;
}

export function LeadDetail({ leadId }: { leadId: string }) {
  const leadQ = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.get<{ lead: Lead }>(`/leads/${leadId}`),
  });
  const timelineQ = useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: () => api.get<Timeline>(`/leads/${leadId}/timeline?limit=200`),
  });

  const whatsapp = useMutation({
    mutationFn: async () => {
      const lead = leadQ.data?.lead;
      if (!lead) return;
      const text =
        `Oi ${lead.name}. Vi seu cadastro no treinamento grátis. ` +
        `Pra eu te ajudar rápido: hoje o problema é mais equipe que não vende ou faturamento baixo?`;
      const res = await api.post<{ url: string }>(`/leads/${leadId}/whatsapp`, { text });
      window.open(res.url, '_blank', 'noopener,noreferrer');
    },
  });

  const changeStatus = useMutation({
    mutationFn: async (to_status: string) => {
      return api.patch<{ lead: Lead }>(`/leads/${leadId}/status`, { to_status });
    },
    onSuccess: () => {
      leadQ.refetch();
      timelineQ.refetch();
    },
  });

  const lead = leadQ.data?.lead;
  const items = [
    ...(timelineQ.data?.events ?? []).map((e) => ({
      kind: 'event' as const,
      ts: toTs(e),
      title: eventLabel(e.event_type),
      rawType: e.event_type,
      data: e,
    })),
    ...(timelineQ.data?.messages ?? []).map((m) => ({
      kind: 'message' as const,
      ts: toTs(m),
      title: m.direction === 'inbound' ? 'Mensagem recebida' : 'Mensagem enviada',
      rawType: m.direction === 'inbound' ? 'message.received' : 'message.sent',
      data: m,
    })),
  ].sort((a, b) => b.ts - a.ts);

  if (leadQ.isLoading) return <div className="text-sm text-neutral-400">Carregando…</div>;
  if (leadQ.error || !lead) return <div className="text-sm text-neutral-400">Lead não encontrado.</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{lead.name}</h1>
            {priorityLabel(lead.priority)}
            <Badge variant="neutral">{statusLabel(lead.status)}</Badge>
          </div>
          <div className="text-sm text-neutral-400">
            {lead.company ? `${lead.company} · ` : ''}
            {lead.whatsapp}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
            <span>Origem: {lead.source_channel}</span>
            <span className="text-neutral-700">|</span>
            <span>Campanha: {lead.campaign_id ?? '—'}</span>
            <span className="text-neutral-700">|</span>
            <span>Variante: {lead.variant_id ?? '—'}</span>
          </div>
          <div className="text-xs text-neutral-300">
            <span className="text-neutral-500">Hook:</span> {lead.hook ?? '—'}
          </div>
          <div className="text-xs text-neutral-300">
            <span className="text-neutral-500">CTA:</span> {lead.cta ?? '—'}
          </div>
        </div>

        <Button onClick={() => whatsapp.mutate()} disabled={whatsapp.isPending} className="h-12 px-6">
          WhatsApp
        </Button>
      </header>

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <Card>
          <CardHeader className="text-sm font-medium">Timeline</CardHeader>
          <CardContent>
            {timelineQ.isLoading ? (
              <div className="text-sm text-neutral-400">Carregando timeline…</div>
            ) : (
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-sm text-neutral-400">Sem eventos ainda.</div>
                ) : (
                  items.map((it, idx) => (
                    <div
                      key={idx}
                      className={[
                        'rounded-md border border-[color:var(--border)] bg-neutral-950/25 p-3',
                        it.rawType === 'message.received' ? 'border-emerald-900/35' : '',
                        it.rawType === 'message.sent' ? 'border-blue-900/35' : '',
                        it.rawType === 'lead.status_changed' ? 'border-yellow-900/35' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium text-neutral-200">{it.title}</div>
                          <div className="text-[11px] text-neutral-500">{it.rawType}</div>
                        </div>
                        <div className="text-[11px] text-neutral-500 whitespace-nowrap">
                          {new Date(it.ts).toLocaleString()}
                        </div>
                      </div>

                      {it.kind === 'message' ? (
                        <div className="mt-2 text-sm text-neutral-100 whitespace-pre-wrap leading-6">
                          {it.data.body}
                        </div>
                      ) : (
                        <pre className="mt-2 text-[11px] text-neutral-400 whitespace-pre-wrap leading-5">
                          {JSON.stringify(it.data.payload ?? {}, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="text-sm font-medium">Ação rápida</CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-neutral-400">Mudar status</div>
              <div className="grid grid-cols-2 gap-2">
                {['new', 'contacted', 'replied', 'qualified', 'scheduled', 'won', 'lost'].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={lead.status === st ? 'primary' : 'secondary'}
                    onClick={() => changeStatus.mutate(st)}
                    disabled={changeStatus.isPending}
                  >
                    {statusLabel(st)}
                  </Button>
                ))}
              </div>
              <div className="text-[11px] text-neutral-500">
                Status sempre emite <span className="text-neutral-300">lead.status_changed</span> (Event Bus).
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-sm font-medium">Tracking</CardHeader>
            <CardContent className="text-xs text-neutral-300 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-[color:var(--border)] bg-neutral-950/20 p-2">
                  <div className="text-neutral-500">Origem</div>
                  <div className="text-neutral-200">{lead.source_channel}</div>
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-neutral-950/20 p-2">
                  <div className="text-neutral-500">Criativo</div>
                  <div className="text-neutral-200">{lead.creative_label ?? '—'}</div>
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-neutral-950/20 p-2">
                  <div className="text-neutral-500">Campanha</div>
                  <div className="text-neutral-200">{lead.campaign_id ?? '—'}</div>
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-neutral-950/20 p-2">
                  <div className="text-neutral-500">Variante</div>
                  <div className="text-neutral-200">{lead.variant_id ?? '—'}</div>
                </div>
              </div>

              <div className="rounded-md border border-[color:var(--border)] bg-neutral-950/20 p-2">
                <div className="text-neutral-500">UTMs</div>
                <pre className="mt-1 text-[11px] text-neutral-400 whitespace-pre-wrap leading-5">
                  {JSON.stringify(lead.utm ?? {}, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-sm font-medium">Observações</CardHeader>
            <CardContent className="text-sm text-neutral-200 whitespace-pre-wrap">
              {lead.notes ?? '—'}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
