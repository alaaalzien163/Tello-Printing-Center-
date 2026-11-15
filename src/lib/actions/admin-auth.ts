"use server";

import { isAdminUser } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminLoginError = "invalidCredentials" | "notAuthorized" | "unavailable";

export type AdminLoginResult = { ok: true } | { ok: false; error: AdminLoginError };

/**
 * Server-side password sign-in. Authentication and administrator membership
 * are checked together so a valid non-admin account never keeps a session.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminLoginResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, error: "invalidCredentials" };
  }

  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) return { ok: false, error: "unavailable" };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error || !data.user) {
      return { ok: false, error: "invalidCredentials" };
    }

    const authorized = await isAdminUser(supabase, data.user.id);

    if (!authorized) {
      await supabase.auth.signOut();
      return { ok: false, error: "notAuthorized" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function signOutAdmin(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // The proxy clears invalid session cookies on the next request.
  }
}
