export interface AdminSession {
  email: string;
  name: string;
  signedInAt: string;
}

export interface AdminCredentials {
  email: string;
  password: string;
}

/**
 * Authentication boundary for the admin area.
 *
 * Phase 2 replaces `demoAdminAuth` with a Supabase-backed implementation
 * without changing the admin UI. Client-side routing is a UX convenience
 * only; real access control must be enforced by RLS and server checks.
 */
export interface AdminAuthProvider {
  signIn(credentials: AdminCredentials): Promise<AdminSession>;
  signOut(): Promise<void>;
}
