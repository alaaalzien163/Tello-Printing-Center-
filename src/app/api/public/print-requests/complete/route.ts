import { NextResponse } from "next/server";

import { completePrintRequest } from "@/lib/print-requests/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const result = await completePrintRequest(body);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.code,
        ...(result.failedFileIds ? { failedFileIds: result.failedFileIds } : {}),
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ requestNumber: result.requestNumber });
}
