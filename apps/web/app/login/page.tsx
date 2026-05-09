'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const onLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error('Sessão inválida');
      setToken(token);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-sm font-medium">Entrar</CardHeader>
        <CardContent className="space-y-3">
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
          {error ? <div className="text-xs text-red-300">{error}</div> : null}
          <Button onClick={onLogin} disabled={loading} className="w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
          <div className="text-[11px] text-neutral-500">
            Depois do login, escolha o workspace em <span className="text-neutral-300">Settings</span>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
