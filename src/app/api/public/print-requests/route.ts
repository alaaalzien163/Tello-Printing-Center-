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
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: retryAfterSeconds
        ? { "Retry-After": String(Math.ceil(retryAfterSeconds)) }
        : undefined,
    },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_INPUT", 400);
  }

  const ip = getClientIp(request.headers);
  const rateLimit = getRateLimitSecretStatus();
  let secret = rateLimit.secret;

  if (!secret) {
    if (isProduction()) {
      // Names and reasons only: never log the value or any request data.
      console.error("[print-requests] configuration unavailable", {
        reason:
          rateLimit.issue === "too-short"
            ? "invalid-environment-variable"
            : "missing-environment-variable",
        variable: RATE_LIMIT_SECRET_VARIABLE,
      });
      return errorResponse("NOT_CONFIGURED", 503);
    }
    // Local development and Playwright use a stable non-secret salt so the
    // rate limiter still works without production configuration.
    secret = "development-print-request-rate-limit";
  }

  const result = await initiatePrintRequest(body, {
    clientIp: ip,
    clientHash: hashClientIp(ip, secret),
  });

  if (!result.ok) {
    return errorResponse(result.code, result.status, result.retryAfterSeconds);
  }

  return NextResponse.json({
    requestId: result.requestId,
    requestNumber: result.requestNumber,
    status: result.status,
    uploads: result.uploads,
  });
}
