import type { AdminAuthProvider, AdminCredentials, AdminSession } from "@/domain/admin";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  if (!localPart) return "Demo Admin";

  return localPart
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Development-only demo authentication.
 *
 * This accepts any syntactically valid email with an 8+ character password and
 * never verifies credentials. It exists so the dashboard can be explored
 * without a backend. Production must use Supabase Auth and server-side
 * authorization (see README).
 */
export const demoAdminAuth: AdminAuthProvider = {
  async signIn({ email, password }: AdminCredentials): Promise<AdminSession> {
    await wait(450);

    if (!email.trim() || password.length < 8) {
      throw new Error("Enter a valid email and a password of at least 8 characters.");
    }

    return {
      email: email.trim(),
      name: displayNameFromEmail(email.trim()),
      signedInAt: new Date().toISOString(),
    };
  },

  async signOut(): Promise<void> {
    await wait(120);
  },
};
