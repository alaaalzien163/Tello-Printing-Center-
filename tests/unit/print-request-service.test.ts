import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cleanupAbandonedPrintRequests,
  completePrintRequest,
  initiatePrintRequest,
  parseRateLimitResponse,
} from "@/lib/print-requests/service";

const submissionId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const fileId = "33333333-3333-4333-8333-333333333333";

const validInput = {
  customerName: "Layla Haddad",
  phone: "+963 944 123 456",
  details: "Please print three copies of the enclosed bracket in PLA.",
  locale: "en",
  submissionId,
  turnstileToken: "",
  website: "",
  files: [],
};

interface QueryResult {
  data: unknown;
  error: unknown;
  count?: number;
}

interface FakeQuery extends PromiseLike<QueryResult> {
  select: (...args: unknown[]) => FakeQuery;
  insert: (payload: unknown) => FakeQuery;
  update: (payload: unknown) => FakeQuery;
  delete: () => FakeQuery;
  eq: () => FakeQuery;
  neq: () => FakeQuery;
  lt: () => FakeQuery;
  in: () => FakeQuery;
  order: () => FakeQuery;
  limit: () => FakeQuery;
  range: () => FakeQuery;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
}

function query(
  result: QueryResult,
  onInsert?: (payload: unknown) => void,
  onUpdate?: (payload: unknown) => void,
  singleResult?: QueryResult,
): FakeQuery {
  const builder: FakeQuery = {
    select: () => builder,
    insert: (payload: unknown) => {
      onInsert?.(payload);
      return builder;
    },
    update: (payload: unknown) => {
      onUpdate?.(payload);
      return builder;
    },
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    lt: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => Promise.resolve(singleResult ?? result),
    maybeSingle: () => Promise.resolve(result),
    then: <TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };

  return builder;
}

