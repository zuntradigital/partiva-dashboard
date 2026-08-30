import type { Action, Resource } from "@/types";

const STORAGE_KEY = "partiva_admin_session";

export interface StoredSession {
  token: string;
  user: { id: number; name: string; email: string; roles: string[]; permissions: Partial<Record<Resource, Action[]>> };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

// useSyncExternalStore requires getSnapshot() to return a stable reference when
// nothing changed, so the parsed value is cached against the last raw string seen.
let cachedRaw: string | null = null;
let cachedSnapshot: StoredSession | null = null;

export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getSessionSnapshot(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;

  cachedRaw = raw;
  try {
    cachedSnapshot = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    cachedSnapshot = null;
  }
  return cachedSnapshot;
}

export function getServerSessionSnapshot(): StoredSession | null {
  return null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return getSessionSnapshot()?.token ?? null;
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  return getSessionSnapshot();
}

export function setStoredSession(session: StoredSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}
