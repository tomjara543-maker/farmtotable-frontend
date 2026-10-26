"use client";

import { useSyncExternalStore } from "react";
import { ApiError } from "./api";
import { getSession, Role, Session, setSession, subscribeSession } from "./session";
import { request } from "./transport";

export const roleLabel: Record<Role, string> = {
  BUYER: "Comprador",
  PRODUCER: "Productor",
  ADMIN: "Administrador",
};

export const roleHome: Record<Role, string> = {
  BUYER: "/catalogo",
  PRODUCER: "/productor",
  ADMIN: "/analitica",
};

async function authRequest(path: string, data: unknown): Promise<Session> {
  const res = await request(path, { method: "POST", body: JSON.stringify(data) }).catch((e: Error) => {
    throw new ApiError(e.message, 0);
  });
  const body = res.body as { error?: unknown } & Session;
  if (res.status >= 400) {
    const message =
      typeof body.error === "string"
        ? body.error
        : Array.isArray(body.error)
          ? (body.error[0] as { message?: string })?.message ?? "Datos inválidos"
          : `Error del servidor (${res.status})`;
    throw new ApiError(message, res.status);
  }
  setSession(body);
  return body;
}

export const login = (email: string, password: string) => authRequest("/auth/login", { email, password });

export const register = (data: { name: string; email: string; password: string; role: "BUYER" | "PRODUCER" }) =>
  authRequest("/auth/register", data);

export async function logout() {
  const session = getSession();
  setSession(null);
  if (session) {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => {});
  }
}

export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribeSession, getSession, () => undefined);
}

export function useAuth() {
  const session = useSession();
  return { user: session?.user ?? null, ready: session !== undefined };
}

export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
