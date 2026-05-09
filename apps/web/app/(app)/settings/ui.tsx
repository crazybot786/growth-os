'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { getSupabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SettingsClient() {
  const { token, workspaceId, setToken, setWorkspaceId, clear } = useAuthStore();
  const [t, setT] = useState(token);
  const [w, setW] = useState(workspaceId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wsList, setWsList] = useState<Array<{ workspace_id: string; role: string | null; name: string }>>([]);
  const [msg, setMsg] = useState<string>('');

  return (
    <div className="max-w-2xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-400">
          Sprint 1: configuração rápida para operar (token + workspace). Sem fricção.
        </p>
      </header>

      <Card>
        <CardHeader className="text-sm font-medium">Login (Supabase)</CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-neutral-400">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-neutral-400">Senha</div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setMsg('');
                try {
                  const supabase = getSupabase();
                  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                  if (error) return setMsg(error.message);
                  const accessToken = data.session?.access_token ?? '';
                  setToken(accessToken);
                  setT(accessToken);
                  setMsg('Login OK. Agora carregue seus workspaces.');
                } catch (e: any) {
                  setMsg(e?.message ?? 'Supabase não configurado');
                }
              }}
            >
              Entrar
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const supabase = getSupabase();
                  await supabase.auth.signOut();
                } catch {
                  // ignore
                }
                clear();
                setT('');
                setW('');
                setMsg('Logout OK.');
              }}
            >
              Sair
            </Button>
          </div>
          {msg ? <div className="text-xs text-neutral-400">{msg}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-medium">Credenciais</CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs text-neutral-400">Supabase Access Token (Bearer)</div>
            <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="eyJhbGciOi..." />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-400">Workspace ID (x-workspace-id)</div>
            <Input value={w} onChange={(e) => setW(e.target.value)} placeholder="uuid" />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setToken(t.trim());
                setWorkspaceId(w.trim());
              }}
            >
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => clear()}>
              Limpar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500">Workspaces</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                setMsg('');
                try {
                  const res = await api.get<{ workspaces: Array<{ workspace_id: string; role: string | null; name: string }> }>(
                    '/workspaces',
                  );
                  setWsList(res.workspaces ?? []);
                } catch {
                  setMsg('Erro ao carregar workspaces. Verifique token.');
                }
              }}
            >
              Carregar
            </Button>
          </div>
          <div className="space-y-2">
            {wsList.map((ws) => (
              <button
                key={ws.workspace_id}
                className="w-full text-left rounded-md border border-neutral-900 p-3 hover:bg-neutral-900/40"
                onClick={() => {
                  setWorkspaceId(ws.workspace_id);
                  setW(ws.workspace_id);
                  setMsg(`Workspace selecionado: ${ws.name}`);
                }}
              >
                <div className="text-sm font-medium">{ws.name}</div>
                <div className="text-xs text-neutral-500">{ws.workspace_id}</div>
              </button>
            ))}
            {wsList.length === 0 ? <div className="text-xs text-neutral-600">Nenhum workspace carregado ainda.</div> : null}
          </div>

          <div className="text-xs text-neutral-500">
            API base: <span className="text-neutral-300">{process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
