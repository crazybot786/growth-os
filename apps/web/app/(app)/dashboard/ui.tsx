'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Summary = {
  leads_total: number;
  reply_rate: number;
  by_status: Record<string, number>;
};

export function DashboardClient() {
  const { data, isFetching, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<Summary>('/dashboard/summary'),
  });

  const statusLine = data
    ? Object.entries(data.by_status)
        .map(([k, v]) => `${k}:${v}`)
        .slice(0, 4)
        .join('  ')
    : '—';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="text-xs text-neutral-500 uppercase tracking-wide">Leads gerados</CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isFetching ? '…' : error ? '—' : data?.leads_total ?? '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-xs text-neutral-500 uppercase tracking-wide">Taxa de resposta</CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isFetching ? '…' : error ? '—' : `${Math.round((data?.reply_rate ?? 0) * 100)}%`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-xs text-neutral-500 uppercase tracking-wide">Leads por status</CardHeader>
          <CardContent className="text-sm text-neutral-300 leading-6">{isFetching ? '…' : statusLine}</CardContent>
        </Card>
        <Card>
          <CardHeader className="text-xs text-neutral-500 uppercase tracking-wide">Operação</CardHeader>
          <CardContent className="text-sm text-neutral-300">
            {error ? 'Configurar token/workspace' : isFetching ? 'Carregando' : 'OK'}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
