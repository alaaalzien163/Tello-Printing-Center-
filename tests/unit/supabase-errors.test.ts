import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatSupabaseError,
  logSupabaseError,
} from "@/lib/supabase/errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatSupabaseError", () => {
  it("copies diagnostic fields from PostgREST-style error objects", () => {
    expect(
      formatSupabaseError({
        message: 'column "client_token" does not exist',
        code: "42703",
        details: "Perhaps you meant to reference the column",
        hint: "Add the column with a migration",
        status: 400,
      }),
    ).toEqual({
      message: 'column "client_token" does not exist',
      code: "42703",
      details: "Perhaps you meant to reference the column",
      hint: "Add the column with a migration",
      status: 400,
    });
  });

  it("keeps Error messages and status codes", () => {
    const error = Object.assign(new Error("storage unavailable"), {
      code: "STORAGE",
      statusCode: 503,
    });

    expect(formatSupabaseError(error)).toEqual({
      name: "Error",
      message: "storage unavailable",
      code: "STORAGE",
      status: 503,
    });
  });

  it("handles unknown values without throwing", () => {
    expect(formatSupabaseError(null)).toEqual({ message: "Unknown error" });
    expect(formatSupabaseError(undefined)).toEqual({ message: "Unknown error" });
    expect(formatSupabaseError("boom")).toEqual({ message: "boom" });
    expect(formatSupabaseError(42)).toEqual({ message: "42" });
  });
});

describe("logSupabaseError", () => {
  it("logs a structured object instead of [object Object]", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logSupabaseError("[print-requests] request insert failed", {
      message: "insert failed",
      code: "PGRST204",
    });

    expect(spy).toHaveBeenCalledWith("[print-requests] request insert failed", {
      message: "insert failed",
      code: "PGRST204",
    });
    expect(typeof spy.mock.calls[0]?.[1]).toBe("object");
  });
});