function configureVerification(verifyCaptcha = vi.fn().mockResolvedValue({ ok: true })) {
  return verifyCaptcha;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("initiatePrintRequest", () => {
  it("rejects invalid payloads before touching storage", async () => {
    const supabase = { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } };
    const result = await initiatePrintRequest(
      { ...validInput, phone: "x" },
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_INPUT");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects the honeypot before any database call", async () => {
    const supabase = { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } };
    const result = await initiatePrintRequest(
      { ...validInput, website: "https://spam.example" },
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SPAM");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails closed when the CAPTCHA verifier rejects the submission", async () => {
    const supabase = {
      from: () => query({ data: null, error: null }),
      rpc: vi.fn(),
      storage: { from: vi.fn() },
    };
    const verifyCaptcha = vi.fn().mockResolvedValue({ ok: false, reason: "invalid" });

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CAPTCHA");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("reports a missing CAPTCHA configuration distinctly", async () => {
    const supabase = {
      from: () => query({ data: null, error: null }),
      rpc: vi.fn(),
      storage: { from: vi.fn() },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      {
        supabase: supabase as unknown as SupabaseClient,
        verifyCaptcha: vi.fn().mockResolvedValue({ ok: false, reason: "not_configured" }),
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CAPTCHA_NOT_CONFIGURED");
      expect(result.status).toBe(503);
    }
  });

  it("returns the retry window when the SQL rate limiter refuses the client", async () => {
    const supabase = {
      from: () => query({ data: null, error: null }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ allowed: false, remaining: 0, retry_after_seconds: 42 }],
        error: null,
      }),
      storage: { from: vi.fn() },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("RATE_LIMITED");
      expect(result.status).toBe(429);
      expect(result.retryAfterSeconds).toBe(42);
    }
  });

  it.each([
    ["a legacy boolean true", true],
    ["a legacy boolean false", false],
    ["null data", null],
    ["an empty array", []],
    ["an empty row", [{}]],
    ["a non-boolean allowed value", [{ allowed: "yes" }]],
  ])(
    "fails closed with 503 when the RPC returns %s",
    async (_label, data) => {
      const inserted: Array<{ table: string; payload: unknown }> = [];
      const storageFrom = vi.fn();

      const supabase = {
        from: (table: string) =>
          query(
            { data: null, error: null },
            (payload) => inserted.push({ table, payload }),
          ),
        rpc: vi.fn().mockResolvedValue({ data, error: null }),
        storage: { from: storageFrom },
      };

      const result = await initiatePrintRequest(
        {
          ...validInput,
          files: [{ name: "bracket.stl", size: 1200, type: "model/stl" }],
        },
        { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
        {
          supabase: supabase as unknown as SupabaseClient,
          verifyCaptcha: configureVerification(),
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("SERVICE_UNAVAILABLE");
        expect(result.status).toBe(503);
      }
      expect(inserted).toHaveLength(0);
      expect(storageFrom).not.toHaveBeenCalled();
    },
  );

  it("creates pending requests directly when no files are attached", async () => {
    const inserted: unknown[] = [];

    const supabase = {
      from: (table: string) =>
        query(
          { data: null, error: null },
          (payload) => inserted.push(payload),
          undefined,
          table === "print_requests"
            ? {
                data: {
                  id: requestId,
                  request_number: 1001,
                  status: "pending",
                },
                error: null,
              }
            : undefined,
        ),
      rpc: vi.fn().mockResolvedValue({
        data: [{ allowed: true, remaining: 2, retry_after_seconds: 0 }],
        error: null,
      }),
      storage: { from: vi.fn() },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("pending");
      expect(result.requestNumber).toBe("1001");
      expect(result.uploads).toEqual([]);
    }

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      client_token: submissionId,
      status: "pending",
      file_count: 0,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("consume_print_request_rate_limit", {
      p_ip_hash: "a".repeat(64),
      p_max_requests: 3,
      p_window_seconds: 900,
    });
  });

  it("returns 503 when the privileged client is not configured", async () => {
    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: null, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_CONFIGURED");
      expect(result.status).toBe(503);
    }
  });

  it("fails closed when the idempotency lookup errors", async () => {
    const inserted: unknown[] = [];
    const rpc = vi.fn();

    const supabase = {
      from: () =>
        query(
          {
            data: null,
            error: {
              code: "42703",
              message: 'column "client_token" does not exist',
            },
          },
          (payload) => inserted.push(payload),
        ),
      rpc,
      storage: { from: vi.fn() },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SERVICE_UNAVAILABLE");
      expect(result.status).toBe(503);
      expect(JSON.stringify(result)).not.toContain("client_token");
    }
    expect(inserted).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when the request insert is rejected", async () => {
    const inserted: unknown[] = [];

    const supabase = {
      from: () =>
        query(
          { data: null, error: null },
          (payload) => inserted.push(payload),
          undefined,
          {
            data: null,
            error: {
              code: "PGRST204",
              message: "Could not find the 'file_count' column",
              details: "schema cache",
            },
          },
        ),
      rpc: vi.fn().mockResolvedValue({
        data: [{ allowed: true, remaining: 2, retry_after_seconds: 0 }],
        error: null,
      }),
      storage: { from: vi.fn() },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.status).toBe(500);
      expect(JSON.stringify(result)).not.toContain("file_count");
      expect(JSON.stringify(result)).not.toContain("PGRST204");
    }
    expect(inserted).toHaveLength(1);
  });

  it("fails closed with 503 when the rate-limit RPC errors, without inserting or signing uploads", async () => {
    const inserted: unknown[] = [];
    const storageFrom = vi.fn();

    const supabase = {
      from: (table: string) =>
        query({ data: null, error: null }, (payload) => inserted.push({ table, payload })),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "42703",
          message:
            'column "client_hash" of relation "print_request_rate_limits" does not exist',
        },
      }),
      storage: { from: storageFrom },
    };

    const result = await initiatePrintRequest(
      { ...validInput, files: [{ name: "bracket.stl", size: 1200, type: "model/stl" }] },
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SERVICE_UNAVAILABLE");
      expect(result.status).toBe(503);
      expect(JSON.stringify(result)).not.toContain("client_hash");
      expect(JSON.stringify(result)).not.toContain("42703");
    }
    expect(inserted).toHaveLength(0);
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("fails closed with 503 in production when the rate-limit RPC errors", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const supabase = {
      from: () => query({ data: null, error: null }),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "PGRST202",
          message:
            "Could not find the function public.consume_print_request_rate_limit",
        },
      }),
      storage: { from: vi.fn() },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SERVICE_UNAVAILABLE");
      expect(result.status).toBe(503);
    }
  });

  it("resumes an existing uploading request without consuming a rate-limit attempt", async () => {
    const inserted: unknown[] = [];
    const signedPaths: string[] = [];
    const rpc = vi.fn();

    const supabase = {
      from: (table: string) =>
        table === "print_requests"
          ? query({ data: { id: requestId, request_number: 1005, status: "uploading" }, error: null })
          : query({
              data: [
                {
                  id: fileId,
                  storage_path: `requests/${requestId}/${fileId}.pdf`,
                  original_filename: "drawing.pdf",
                  file_extension: "pdf",
                  mime_type: "application/pdf",
                  size_bytes: 1024,
                  upload_status: "pending",
                },
              ],
              error: null,
            }),
      rpc,
      storage: {
        from: () => ({
          createSignedUploadUrl: async (path: string) => {
            signedPaths.push(path);
            return {
              data: { token: "resume-token", signedUrl: "" },
              error: null,
            };
          },
        }),
      },
    };

    const result = await initiatePrintRequest(
      validInput,
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requestId).toBe(requestId);
      expect(result.requestNumber).toBe("1005");
      expect(result.uploads).toHaveLength(1);
      expect(result.uploads[0]?.token).toBe("resume-token");
    }
    expect(signedPaths).toEqual([`requests/${requestId}/${fileId}.pdf`]);
    expect(rpc).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
  });

  it("does not create a duplicate row when a concurrent submission wins the unique index", async () => {
    let requestLookups = 0;
    const inserted: Array<{ table: string; payload: unknown }> = [];
    const signedPaths: string[] = [];

    const requestBuilder = (): FakeQuery => {
      const builder: FakeQuery = {
        select: () => builder,
        insert: (payload: unknown) => {
          inserted.push({ table: "print_requests", payload });
          return builder;
        },
        update: () => builder,
        delete: () => builder,
        eq: () => builder,
        neq: () => builder,
        lt: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        range: () => builder,
        single: () =>
          Promise.resolve({
            data: null,
            error: {
              code: "23505",
              message: "duplicate key value violates unique constraint",
            },
          }),
        maybeSingle: () =>
          Promise.resolve(
            requestLookups++ === 0
              ? { data: null, error: null }
              : {
                  data: { id: requestId, request_number: 1006, status: "uploading" },
                  error: null,
                },
          ),
        then: <TResult1 = QueryResult, TResult2 = never>(
          onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected),
      };
      return builder;
    };

    const supabase = {
      from: (table: string) =>
        table === "print_requests"
          ? requestBuilder()
          : query({
              data: [
                {
                  id: fileId,
                  storage_path: `requests/${requestId}/${fileId}.pdf`,
                  original_filename: "drawing.pdf",
                  file_extension: "pdf",
                  mime_type: "application/pdf",
                  size_bytes: 1024,
                  upload_status: "pending",
                },
              ],
              error: null,
            }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ allowed: true, remaining: 2, retry_after_seconds: 0 }],
        error: null,
      }),
      storage: {
        from: () => ({
          createSignedUploadUrl: async (path: string) => {
            signedPaths.push(path);
            return { data: { token: "race-token", signedUrl: "" }, error: null };
          },
        }),
      },
    };

    const result = await initiatePrintRequest(
      { ...validInput, files: [{ name: "drawing.pdf", size: 1024, type: "application/pdf" }] },
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requestId).toBe(requestId);
      expect(result.requestNumber).toBe("1006");
      expect(result.uploads[0]?.token).toBe("race-token");
    }
    // The first insert attempt is allowed to reach the database, but the race
    // winner is reused instead of creating a second row.
    expect(inserted).toHaveLength(1);
    expect(signedPaths).toEqual([`requests/${requestId}/${fileId}.pdf`]);
  });

  it("creates uploading requests and returns server-chosen signed upload targets", async () => {
    const inserted: Array<{ table: string; payload: unknown }> = [];
    const signedPaths: string[] = [];

    const files = [
      { name: "bracket.stl", size: 1200, type: "model/stl" },
      { name: "notes.pdf", size: 2400, type: "application/pdf" },
    ];

    const supabase = {
      from: (table: string) => {
        const isRequests = table === "print_requests";
        return query(
          { data: null, error: null },
          (payload) => inserted.push({ table, payload }),
          undefined,
          isRequests
            ? {
                data: {
                  id: requestId,
                  request_number: 1002,
                  status: "uploading",
                },
                error: null,
              }
            : undefined,
        );
      },
      rpc: vi.fn().mockResolvedValue({
        data: [{ allowed: true, remaining: 2, retry_after_seconds: 0 }],
        error: null,
      }),
      storage: {
        from: () => ({
          createSignedUploadUrl: async (path: string) => {
            signedPaths.push(path);
            return { data: { token: `token-${signedPaths.length}`, signedUrl: "" }, error: null };
          },
        }),
      },
    };

    const result = await initiatePrintRequest(
      { ...validInput, files },
      { clientHash: "a".repeat(64), clientIp: "203.0.113.10" },
      { supabase: supabase as unknown as SupabaseClient, verifyCaptcha: configureVerification() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("uploading");
      expect(result.uploads).toHaveLength(2);
      expect(result.uploads[0]?.path).toMatch(
        new RegExp(`^requests/${requestId}/[0-9a-f-]{36}\\.stl$`),
      );
      expect(result.uploads[1]?.path).toMatch(
        new RegExp(`^requests/${requestId}/[0-9a-f-]{36}\\.pdf$`),
      );
      expect(result.uploads[0]?.token).toBe("token-1");
    }

    expect(signedPaths).toHaveLength(2);
    const requestInsert = inserted.find((entry) => entry.table === "print_requests");
    expect(requestInsert?.payload).toMatchObject({ status: "uploading", file_count: 2 });

    const fileInserts = inserted.filter((entry) => entry.table === "print_request_files");
    expect(fileInserts).toHaveLength(2);
    expect(fileInserts[0]?.payload).toMatchObject({
      request_id: requestId,
      original_filename: "bracket.stl",
      file_extension: "stl",
      mime_type: "model/stl",
      size_bytes: 1200,
      upload_status: "pending",
    });
  });
});

