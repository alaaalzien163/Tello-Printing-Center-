"use server";

import { verifyAdminClient } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminPasswordError =
  | "UNAUTHORIZED"
  | "INVALID_CURRENT"
  | "WEAK_PASSWORD"
  | "SAME_PASSWORD"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type AdminPasswordResult =
  | { ok: true }
  | { ok: false; error: AdminPasswordError };

/**
 * Changes the signed-in administrator's password.
 *
 * The current password is verified by re-authenticating the same account
 * before `updateUser()` runs. The request-scoped SSR client writes the
 * refreshed session cookies, and `verifyAdminClient()` keeps non-admin
 * accounts out even if they reach this action directly.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AdminPasswordResult> {
  if (newPassword.length < 8) {
    return { ok: false, error: "WEAK_PASSWORD" };
  }

  if (!currentPassword) {
    return { ok: false, error: "INVALID_CURRENT" };
  }

  if (currentPassword === newPassword) {
    return { ok: false, error: "SAME_PASSWORD" };
  }

  let supabase;

  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return { ok: false, error: "UNKNOWN" };
  }

  try {
    const access = await verifyAdminClient(supabase);
    if (access.status !== "authorized" || !access.session.email) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: access.session.email,
      password: currentPassword,
    });

    if (signInError) {
      if (
        signInError.status === 429 ||
        signInError.code === "over_request_rate_limit"
      ) {
        return { ok: false, error: "RATE_LIMITED" };
      }

      if (
        signInError.code === "invalid_credentials" ||
        signInError.status === 400
      ) {
        return { ok: false, error: "INVALID_CURRENT" };
      }

      return { ok: false, error: "UNKNOWN" };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      if (updateError.code === "weak_password") {
        return { ok: false, error: "WEAK_PASSWORD" };
      }
      if (updateError.code === "same_password") {
        return { ok: false, error: "SAME_PASSWORD" };
      }
      if (updateError.status === 429) {
        return { ok: false, error: "RATE_LIMITED" };
      }

      return { ok: false, error: "UNKNOWN" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "UNKNOWN" };
  }
}
