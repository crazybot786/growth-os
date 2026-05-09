import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Sprint 1 (velocidade):
 * - Auth no front via Supabase (anon key)
 * - Token (access_token) é enviado ao backend como Bearer
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } })
    : null;

/**
 * Fallback seguro: não derruba build quando env ainda não está preenchido.
 * (Sprint 1: a configuração pode ser feita depois.)
 */
export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase não configurado (defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  }
  return supabase!;
}
