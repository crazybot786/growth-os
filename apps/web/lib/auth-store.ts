import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  token: string;
  workspaceId: string;
  setToken: (token: string) => void;
  setWorkspaceId: (workspaceId: string) => void;
  clear: () => void;
};

/**
 * Sprint 1 (velocidade operacional):
 * guarda Token (Supabase) + Workspace ID para chamadas na API.
 * Futuro: substituir por sessão Supabase SSR sem quebrar contratos.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: '',
      workspaceId: '',
      setToken: (token) => set({ token }),
      setWorkspaceId: (workspaceId) => set({ workspaceId }),
      clear: () => set({ token: '', workspaceId: '' }),
    }),
    { name: 'growthos-auth' },
  ),
);

