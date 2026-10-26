import { request } from "./transport";

export type Role = "BUYER" | "PRODUCER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const KEY = "farmtotable.session";
const REFRESH_MARGIN_MS = 30_000;

let cache: Session | null | undefined;
const listeners = new Set<() => void>();

function readStorage(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  if (cache === undefined) cache = readStorage();
  return cache;
}

export function setSession(session: Session | null) {
  cache = session;
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {}
  emit();
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function tokenExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export const isExpiring = (token: string) => tokenExpiresAt(token) - Date.now() < REFRESH_MARGIN_MS;

let refreshing: Promise<Session | null> | null = null;

export function refreshSession(): Promise<Session | null> {
  refreshing ??= withLock(async () => {
    const before = getSession();
    const current = readStorage();
    if (current && before && current.refreshToken !== before.refreshToken && !isExpiring(current.accessToken)) {
      setSession(current);
      return current;
    }
    if (!current) {
      setSession(null);
      return null;
    }
    const res = await request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).catch(() => null);
    if (!res) return current;
    if (res.status !== 200) {
      setSession(null);
      return null;
    }
    const next = res.body as Session;
    setSession(next);
    return next;
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("farmtotable-refresh", fn);
  }
  return fn();
}
