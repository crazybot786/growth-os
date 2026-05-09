import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DashboardClient } from './ui';

export default function DashboardPage() {
  // Sprint 1: shell operacional. Dados via TanStack Query no client (sem travar).
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-400">Visão rápida da operação.</p>
        </div>
      </header>

      <DashboardClient />

      <Card>
        <CardHeader className="text-sm font-medium">Atalhos</CardHeader>
        <CardContent className="flex gap-3 text-sm text-neutral-300">
          <span>Leads</span>
          <span className="text-neutral-700">|</span>
          <span>Pipeline</span>
          <span className="text-neutral-700">|</span>
          <span>Campanhas</span>
        </CardContent>
      </Card>
    </div>
  );
}