describe("completePrintRequest", () => {
  function createCompletionSupabase(options: {
    objects: Array<{ name: string; metadata: { size: number } }>;
    fetchBytes?: Uint8Array;
    signedUrlError?: boolean;
  }) {
    const updates: Array<{ table: string; payload: unknown }> = [];

    const supabase = {
      from: (table: string) => {
        const result: QueryResult =
          table === "print_requests"
            ? {
                data: { id: requestId, request_number: 1003, status: "uploading" },
                error: null,
              }
            : {
                data: [
                  {
                    id: fileId,
                    storage_path: `requests/${requestId}/${fileId}.pdf`,
                    original_filename: "drawing.pdf",
                    file_extension: "pdf",
                    mime_type: "application/pdf",
                    size_bytes: 1024,
                    upload_status: "pending",
                  },
                ],
                error: null,
              };

        return query(result, undefined, (payload) => updates.push({ table, payload }));
      },
      rpc: vi.fn(),
      storage: {
        from: () => ({
          list: async () => ({ data: options.objects, error: null }),
          createSignedUrl: async () =>
            options.signedUrlError
              ? { data: null, error: { message: "storage unavailable" } }
              : {
                  data: { signedUrl: "https://storage.example/signed" },
                  error: null,
                },
        }),
      },
    };

    return { supabase, updates };
  }

  it("refuses to finalize when an expected object is missing", async () => {
    const { supabase, updates } = createCompletionSupabase({ objects: [] });

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UPLOAD_INCOMPLETE");
      expect(result.status).toBe(409);
      expect(result.failedFileIds).toEqual([fileId]);
    }
    expect(updates).toHaveLength(0);
  });

  it("refuses to finalize when the stored size differs", async () => {
    const { supabase } = createCompletionSupabase({
      objects: [{ name: `${fileId}.pdf`, metadata: { size: 999 } }],
    });

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UPLOAD_INCOMPLETE");
  });

  it("refuses to finalize when the stored file signature is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new TextEncoder().encode("not-a-pdf"), {
          status: 206,
          headers: { "content-length": "9" },
        }),
      ),
    );

    const { supabase, updates } = createCompletionSupabase({
      objects: [{ name: `${fileId}.pdf`, metadata: { size: 1024 } }],
    });

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UPLOAD_INCOMPLETE");
      expect(result.status).toBe(409);
      expect(result.failedFileIds).toEqual([fileId]);
    }
    // No request transition or file status update may happen for invalid data.
    expect(updates).toHaveLength(0);
  });

  it("refuses to finalize when the signature sample cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable")),
    );

    const { supabase, updates } = createCompletionSupabase({
      objects: [{ name: `${fileId}.pdf`, metadata: { size: 1024 } }],
    });

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UPLOAD_INCOMPLETE");
      expect(result.status).toBe(409);
      expect(result.failedFileIds).toEqual([fileId]);
    }
    // An unverified upload must stay in `uploading` so the client can retry.
    expect(updates).toHaveLength(0);
  });

  it("refuses to finalize when the signed URL cannot be created", async () => {
    const { supabase, updates } = createCompletionSupabase({
      objects: [{ name: `${fileId}.pdf`, metadata: { size: 1024 } }],
      signedUrlError: true,
    });

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UPLOAD_INCOMPLETE");
      expect(result.status).toBe(409);
      expect(result.failedFileIds).toEqual([fileId]);
    }
    expect(updates).toHaveLength(0);
  });

  it("marks files uploaded and moves the request to pending after verification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new TextEncoder().encode("%PDF-1.7\n"), {
          status: 206,
          headers: { "content-length": "8" },
        }),
      ),
    );

    const { supabase, updates } = createCompletionSupabase({
      objects: [{ name: `${fileId}.pdf`, metadata: { size: 1024 } }],
    });

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result).toEqual({ ok: true, requestNumber: "1003" });
    expect(updates).toContainEqual({
      table: "print_request_files",
      payload: expect.objectContaining({ upload_status: "uploaded" }),
    });
    expect(updates).toContainEqual({
      table: "print_requests",
      payload: expect.objectContaining({ status: "pending", file_count: 1 }),
    });
  });

  it("returns 404 when the request token does not match", async () => {
    const supabase = {
      from: () => query({ data: null, error: null }),
      rpc: vi.fn(),
      storage: { from: vi.fn() },
    };

    const result = await completePrintRequest(
      { requestId, submissionId },
      { supabase: supabase as unknown as SupabaseClient },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });
});

