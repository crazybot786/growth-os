import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const canInitSupabase = isValidHttpUrl(supabaseUrl) && !!supabaseAnonKey;

/**
 * Sprint 1 (velocidade):
 * - Auth no front via Supabase (anon key)
 * - Token (access_token) é enviado ao backend como Bearer
 */
export const supabase =
  canInitSupabase
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } })
    : null;

/**
 * Fallback seguro: não derruba build quando env ainda não está preenchido.
 * (Sprint 1: a configuração pode ser feita depois.)
 */
export function getSupabase() {
  if (!canInitSupabase) {
    throw new Error(
      'Supabase não configurado (defina NEXT_PUBLIC_SUPABASE_URL com http(s) e NEXT_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase!;
}
