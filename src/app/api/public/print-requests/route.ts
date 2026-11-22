import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  getClientIp,
  getRateLimitSecretStatus,
  hashClientIp,
  isProduction,
} from "@/lib/print-requests/rate-limit";
import { initiatePrintRequest } from "@/lib/print-requests/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_SECRET_VARIABLE = "PRINT_REQUEST_RATE_LIMIT_SECRET";

function errorResponse(
  error: string,
  status: number,
  correlationId: string,
  retryAfterSeconds?: number,
) {
  const headers: Record<string, string> = {
    "x-request-id": correlationId,
  };

  if (retryAfterSeconds) {
    headers["Retry-After"] = String(Math.ceil(retryAfterSeconds));
  }

  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: Request) {
  const correlationId = randomUUID();

  const clientIp = getClientIp(request.headers);
  if (!clientIp.ip) {
    // A deployed runtime without Vercel's trusted client-IP header must fail
    // closed instead of giving every request a fresh rate-limit identity.
    console.error("[print-requests] client identity unavailable", {
      correlationId,
      operation: "client-ip",
      reason: "untrusted-request-headers",
    });
    return errorResponse("SERVICE_UNAVAILABLE", 503, correlationId);
  }

  const clientIpAddress = clientIp.ip;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    console.warn("[print-requests] request failed", {
      correlationId,
      operation: "parse-body",
      code: "INVALID_INPUT",
      status: 400,
    });
    return errorResponse("INVALID_INPUT", 400, correlationId);
  }

  const rateLimit = getRateLimitSecretStatus();
  let secret = rateLimit.secret;

  if (!secret) {
    if (isProduction()) {
      // Names and reasons only: never log the value or any request data.
      console.error("[print-requests] configuration unavailable", {
        correlationId,
        operation: "rate-limit-config",
        reason:
          rateLimit.issue === "too-short"
            ? "invalid-environment-variable"
            : "missing-environment-variable",
        variable: RATE_LIMIT_SECRET_VARIABLE,
      });
      return errorResponse("NOT_CONFIGURED", 503, correlationId);
    }
    // Local development and Playwright use a stable non-secret salt so the
    // rate limiter still works without production configuration.
    secret = "development-print-request-rate-limit";
  }

  const result = await initiatePrintRequest(body, {
    clientHash: hashClientIp(clientIpAddress, secret),
    correlationId,
  });

  if (!result.ok) {
    // The service logs the failing operation; this line ties it to the HTTP
    // response without including customer data, secrets or stack traces.
    const logFailure =
      result.status >= 500 ? console.error : console.warn;
    logFailure("[print-requests] request failed", {
      correlationId,
      code: result.code,
      status: result.status,
      ...(result.retryAfterSeconds
        ? { retryAfterSeconds: result.retryAfterSeconds }
        : {}),
    });
    return errorResponse(
      result.code,
      result.status,
      correlationId,
      result.retryAfterSeconds,
    );
  }

  return NextResponse.json(
    {
      requestId: result.requestId,
      requestNumber: result.requestNumber,
      status: result.status,
      uploads: result.uploads,
    },
    { headers: { "x-request-id": correlationId } },
  );
}
