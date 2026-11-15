import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminSession } from "@/domain/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminIdentity extends AdminSession {
  userId: string;
}

export type AdminAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "authorized"; session: AdminIdentity };

export function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  if (!localPart) return "Administrator";

  return localPart
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Confirms that the authenticated user's UUID exists in public.admin_users.
 * This is separate from authentication, and RLS remains the final boundary.
 */
export async function isAdminUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(`Admin authorization lookup failed (${error.code ?? "unknown"}).`);
    return false;
  }

  return Boolean(data?.user_id);
}

/**
 * Verifies the Supabase JWT with getClaims(), then checks administrator
 * membership on the supplied request-scoped client. Never trusts
 * getSession() alone or user-editable metadata.
 */
export async function verifyAdminClient(
  supabase: SupabaseClient,
): Promise<AdminAccess> {
  const unauthenticated: AdminAccess = { status: "unauthenticated" };
  let userId: string | undefined;
  let email = "";

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return unauthenticated;

    userId = data.claims.sub;
    email = typeof data.claims.email === "string" ? data.claims.email : "";
  } catch {
    return unauthenticated;
  }

  if (!(await isAdminUser(supabase, userId))) return { status: "forbidden" };

  return {
    status: "authorized",
    session: {
      userId,
      email,
      name: displayNameFromEmail(email),
      signedInAt: new Date().toISOString(),
    },
  };
}

export async function getAdminAccess(): Promise<AdminAccess> {
  let supabase: SupabaseClient;

  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return { status: "unauthenticated" };
  }

  try {
    return await verifyAdminClient(supabase);
  } catch {
    return { status: "unauthenticated" };
  }
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const access = await getAdminAccess();
  return access.status === "authorized" ? access.session : null;
}
