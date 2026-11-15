"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { ActivityEntry } from "@/domain/activity";
import type { AdminProduct } from "@/domain/admin-catalog";
import type { Category } from "@/domain/category";
import type { UserProfile } from "@/domain/profile";
import { loadAdminCatalog } from "@/lib/actions/admin-catalog";
import { getRepositories } from "@/repositories";

interface DemoDataValue {
  products: AdminProduct[];
  categories: Category[];
  activity: ActivityEntry[];
  profile: UserProfile | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const DemoDataContext = createContext<DemoDataValue | null>(null);
const repositories = getRepositories();

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setError(false);
    try {
      const [catalog, nextActivity, nextProfile] = await Promise.all([
        loadAdminCatalog(),
        repositories.activity.list(8),
        repositories.profile.get(),
      ]);

      if (!catalog.ok) {
        setError(true);
        return;
      }

      setProducts(catalog.data.products);
      setCategories(catalog.data.categories);
      setActivity(nextActivity);
      setProfile(nextProfile);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const resetDemo = useCallback(async () => {
    await repositories.demo.reset();
    await reload();
  }, [reload]);

  const value = useMemo<DemoDataValue>(
    () => ({
      products,
      categories,
      activity,
      profile,
      loading,
      error,
      reload,
      resetDemo,
    }),
    [products, categories, activity, profile, loading, error, reload, resetDemo],
  );

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

export function useDemoData(): DemoDataValue {
  const value = useContext(DemoDataContext);
  if (!value) {
    throw new Error("useDemoData must be used inside DemoDataProvider.");
  }
  return value;
}
