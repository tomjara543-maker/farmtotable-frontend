"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard, PasswordInput } from "@/components/AuthCard";
import { register, roleHome } from "@/lib/auth";

const roles = [
  { value: "BUYER", icon: "🛒", title: "Quiero comprar", text: "Restaurante, tienda o consumidor" },
  { value: "PRODUCER", icon: "🧑‍🌾", title: "Quiero vender", text: "Productor agrícola o granja" },
] as const;

function passwordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < 8) issues.push("al menos 8 caracteres");
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) issues.push("letras y números");
  return issues;
}

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"BUYER" | "PRODUCER">("BUYER");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const issues = passwordIssues(password);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (issues.length) return setError(`La contraseña debe tener ${issues.join(" y ")}`);
    if (data.get("password") !== data.get("confirm")) return setError("Las contraseñas no coinciden");

    setBusy(true);
    setError(null);
    try {
      const session = await register({
        name: String(data.get("name")).trim(),
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
        role,
      });
      router.replace(roleHome[session.user.role]);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Elige cómo vas a usar FarmToTable."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Tipo de cuenta</legend>
          {roles.map((r) => (
            <label
              key={r.value}
              className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${
                role === r.value ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2"
              }`}
            >
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
              <span className="text-2xl">{r.icon}</span>
              <span className="mt-1 block font-semibold">{r.title}</span>
              <span className="block text-xs text-muted">{r.text}</span>
            </label>
          ))}
        </fieldset>
        <label className="label">
          <span>{role === "PRODUCER" ? "Nombre del responsable" : "Nombre o negocio"}</span>
          <input name="name" autoComplete="name" required maxLength={80} className="input" />
        </label>
        <label className="label">
          <span>Correo electrónico</span>
          <input name="email" type="email" autoComplete="email" required className="input" />
        </label>
        <label className="label">
          <span>Contraseña</span>
          <PasswordInput name="password" autoComplete="new-password" minLength={8} onChange={setPassword} />
          {password && (
            <span className={`block text-xs font-normal ${issues.length ? "text-warn" : "text-brand"}`}>
              {issues.length ? `Usa ${issues.join(" y ")}` : "✓ Contraseña válida"}
            </span>
          )}
        </label>
        <label className="label">
          <span>Confirmar contraseña</span>
          <PasswordInput name="confirm" autoComplete="new-password" />
        </label>
        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}
        <button className="btn w-full py-2.5" disabled={busy}>
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
