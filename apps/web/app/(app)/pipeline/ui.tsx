'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

type Lead = {
  id: string;
  name: string;
  whatsapp: string;
  status: string;
  priority: number;
  source_channel: string;
  hook?: string | null;
  last_contact_at?: string | null;
  created_at: string;
};

type LeadsResponse = {
  items: Lead[];
};

const STATUSES = [
  { key: 'new', label: 'Novo' },
  { key: 'contacted', label: 'Contatado' },
  { key: 'replied', label: 'Respondeu' },
  { key: 'qualified', label: 'Qualificado' },
  { key: 'scheduled', label: 'Agendado' },
  { key: 'won', label: 'Fechado' },
  { key: 'lost', label: 'Perdido' },
] as const;

function idleLabel(iso?: string | null) {
  if (!iso) return '—';
  const dt = new Date(iso).getTime();
  const mins = Math.max(Math.floor((Date.now() - dt) / 60000), 0);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { leadId: lead.id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const urgent = lead.priority >= 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        'rounded-md border border-[color:var(--border)] bg-neutral-950/35 p-3 cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-70' : '',
        urgent ? 'bg-red-950/20 border-red-900/40' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:underline">
          {lead.name}
        </Link>
        {urgent ? <Badge variant="red">URG</Badge> : null}
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">{lead.source_channel}</div>
      <div className="mt-2 text-xs text-neutral-300 line-clamp-2">{lead.hook ?? '—'}</div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
        <span>Parado: {idleLabel(lead.last_contact_at ?? lead.created_at)}</span>
        <span>{lead.whatsapp}</span>
      </div>
    </div>
  );
}

function Column({
  statusKey,
  label,
  leads,
}: {
  statusKey: string;
  label: string;
  leads: Lead[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: statusKey,
    data: { statusKey },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        'rounded-lg border border-[color:var(--border)] bg-neutral-950/25',
        isOver ? 'ring-2 ring-blue-600' : '',
      ].join(' ')}
    >
      <div className="px-3 py-2 border-b border-[color:var(--border)] flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-neutral-500">{leads.length}</div>
      </div>
      <div className="p-3 space-y-2 min-h-[120px]">
        {leads.length === 0 ? (
          <div className="text-xs text-neutral-600">Sem leads aqui.</div>
        ) : (
          leads.map((l) => <LeadCard key={l.id} lead={l} />)
        )}
      </div>
    </div>
  );
}

export function PipelineBoard() {
  const qc = useQueryClient();

  const leadsQ = useQuery({
    queryKey: ['pipeline-leads'],
    queryFn: async () => {
      // Sprint 1: traz último lote e deixa o operador trabalhar rápido.
      // Evolui depois para paginação por coluna.
      const res = await api.get<any>('/leads?page=1&pageSize=200');
      return (res.items ?? []) as Lead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (vars: { leadId: string; toStatus: string }) => {
      return api.patch<{ lead: Lead }>(`/leads/${vars.leadId}/status`, { to_status: vars.toStatus });
    },
    onMutate: async ({ leadId, toStatus }) => {
      await qc.cancelQueries({ queryKey: ['pipeline-leads'] });
      const prev = qc.getQueryData<Lead[]>(['pipeline-leads']) ?? [];
      qc.setQueryData<Lead[]>(['pipeline-leads'], (old = []) =>
        old.map((l) => (l.id === leadId ? { ...l, status: toStatus } : l)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['pipeline-leads'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-leads'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const byStatus = useMemo(() => {
    const map: Record<string, Lead[]> = Object.fromEntries(STATUSES.map((s) => [s.key, []]));
    for (const l of leadsQ.data ?? []) {
      (map[l.status] ?? (map[l.status] = [])).push(l);
    }
    return map;
  }, [leadsQ.data]);

  const onDragEnd = (e: DragEndEvent) => {
    const leadId = e.active.id as string;
    const over = e.over?.id as string | undefined;
    if (!over) return;
    updateStatus.mutate({ leadId, toStatus: over });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-neutral-400">Mover lead sem fricção. Sem reload pesado.</p>
        </div>
        <div className="text-xs text-neutral-500">{leadsQ.isFetching ? 'Atualizando…' : ''}</div>
      </header>

      {leadsQ.error ? (
        <div className="text-sm text-neutral-400">Erro ao carregar. Configure token/workspace em Settings.</div>
      ) : (
        <DndContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-7 gap-3">
            {STATUSES.map((s) => (
              <Column key={s.key} statusKey={s.key} label={s.label} leads={byStatus[s.key] ?? []} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
