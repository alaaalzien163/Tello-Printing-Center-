import type { ActivityEntry } from "@/domain/activity";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { UserProfile } from "@/domain/profile";

import { seedActivity } from "./seed/activity";
import { seedCategories } from "./seed/categories";
import { seedProducts } from "./seed/products";

export const DEMO_STORAGE_KEY = "tello.demo.v1";
export const DEMO_DATA_VERSION = 1;

export interface DemoState {
  version: number;
  categories: Category[];
  products: Product[];
  activity: ActivityEntry[];
  profile: UserProfile;
}

/** Thrown when the browser refuses to persist demo data (for example, storage quota). */
export class DemoStorageError extends Error {
  constructor(message = "Demo data could not be saved in this browser.", options?: ErrorOptions) {
    super(message, options);
    this.name = "DemoStorageError";
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSeedProfile(): UserProfile {
  return {
    id: "profile-demo",
    name: "Tello Demo Admin",
    email: "demo.admin@tello.example",
    preferredLocale: "en",
    preferredTheme: "system",
    avatarUrl: null,
    role: "Administrator",
    createdAt: "2026-08-01T08:00:00.000Z",
  };
}

export function createInitialDemoState(): DemoState {
  return {
    version: DEMO_DATA_VERSION,
    categories: clone(seedCategories),
    products: clone(seedProducts),
    activity: clone(seedActivity),
    profile: createSeedProfile(),
  };
}

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return (
    candidate.version === DEMO_DATA_VERSION &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.activity) &&
    typeof candidate.profile === "object" &&
    candidate.profile !== null
  );
}

let memoryState: DemoState | null = null;

function readFromStorage(): DemoState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDemoState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeToStorage(state: DemoState): void {
  if (typeof window === "undefined") {
    memoryState = state;
    return;
  }

  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    memoryState = state;
  } catch (error) {
    throw new DemoStorageError(undefined, { cause: error });
  }
}

export function loadDemoState(): DemoState {
  const stored = readFromStorage();
  if (stored) {
    memoryState = stored;
    return stored;
  }

  if (typeof window === "undefined" && memoryState) {
    return memoryState;
  }

  const initial = createInitialDemoState();
  try {
    writeToStorage(initial);
  } catch {
    // The workspace can still be used for this session even if persistence
    // is unavailable; callers will see a storage error on mutations.
    memoryState = initial;
  }
  return initial;
}

export function saveDemoState(state: DemoState): void {
  writeToStorage(state);
}

export function updateDemoState<T>(mutator: (draft: DemoState) => T): T {
  const state = loadDemoState();
  const result = mutator(state);
  saveDemoState(state);
  return result;
}

export function resetDemoState(): DemoState {
  const initial = createInitialDemoState();
  saveDemoState(initial);
  return initial;
}

export function createDemoId(prefix: "prd" | "cat" | "act"): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}
