'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Lead = {
  id: string;
  name: string;
  whatsapp: string;
  company?: string | null;
  status: string;
  source_channel: string;
  campaign_id?: string | null;
  variant_id?: string | null;
  hook?: string | null;
  cta?: string | null;
  creative_label?: string | null;
  last_contact_at?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  priority: number;
  created_at: string;
};

type LeadsResponse = {
  items: Lead[];
  page: number;
  pageSize: number;
  total: number;
};

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

function lastInteraction(lead: Lead) {
  const inbound = lead.last_inbound_at ? new Date(lead.last_inbound_at).getTime() : 0;
  const outbound = lead.last_outbound_at ? new Date(lead.last_outbound_at).getTime() : 0;
  if (!inbound && !outbound) return '—';
  if (inbound >= outbound) return `IN ${idleLabel(lead.last_inbound_at)}`;
  return `OUT ${idleLabel(lead.last_outbound_at)}`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: any }> = {
    new: { label: 'Novo', variant: 'blue' },
    contacted: { label: 'Contatado', variant: 'neutral' },
    replied: { label: 'Respondeu', variant: 'green' },
    qualified: { label: 'Qualificado', variant: 'green' },
    scheduled: { label: 'Agendado', variant: 'yellow' },
    won: { label: 'Fechado', variant: 'green' },
    lost: { label: 'Perdido', variant: 'red' },
  };
  return map[status] ?? { label: status, variant: 'neutral' };
}

function priorityBadge(p: number) {
  if (p >= 2) return <Badge variant="red">URGENTE</Badge>;
  if (p === 1) return <Badge variant="yellow">ALTA</Badge>;
  return <Badge variant="neutral">NORMAL</Badge>;
}

