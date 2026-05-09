'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CampaignsClient() {
  const campaignsQ = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<{ campaigns: any[] }>('/campaigns'),
  });
  const variantsQ = useQuery({
    queryKey: ['variants'],
    queryFn: () => api.get<{ variants: any[] }>('/variants'),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Campanhas</h1>
        <p className="text-sm text-neutral-400">Base para tracking profundo (hook, CTA, variante).</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="text-sm font-medium">Campaigns</CardHeader>
          <CardContent className="text-sm text-neutral-300">
            {campaignsQ.isLoading ? 'Carregando…' : campaignsQ.error ? 'Erro (Settings)' : null}
            <ul className="mt-2 space-y-2">
              {(campaignsQ.data?.campaigns ?? []).map((c) => (
                <li key={c.id} className="rounded-md border border-neutral-900 p-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-neutral-500">{c.channel}</div>
                </li>
              ))}
              {(campaignsQ.data?.campaigns ?? []).length === 0 && !campaignsQ.isLoading ? (
                <li className="text-xs text-neutral-500">Sem campanhas ainda.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-sm font-medium">Variantes</CardHeader>
          <CardContent className="text-sm text-neutral-300">
            {variantsQ.isLoading ? 'Carregando…' : variantsQ.error ? 'Erro (Settings)' : null}
            <ul className="mt-2 space-y-2">
              {(variantsQ.data?.variants ?? []).map((v) => (
                <li key={v.id} className="rounded-md border border-neutral-900 p-3">
                  <div className="text-xs text-neutral-500">{v.version} · {v.cta}</div>
                  <div className="text-sm font-medium">{v.hook}</div>
                </li>
              ))}
              {(variantsQ.data?.variants ?? []).length === 0 && !variantsQ.isLoading ? (
                <li className="text-xs text-neutral-500">Sem variantes ainda.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

