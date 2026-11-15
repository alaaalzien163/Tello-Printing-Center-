"use client";

import { createContext, useContext } from "react";

import type { AdminSession } from "@/domain/admin";

const AdminSessionContext = createContext<AdminSession | null>(null);

export function AdminSessionProvider({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  return (
    <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSession {
  const session = useContext(AdminSessionContext);
  if (!session) {
    throw new Error("useAdminSession must be used inside AdminSessionProvider.");
  }
  return session;
}