export function LeadsTable() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'all' | 'urgent' | 'idle' | 'new' | 'replied'>('all');

  const query = useQuery({
    queryKey: ['leads', { status, q, page }],
    queryFn: () =>
      api.get<LeadsResponse>(
        `/leads?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&pageSize=25`,
      ),
    placeholderData: (prev) => prev,
  });

  const whatsapp = useMutation({
    mutationFn: async (lead: Lead) => {
      const text =
        `Oi ${lead.name}. Vi seu cadastro no treinamento grátis. ` +
        `Me diz rapidinho: hoje o seu problema é mais equipe que não vende ou faturamento baixo?`;
      const res = await api.post<{ url: string }>(`/leads/${lead.id}/whatsapp`, { text });
      window.open(res.url, '_blank', 'noopener,noreferrer');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        header: 'Pri',
        accessorKey: 'priority',
        cell: ({ row }) => priorityBadge(row.original.priority),
      },
      {
        header: 'Nome',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            <Link className="font-medium hover:underline" href={`/leads/${row.original.id}`}>
              {row.original.name}
            </Link>
            <div className="text-xs text-neutral-500">{row.original.company ?? ''}</div>
          </div>
        ),
      },
      { header: 'Telefone', accessorKey: 'whatsapp', cell: (c) => <span className="text-sm">{String(c.getValue())}</span> },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: (c) => {
          const s = statusBadge(String(c.getValue()));
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      { header: 'Origem', accessorKey: 'source_channel', cell: (c) => <span className="text-xs text-neutral-300">{String(c.getValue())}</span> },
      { header: 'Campanha', accessorKey: 'campaign_id', cell: (c) => <span className="text-xs text-neutral-500">{String(c.getValue() ?? '—')}</span> },
      { header: 'Var', accessorKey: 'variant_id', cell: (c) => <span className="text-xs text-neutral-500">{String(c.getValue() ?? '—')}</span> },
      {
        header: 'Hook',
        accessorKey: 'hook',
        cell: (c) => (
          <div className="max-w-[320px] truncate text-xs text-neutral-300" title={String(c.getValue() ?? '')}>
            {String(c.getValue() ?? '—')}
          </div>
        ),
      },
      {
        header: 'Últ. contato',
        accessorKey: 'last_contact_at',
        cell: (c) => <span className="text-xs text-neutral-300">{idleLabel(String(c.getValue() ?? ''))}</span>,
      },
      {
        header: 'Parado',
        id: 'idle',
        cell: ({ row }) => (
          <span className="text-xs text-neutral-300">{idleLabel(row.original.last_contact_at ?? row.original.created_at)}</span>
        ),
      },
      {
        header: 'Últ. interação',
        id: 'last_interaction',
        cell: ({ row }) => <span className="text-xs text-neutral-300">{lastInteraction(row.original)}</span>,
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => whatsapp.mutate(row.original)}
            disabled={whatsapp.isPending}
          >
            WhatsApp
          </Button>
        ),
      },
    ],
    [whatsapp],
  );

  const table = useReactTable({
    data: (() => {
      const items = query.data?.items ?? [];
      if (view === 'all') return items;

      const now = Date.now();
      const isNew = (l: Lead) => now - new Date(l.created_at).getTime() <= 30 * 60 * 1000; // 30m
      const repliedRecently = (l: Lead) =>
        l.last_inbound_at ? now - new Date(l.last_inbound_at).getTime() <= 30 * 60 * 1000 : false;
      const idleTooLong = (l: Lead) =>
        l.last_contact_at ? now - new Date(l.last_contact_at).getTime() >= 6 * 60 * 60 * 1000 : false; // 6h

      if (view === 'urgent') return items.filter((l) => l.priority >= 2);
      if (view === 'new') return items.filter(isNew);
      if (view === 'replied') return items.filter(repliedRecently);
      if (view === 'idle') return items.filter(idleTooLong);
      return items;
    })(),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = query.data?.total ?? 0;
  const pageSize = query.data?.pageSize ?? 25;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-neutral-400">Terminal operacional: filtra, prioriza, age.</p>
        </div>
        <div className="text-xs text-neutral-500">Total: {total}</div>
      </header>

      <div className="flex gap-2">
        <div className="w-[260px]">
          <Input
            placeholder="Buscar (nome, empresa, telefone)"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <select
          className="h-10 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Todos</option>
          <option value="new">Novo</option>
          <option value="contacted">Contatado</option>
          <option value="replied">Respondeu</option>
          <option value="qualified">Qualificado</option>
          <option value="scheduled">Agendado</option>
          <option value="won">Fechado</option>
          <option value="lost">Perdido</option>
        </select>
        <div className="flex items-center gap-2 pl-1">
          <button
            className={`h-10 rounded-md px-3 text-xs border ${
              view === 'all'
                ? 'bg-neutral-900/60 border-[color:var(--border)] text-white'
                : 'border-transparent text-neutral-400 hover:bg-neutral-900/40'
            }`}
            onClick={() => setView('all')}
          >
            Tudo
          </button>
          <button
            className={`h-10 rounded-md px-3 text-xs border ${
              view === 'urgent'
                ? 'bg-red-950/30 border-red-900/40 text-red-200'
                : 'border-transparent text-neutral-400 hover:bg-neutral-900/40'
            }`}
            onClick={() => setView('urgent')}
            title="Prioridade urgente"
          >
            Urgente
          </button>
          <button
            className={`h-10 rounded-md px-3 text-xs border ${
              view === 'replied'
                ? 'bg-emerald-950/25 border-emerald-900/35 text-emerald-200'
                : 'border-transparent text-neutral-400 hover:bg-neutral-900/40'
            }`}
            onClick={() => setView('replied')}
            title="Respondeu recentemente"
          >
            Respondeu
          </button>
          <button
            className={`h-10 rounded-md px-3 text-xs border ${
              view === 'new'
                ? 'bg-blue-950/25 border-blue-900/35 text-blue-200'
                : 'border-transparent text-neutral-400 hover:bg-neutral-900/40'
            }`}
            onClick={() => setView('new')}
            title="Novos (últimos 30 min)"
          >
            Novos
          </button>
          <button
            className={`h-10 rounded-md px-3 text-xs border ${
              view === 'idle'
                ? 'bg-yellow-950/20 border-yellow-900/35 text-yellow-200'
                : 'border-transparent text-neutral-400 hover:bg-neutral-900/40'
            }`}
            onClick={() => setView('idle')}
            title="Sem contato há 6h+"
          >
            Parados
          </button>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="text-neutral-300"
        >
          Atualizar
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border border-[color:var(--border)]">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-neutral-950/90 backdrop-blur border-b border-[color:var(--border)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {query.isFetching && (query.data?.items?.length ?? 0) === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-neutral-400" colSpan={columns.length}>
                  Carregando…
                </td>
              </tr>
            ) : query.error ? (
              <tr>
                <td className="px-3 py-4 text-sm text-neutral-400" colSpan={columns.length}>
                  Erro ao carregar. Configure token/workspace em Settings.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-sm text-neutral-400" colSpan={columns.length}>
                    Nenhum lead nessa visão. Ajuste filtros ou carregue outra página.
                  </td>
                </tr>
              ) : (
              table.getRowModel().rows.map((row) => {
                const lead = row.original;
                const now = Date.now();
                const idle = lead.last_contact_at ? now - new Date(lead.last_contact_at).getTime() : now - new Date(lead.created_at).getTime();
                const idleHot = idle > 1000 * 60 * 60 * 6; // 6h sem contato = grita
                const isNew = now - new Date(lead.created_at).getTime() <= 30 * 60 * 1000;
                const repliedRecently = lead.last_inbound_at
                  ? now - new Date(lead.last_inbound_at).getTime() <= 30 * 60 * 1000
                  : false;

                return (
                  <tr
                    key={row.id}
                    className={[
                      'border-b border-[color:var(--border)] hover:bg-neutral-900/35',
                      lead.priority >= 2 ? 'bg-red-950/22' : '',
                      repliedRecently ? 'bg-emerald-950/15' : '',
                      isNew ? 'bg-blue-950/12' : '',
                      !repliedRecently && idleHot ? 'bg-yellow-950/10' : '',
                    ].join(' ')}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-1.5 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              }))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>
            Anterior
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
