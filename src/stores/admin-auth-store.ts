"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AdminSession } from "@/domain/admin";

interface AdminAuthState {
  session: AdminSession | null;
  setSession: (session: AdminSession) => void;
  clearSession: () => void;
}

/**
 * Demo-only admin session. Persisted in sessionStorage so it ends with the
 * browser tab. Phase 2 replaces this with Supabase Auth; no real credentials
 * are stored here.
 */
export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "tello.admin.session.v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => window.sessionStorage),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
