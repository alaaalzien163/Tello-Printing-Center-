import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashClientIp } from "@/lib/print-requests/rate-limit";

const { initiatePrintRequest } = vi.hoisted(() => ({
  initiatePrintRequest: vi.fn(),
}));

vi.mock("@/lib/print-requests/service", () => ({
  initiatePrintRequest,
}));

import { POST } from "@/app/api/public/print-requests/route";

function submit() {
  return POST(
    new Request("http://localhost/api/public/print-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({
        customerName: "Layla Haddad",
        phone: "+963 944 123 456",
        details: "Please print three copies of the enclosed bracket in PLA.",
        locale: "en",
        submissionId: "11111111-1111-4111-8111-111111111111",
        website: "",
        files: [],
      }),
    }),
  );
}

beforeEach(() => {
  initiatePrintRequest.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/public/print-requests", () => {
  it("returns 503 without upload data when the rate-limit RPC fails", async () => {
    initiatePrintRequest.mockResolvedValue({
      ok: false,
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    });

    const response = await submit();

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBeNull();
    await expect(response.json()).resolves.toEqual({ error: "SERVICE_UNAVAILABLE" });
  });

  it("returns 429 with the retry window when the rate limiter denies", async () => {
    initiatePrintRequest.mockResolvedValue({
      ok: false,
      code: "RATE_LIMITED",
      status: 429,
      retryAfterSeconds: 42,
    });

    const response = await submit();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    await expect(response.json()).resolves.toEqual({ error: "RATE_LIMITED" });
  });

  it("returns the authorized uploads for an accepted request", async () => {
    initiatePrintRequest.mockResolvedValue({
      ok: true,
      requestId: "22222222-2222-4222-8222-222222222222",
      requestNumber: "1001",
      status: "pending",
      uploads: [],
    });

    const response = await submit();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      requestId: "22222222-2222-4222-8222-222222222222",
      requestNumber: "1001",
      status: "pending",
      uploads: [],
    });
  });

  it("returns 503 NOT_CONFIGURED and names the missing rate-limit secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRINT_REQUEST_RATE_LIMIT_SECRET", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await submit();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "NOT_CONFIGURED" });
    expect(initiatePrintRequest).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith("[print-requests] configuration unavailable", {
      reason: "missing-environment-variable",
      variable: "PRINT_REQUEST_RATE_LIMIT_SECRET",
    });

    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain("Layla Haddad");
    expect(logged).not.toContain("+963 944 123 456");
  });

  it("reports a too-short rate-limit secret without logging its value", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRINT_REQUEST_RATE_LIMIT_SECRET", "short-value");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await submit();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "NOT_CONFIGURED" });
    expect(spy).toHaveBeenCalledWith("[print-requests] configuration unavailable", {
      reason: "invalid-environment-variable",
      variable: "PRINT_REQUEST_RATE_LIMIT_SECRET",
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("short-value");
  });

  it("uses the development fallback when no secret is configured outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PRINT_REQUEST_RATE_LIMIT_SECRET", "");
    initiatePrintRequest.mockResolvedValue({
      ok: true,
      requestId: "22222222-2222-4222-8222-222222222222",
      requestNumber: "1001",
      status: "pending",
      uploads: [],
    });

    const response = await submit();

    expect(response.status).toBe(200);
    expect(initiatePrintRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientHash: hashClientIp("203.0.113.10", "development-print-request-rate-limit"),
      }),
    );
  });

  it("hashes the client IP with the configured production secret", async () => {
    const secret = "a-production-secret-that-is-long-enough";
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRINT_REQUEST_RATE_LIMIT_SECRET", secret);
    initiatePrintRequest.mockResolvedValue({
      ok: true,
      requestId: "22222222-2222-4222-8222-222222222222",
      requestNumber: "1001",
      status: "pending",
      uploads: [],
    });

    const response = await submit();

    expect(response.status).toBe(200);
    expect(initiatePrintRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientHash: hashClientIp("203.0.113.10", secret),
      }),
    );
  });
});
