import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261115130000_print_request_rate_limit_ip_hash.sql",
  ),
  "utf8",
);

const functionDefinition = migration.slice(
  migration.indexOf("create function public.consume_print_request_rate_limit"),
);

describe("rate-limit schema migration", () => {
  it("creates the live ledger columns: ip_hash, window_started_at, request_count, updated_at", () => {
    expect(migration).toContain(
      "create table if not exists private.print_request_rate_limits",
    );
    expect(migration).toMatch(/ip_hash text primary key/);
    expect(migration).toMatch(/window_started_at timestamptz not null default now\(\)/);
    expect(migration).toMatch(/request_count integer not null default 0/);
    expect(migration).toMatch(/updated_at timestamptz not null default now\(\)/);
  });

  it("upgrades legacy development columns in place without deleting counters", () => {
    expect(migration).toContain("rename column client_hash to ip_hash");
    expect(migration).toContain("rename column window_start to window_started_at");
    expect(migration).toContain("add column if not exists updated_at");
    expect(migration).not.toMatch(/\bdrop column\b/i);
    expect(migration).not.toMatch(/\bdelete from\b/i);
    expect(migration).not.toMatch(/\btruncate\b/i);
  });

  it("uses only the live columns inside the RPC", () => {
    expect(functionDefinition).toContain(
      "insert into private.print_request_rate_limits as limits",
    );
    expect(functionDefinition).toContain(
      "(ip_hash, window_started_at, request_count, updated_at)",
    );
    expect(functionDefinition).toContain("on conflict (ip_hash) do nothing");
    expect(functionDefinition).toContain(
      "select limits.window_started_at, limits.request_count",
    );
    expect(functionDefinition).toContain("where limits.ip_hash = p_ip_hash");
    expect(functionDefinition).toMatch(
      /set window_started_at = v_now,\s+request_count = 1,\s+updated_at = v_now\s+where ip_hash = p_ip_hash/,
    );
    expect(functionDefinition).toMatch(
      /set request_count = request_count \+ 1,\s+updated_at = v_now\s+where ip_hash = p_ip_hash/,
    );
    expect(functionDefinition).not.toContain("client_hash");
    expect(functionDefinition).not.toMatch(/\bwindow_start\b/);
  });

  it("preserves the RPC argument names and the table return shape", () => {
    expect(functionDefinition).toMatch(
      /p_ip_hash text,\s+p_max_requests integer default 3,\s+p_window_seconds integer default 900/,
    );
    expect(functionDefinition).toMatch(
      /returns table \(\s*allowed boolean,\s*remaining integer,\s*retry_after_seconds integer\s*\)/,
    );
  });

  it("stays idempotent and asks PostgREST to reload the schema", () => {
    expect(migration).toContain("if not exists");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });
});