describe("cleanupAbandonedPrintRequests", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");

  it("removes storage objects before deleting an abandoned uploading request", async () => {
    const removedPaths: string[][] = [];
    const deletedIds: string[] = [];
    let requestCalls = 0;

    const supabase = {
      from: (table: string) => {
        if (table === "print_requests") {
          requestCalls += 1;
          if (requestCalls === 1) {
            return query({ data: [{ id: requestId }], error: null });
          }
          return {
            delete: () => ({
              eq: (_column: string, value: string) => {
                deletedIds.push(value);
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        return query({
          data: [{ storage_path: `requests/${requestId}/${fileId}.pdf` }],
          error: null,
        });
      },
      storage: {
        from: () => ({
          remove: async (paths: string[]) => {
            removedPaths.push(paths);
            return { error: null };
          },
        }),
      },
    };

    const removed = await cleanupAbandonedPrintRequests(
      supabase as unknown as SupabaseClient,
      now,
    );

    expect(removed).toBe(1);
    expect(removedPaths).toEqual([[`requests/${requestId}/${fileId}.pdf`]]);
    expect(deletedIds).toEqual([requestId]);
  });

  it("keeps the request row when storage cleanup fails", async () => {
    let deleteCalled = false;
    let requestCalls = 0;

    const supabase = {
      from: (table: string) => {
        if (table === "print_requests") {
          requestCalls += 1;
          if (requestCalls === 1) {
            return query({ data: [{ id: requestId }], error: null });
          }
          return {
            delete: () => {
              deleteCalled = true;
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        return query({
          data: [{ storage_path: `requests/${requestId}/${fileId}.pdf` }],
          error: null,
        });
      },
      storage: {
        from: () => ({
          remove: async () => ({ error: { message: "storage unavailable" } }),
        }),
      },
    };

    const removed = await cleanupAbandonedPrintRequests(
      supabase as unknown as SupabaseClient,
      now,
    );

    expect(removed).toBe(0);
    expect(deleteCalled).toBe(false);
  });

  it("does not touch storage or rows when the abandoned lookup fails", async () => {
    const storageFrom = vi.fn();
    let deleteCalled = false;

    const supabase = {
      from: (table: string) => {
        if (table === "print_requests") {
          return {
            ...query({ data: null, error: { message: "lookup failed" } }),
            delete: () => {
              deleteCalled = true;
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        return query({ data: [], error: null });
      },
      storage: { from: storageFrom },
    };

    const removed = await cleanupAbandonedPrintRequests(
      supabase as unknown as SupabaseClient,
      now,
    );

    expect(removed).toBe(0);
    expect(storageFrom).not.toHaveBeenCalled();
    expect(deleteCalled).toBe(false);
  });

  it("keeps the row when file metadata cannot be read", async () => {
    let deleteCalled = false;
    let requestCalls = 0;

    const supabase = {
      from: (table: string) => {
        if (table === "print_requests") {
          requestCalls += 1;
          if (requestCalls === 1) {
            return query({ data: [{ id: requestId }], error: null });
          }
          return {
            delete: () => {
              deleteCalled = true;
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        return query({ data: null, error: { message: "metadata unavailable" } });
      },
      storage: { from: vi.fn() },
    };

    const removed = await cleanupAbandonedPrintRequests(
      supabase as unknown as SupabaseClient,
      now,
    );

    expect(removed).toBe(0);
    expect(deleteCalled).toBe(false);
  });

  it("removes nothing when there are no abandoned requests", async () => {
    const storageFrom = vi.fn();
    const supabase = {
      from: () => query({ data: [], error: null }),
      storage: { from: storageFrom },
    };

    const removed = await cleanupAbandonedPrintRequests(
      supabase as unknown as SupabaseClient,
      now,
    );

    expect(removed).toBe(0);
    expect(storageFrom).not.toHaveBeenCalled();
  });
});

describe("parseRateLimitResponse", () => {
  it("parses a PostgREST table row", () => {
    expect(
      parseRateLimitResponse([
        { allowed: true, remaining: 2, retry_after_seconds: 0 },
      ]),
    ).toEqual({ ok: true, allowed: true, retryAfterSeconds: 0 });

    expect(
      parseRateLimitResponse([
        { allowed: false, remaining: 0, retry_after_seconds: 42 },
      ]),
    ).toEqual({ ok: true, allowed: false, retryAfterSeconds: 42 });
  });

  it("parses a single row object", () => {
    expect(
      parseRateLimitResponse({
        allowed: false,
        remaining: 0,
        retry_after_seconds: 30,
      }),
    ).toEqual({ ok: true, allowed: false, retryAfterSeconds: 30 });
  });

  it("falls back to the configured window when a denied row omits the retry value", () => {
    expect(parseRateLimitResponse([{ allowed: false }])).toEqual({
      ok: true,
      allowed: false,
      retryAfterSeconds: 900,
    });
  });

  it.each([
    ["a legacy boolean true", true],
    ["a legacy boolean false", false],
    ["null data", null],
    ["an empty array", []],
    ["an empty row", [{}]],
    ["a non-boolean allowed value", [{ allowed: "yes" }]],
    ["a string", "unexpected"],
  ])("rejects %s as an invalid RPC result", (_label, data) => {
    expect(parseRateLimitResponse(data)).toEqual({ ok: false });
  });
});
