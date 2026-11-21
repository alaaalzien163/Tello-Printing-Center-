import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { completePrintRequest } from "@/lib/print-requests/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  error: string,
  status: number,
  correlationId: string,
  failedFileIds?: string[],
) {
  return NextResponse.json(
    {
      error,
      ...(failedFileIds ? { failedFileIds } : {}),
    },
    {
      status,
      headers: { "x-request-id": correlationId },
    },
  );
}

export async function POST(request: Request) {
  const correlationId = randomUUID();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    console.warn("[print-requests] completion failed", {
      correlationId,
      operation: "parse-body",
      code: "INVALID_INPUT",
      status: 400,
    });
    return errorResponse("INVALID_INPUT", 400, correlationId);
  }

  const result = await completePrintRequest(body, { correlationId });

  if (!result.ok) {
    const logFailure =
      result.status >= 500 ? console.error : console.warn;
    logFailure("[print-requests] completion failed", {
      correlationId,
      code: result.code,
      status: result.status,
    });
    return errorResponse(
      result.code,
      result.status,
      correlationId,
      result.failedFileIds,
    );
  }

  return NextResponse.json(
    { requestNumber: result.requestNumber },
    { headers: { "x-request-id": correlationId } },
  );
}
