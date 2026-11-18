"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { roleHome, roleLabel, useAuth } from "@/lib/auth";
import type { Role, User } from "@/lib/session";
import { LockIcon } from "@/components/landing/icons";

export default function RequireRole({ roles, children }: { roles?: Role[]; children: (user: User) => ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="card mx-auto max-w-md space-y-3 py-10 text-center">
        <LockIcon size={40} strokeWidth={1.5} className="mx-auto text-brand" />
        <h1 className="text-lg font-semibold">Esta sección no está disponible para tu cuenta</h1>
        <p className="text-sm text-muted">
          Es para {roles.map((r) => roleLabel[r].toLowerCase()).join(" o ")}. Entraste como {roleLabel[user.role].toLowerCase()}.
        </p>
        <Link href={roleHome[user.role]} className="btn">
          Ir a mi inicio
        </Link>
      </div>
    );
  }

  return <>{children(user)}</>;
}
