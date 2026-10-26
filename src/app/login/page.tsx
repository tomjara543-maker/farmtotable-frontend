"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthCard, PasswordInput } from "@/components/AuthCard";
import { DEMO_MODE, SHOW_TEST_ACCOUNTS } from "@/lib/api";
import { login, roleHome, safeNext, useAuth } from "@/lib/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import type { User } from "@/lib/session";

const nextParam = () => safeNext(new URLSearchParams(window.location.search).get("next"));

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goHome = (u: User) => router.replace(nextParam() ?? roleHome[u.role]);

  useEffect(() => {
    if (ready && user && !busy) router.replace(nextParam() ?? roleHome[user.role]);
  }, [ready, user, busy, router]);

  async function signIn(email: string, password: string) {
    setBusy(true);
    setError(null);
    try {
      const session = await login(email, password);
      goHome(session.user);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    signIn(String(data.get("email")).trim(), String(data.get("password")));
  }

  return (
    <AuthCard
      title="Inicia sesión"
      subtitle="Entra para comprar, gestionar tu granja o administrar la plataforma."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-brand hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="label">
          <span>Correo electrónico</span>
          <input name="email" type="email" autoComplete="email" required className="input" autoFocus />
        </label>
        <label className="label">
          <span>Contraseña</span>
          <PasswordInput name="password" autoComplete="current-password" />
        </label>
        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}
        <button className="btn w-full py-2.5" disabled={busy}>
          {busy ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      {SHOW_TEST_ACCOUNTS && (
        <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
          <p className="text-xs font-medium text-muted">{DEMO_MODE ? "Modo demo" : "Datos de ejemplo"} · entra con una cuenta de prueba</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} onClick={() => signIn(a.email, a.password)} disabled={busy} className="btn-ghost flex-col gap-0 px-2 py-2 text-xs">
                <span className="text-lg">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
