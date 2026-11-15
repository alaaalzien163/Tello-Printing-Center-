/**
 * Converts unknown Supabase, PostgREST and Storage errors into a structured,
 * log-safe object.
 *
 * Keep this formatter free of credentials: it only copies diagnostic fields
 * (`message`, `code`, `details`, `hint`, `status`) and never serializes the
 * request headers, keys or stack traces.
 */
export interface FormattedSupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  name?: string;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function formatSupabaseError(error: unknown): FormattedSupabaseError {
  if (error === null || error === undefined) {
    return { message: "Unknown error" };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    const record = error as Error & Record<string, unknown>;
    const code = asString(record.code) ?? asString(record.error_code);
    const details = asString(record.details);
    const hint = asString(record.hint);
    const status = asNumber(record.status) ?? asNumber(record.statusCode);

    return {
      name: error.name,
      message: error.message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
      ...(hint ? { hint } : {}),
      ...(status !== undefined ? { status } : {}),
    };
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const name = asString(record.name);
    const code = asString(record.code) ?? asString(record.error_code);
    const details = asString(record.details);
    const hint = asString(record.hint);
    const status = asNumber(record.status) ?? asNumber(record.statusCode);

    return {
      message: asString(record.message) ?? "Unknown error",
      ...(name ? { name } : {}),
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
      ...(hint ? { hint } : {}),
      ...(status !== undefined ? { status } : {}),
    };
  }

  return { message: String(error) };
}

/** Logs a structured diagnostic object instead of interpolating `[object Object]`. */
export function logSupabaseError(scope: string, error: unknown): void {
  console.error(scope, formatSupabaseError(error));
}
