import { NextResponse } from "next/server";

import {
  getClientIp,
  getRateLimitSecret,
  hashClientIp,
  isProduction,
} from "@/lib/print-requests/rate-limit";
import { initiatePrintRequest } from "@/lib/print-requests/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  let secret = getRateLimitSecret();

  if (!secret) {
    if (isProduction()) return errorResponse("NOT_CONFIGURED", 503);
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
