import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changeAdminPassword } from "@/lib/actions/admin-password";
import { createPasswordChangeSchema } from "@/schemas/admin-password";

const serverModule = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => serverModule);

interface AuthErrorFixture {
  code?: string;
  status?: number;
  message?: string;
}

interface ClaimsFixture {
  data: { claims: { sub?: string; email?: string } } | null;
  error: AuthErrorFixture | null;
}

interface QueryFixture {
  data: { user_id: string } | null;
  error: AuthErrorFixture | null;
}

interface AuthResultFixture {
  data: { user: { id: string } | null };
  error: AuthErrorFixture | null;
}

function createSupabaseMock({
  claims = { data: null, error: null },
  adminRow = { data: null, error: null },
  signIn = { data: { user: { id: "user-1" } }, error: null },
  update = { data: { user: { id: "user-1" } }, error: null },
}: {
  claims?: ClaimsFixture;
  adminRow?: QueryFixture;
  signIn?: AuthResultFixture;
  update?: AuthResultFixture;
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
    updateUser: vi.fn(async () => update),
  };

  return {
    client: { from, auth } as unknown as SupabaseClient,
    from,
    query,
    auth,
  };
}

const authorized = {
  claims: {
    data: { claims: { sub: "user-1", email: "admin@tello.example" } },
    error: null,
  },
  adminRow: { data: { user_id: "user-1" }, error: null },
} as const;

beforeEach(() => {
  serverModule.createServerSupabaseClient.mockReset();
});

describe("password change schema", () => {
  const schema = createPasswordChangeSchema((key) => key);

  it("accepts a matching new password of at least 8 characters", () => {
    const result = schema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmPassword: "new-password",
    });

    expect(result.success).toBe(true);
  });

  it("requires at least 8 characters", () => {
    const result = schema.safeParse({
      currentPassword: "old-password",
      newPassword: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe("passwordMin");
  });

  it("requires matching confirmation", () => {
    const result = schema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(result.error.issues[0]?.message).toBe("passwordConfirmMismatch");
  });

  it("rejects an unchanged password", () => {
    const result = schema.safeParse({
      currentPassword: "same-password",
      newPassword: "same-password",
      confirmPassword: "same-password",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["newPassword"]);
    expect(result.error.issues[0]?.message).toBe("passwordSame");
  });
});

describe("changeAdminPassword", () => {
  it("rejects a short password without contacting Supabase", async () => {
    await expect(
      changeAdminPassword("old-password", "short"),
    ).resolves.toEqual({ ok: false, error: "WEAK_PASSWORD" });
    expect(serverModule.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects an unchanged password without contacting Supabase", async () => {
    await expect(
      changeAdminPassword("same-password", "same-password"),
    ).resolves.toEqual({ ok: false, error: "SAME_PASSWORD" });
    expect(serverModule.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns UNKNOWN when the server client cannot be created", async () => {
    serverModule.createServerSupabaseClient.mockRejectedValue(
      new Error("Supabase is not configured."),
    );

    await expect(
      changeAdminPassword("old-password", "new-password"),
    ).resolves.toEqual({ ok: false, error: "UNKNOWN" });
  });

  it("denies an authenticated non-admin account", async () => {
    const { client, auth } = createSupabaseMock({
      claims: {
        data: { claims: { sub: "user-2", email: "user@example.com" } },
        error: null,
      },
      adminRow: { data: null, error: null },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      changeAdminPassword("old-password", "new-password"),
    ).resolves.toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns INVALID_CURRENT when re-authentication fails", async () => {
    const { client } = createSupabaseMock({
      ...authorized,
      signIn: {
        data: { user: null },
        error: { code: "invalid_credentials", status: 400 },
      },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      changeAdminPassword("wrong-password", "new-password"),
    ).resolves.toEqual({ ok: false, error: "INVALID_CURRENT" });
  });

  it("maps re-authentication rate limits", async () => {
    const { client } = createSupabaseMock({
      ...authorized,
      signIn: {
        data: { user: null },
        error: { code: "over_request_rate_limit", status: 429 },
      },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      changeAdminPassword("old-password", "new-password"),
    ).resolves.toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("maps a weak password returned by Supabase", async () => {
    const { client } = createSupabaseMock({
      ...authorized,
      update: {
        data: { user: null },
        error: { code: "weak_password", status: 422 },
      },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      changeAdminPassword("old-password", "new-password"),
    ).resolves.toEqual({ ok: false, error: "WEAK_PASSWORD" });
  });

  it("re-authenticates with the session email and updates the password", async () => {
    const { client, auth } = createSupabaseMock(authorized);
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      changeAdminPassword("old-password", "new-password"),
    ).resolves.toEqual({ ok: true });

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@tello.example",
      password: "old-password",
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });

  it("returns UNKNOWN for an unexpected update failure", async () => {
    const { client } = createSupabaseMock({
      ...authorized,
      update: {
        data: { user: null },
        error: { code: "unexpected_failure", status: 500 },
      },
    });
    serverModule.createServerSupabaseClient.mockResolvedValue(client);

    await expect(
      changeAdminPassword("old-password", "new-password"),
    ).resolves.toEqual({ ok: false, error: "UNKNOWN" });
  });
});
