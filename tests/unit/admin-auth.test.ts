import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInAdmin, signOutAdmin } from "@/lib/actions/admin-auth";
import { displayNameFromEmail, getAdminAccess, isAdminUser } from "@/lib/auth/admin";

const serverModule = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => serverModule);

interface ClaimsFixture {
  data: { claims: { sub?: string; email?: string } } | null;
  error: { code?: string } | null;
}

interface QueryFixture {
  data: { user_id: string } | null;
  error: { code?: string } | null;
}

interface SignInFixture {
  data: { user: { id: string } | null };
  error: { code?: string } | null;
}

function createSupabaseMock({
  claims = { data: null, error: null },
  adminRow = { data: null, error: null },
  signIn = { data: { user: null }, error: null },
}: {
  claims?: ClaimsFixture;
  adminRow?: QueryFixture;
  signIn?: SignInFixture;
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => adminRow),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  const from = vi.fn(() => query);
  const auth = {
    getClaims: vi.fn(async () => claims),
    signInWithPassword: vi.fn(async () => signIn),
    signOut: vi.fn(async () => ({ error: null })),
  };

  return {
    client: { from, auth } as unknown as SupabaseClient,
    from,
    query,
    auth,
  };
}

beforeEach(() => {
  serverModule.createServerSupabaseClient.mockReset();
});

describe("displayNameFromEmail", () => {
  it("creates a readable name from the local part", () => {
    expect(displayNameFromEmail("admin.user@tello.example")).toBe("Admin User");
    expect(displayNameFromEmail("ops-team@tello.example")).toBe("Ops Team");
    expect(displayNameFromEmail("")).toBe("Administrator");
  });
});

describe("isAdminUser", () => {
  it("accepts a UUID present in public.admin_users", async () => {
    const { client, from, query } = createSupabaseMock({
      adminRow: { data: { user_id: "user-1" }, error: null },
    });

    await expect(isAdminUser(client, "user-1")).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("admin_users");
    expect(query.select).toHaveBeenCalledWith("user_id");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects a UUID that is not an administrator", async () => {
    const { client } = createSupabaseMock({
      adminRow: { data: null, error: null },
    });

    await expect(isAdminUser(client, "user-2")).resolves.toBe(false);
  });

  it("denies access and logs only the error code when the lookup fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = createSupabaseMock({
      adminRow: { data: null, error: { code: "42501" } },
    });

    await expect(isAdminUser(client, "user-3")).resolves.toBe(false);
    expect(consoleError).toHaveBeenCalledWith("Admin authorization lookup failed (42501).");
  });
});

describe("getAdminAccess", () => {
  it("returns unauthenticated without verified claims", async () => {
    const { client, from } = createSupabaseMock();
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(getAdminAccess()).resolves.toEqual({ status: "unauthenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when Supabase is not configured", async () => {
    serverModule.createServerSupabaseClient.mockRejectedValue(
      new Error("Supabase is not configured."),
    );

    await expect(getAdminAccess()).resolves.toEqual({ status: "unauthenticated" });
  });

  it("forbids an authenticated user who is not in admin_users", async () => {
    const { client } = createSupabaseMock({
      claims: { data: { claims: { sub: "user-4", email: "user@example.com" } }, error: null },
      adminRow: { data: null, error: null },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(getAdminAccess()).resolves.toEqual({ status: "forbidden" });
  });

  it("authorizes an administrator and builds a session from claims", async () => {
    const { client } = createSupabaseMock({
      claims: {
        data: { claims: { sub: "user-5", email: "admin.user@tello.example" } },
        error: null,
      },
      adminRow: { data: { user_id: "user-5" }, error: null },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    const access = await getAdminAccess();

    expect(access.status).toBe("authorized");
    if (access.status !== "authorized") throw new Error("Expected authorized access");
    expect(access.session.userId).toBe("user-5");
    expect(access.session.email).toBe("admin.user@tello.example");
    expect(access.session.name).toBe("Admin User");
  });
});

describe("signInAdmin", () => {
  it("rejects empty credentials without contacting Supabase", async () => {
    await expect(signInAdmin("", "")).resolves.toEqual({
      ok: false,
      error: "invalidCredentials",
    });
    expect(serverModule.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns unavailable when the server client cannot be created", async () => {
    serverModule.createServerSupabaseClient.mockRejectedValue(
      new Error("Supabase is not configured."),
    );

    await expect(signInAdmin("admin@tello.example", "password123")).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("returns invalidCredentials for a rejected password", async () => {
    const { client } = createSupabaseMock({
      signIn: { data: { user: null }, error: { code: "invalid_credentials" } },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(signInAdmin("admin@tello.example", "wrong-password")).resolves.toEqual({
      ok: false,
      error: "invalidCredentials",
    });
  });

  it("signs out a valid user who is not an administrator", async () => {
    const { client, auth } = createSupabaseMock({
      signIn: { data: { user: { id: "user-6" } }, error: null },
      adminRow: { data: null, error: null },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(signInAdmin("user@example.com", "password123")).resolves.toEqual({
      ok: false,
      error: "notAuthorized",
    });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("returns ok for a valid administrator", async () => {
    const { client } = createSupabaseMock({
      signIn: { data: { user: { id: "user-7" } }, error: null },
      adminRow: { data: { user_id: "user-7" }, error: null },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(signInAdmin("admin@tello.example", "password123")).resolves.toEqual({
      ok: true,
    });
  });
});

describe("signOutAdmin", () => {
  it("clears the Supabase session", async () => {
    const { client, auth } = createSupabaseMock();
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await signOutAdmin();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("does not throw when Supabase is unavailable", async () => {
    serverModule.createServerSupabaseClient.mockRejectedValue(
      new Error("Supabase is not configured."),
    );

    await expect(signOutAdmin()).resolves.toBeUndefined();
  });
});
