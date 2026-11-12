"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { ActivityEntry } from "@/domain/activity";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { UserProfile } from "@/domain/profile";
import { getRepositories } from "@/repositories";

interface DemoDataValue {
  products: Product[];
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setError(false);
    try {
      const [nextProducts, nextCategories, nextActivity, nextProfile] = await Promise.all([
        repositories.products.list(),
        repositories.categories.list(),
        repositories.activity.list(8),
        repositories.profile.get(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
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
