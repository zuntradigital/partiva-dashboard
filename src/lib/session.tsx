"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import * as api from "@/lib/api";
import {
  clearStoredSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  setStoredSession,
  subscribeToSession,
} from "@/lib/auth-storage";
import { roleNamesToSlugs } from "@/lib/role-mapping";
import type { Action, Resource, RoleName } from "@/types";
import type { StoredSession } from "@/lib/auth-storage";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: RoleName[];
  rawRoles: string[];
  permissions: Partial<Record<Resource, Action[]>>;
  avatarInitials: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function toSessionUser(user: StoredSession["user"]): SessionUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    roles: roleNamesToSlugs(user.roles),
    rawRoles: user.roles,
    permissions: user.permissions,
    avatarInitials: initials(user.name),
  };
}

interface SessionContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (resource: Resource, action: Action) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
  const user = useMemo(() => (stored ? toSessionUser(stored.user) : null), [stored]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    setStoredSession(result);
  }, []);

  const logout = useCallback(() => {
    // Best-effort: clears the server-side last_seen_at immediately so this
    // user stops showing as "online" right away rather than after the
    // online-status window lapses. Local logout must succeed either way.
    api.logout().catch(() => {});
    clearStoredSession();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
      // Super Admin is unrestricted even for dashboard-only gating resources
      // (e.g. "roles_permissions") that have no counterpart in the backend's
      // real permission registry and so never appear in `user.permissions`.
      can: (resource, action) =>
        Boolean(user) && (user!.rawRoles.includes("Super Admin") || Boolean(user!.permissions[resource]?.includes(action))),
    }),
    [user, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
