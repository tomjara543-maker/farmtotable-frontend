"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { patch, Role, User } from "@/lib/api";
import { roleLabel } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { useApi } from "@/lib/useApi";

type AdminUser = User & { active: boolean };

export default function UsersPage() {
  return <RequireRole roles={["ADMIN"]}>{(me) => <Users meId={me.id} />}</RequireRole>;
}

function Users({ meId }: { meId: string }) {
  const { data, error, reload } = useApi<AdminUser[]>("/auth/users");
  const [filter, setFilter] = useState<Role | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function update(u: AdminUser, changes: Partial<Pick<AdminUser, "active" | "role">>, text: string) {
    try {
      await patch(`/auth/users/${u.id}`, changes);
      setNotice({ ok: true, text });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message });
    }
    reload();
  }

  const q = query.trim().toLowerCase();
  const list = (data ?? []).filter(
    (u) => (filter === "ALL" || u.role === filter) && (!q || u.name.toLowerCase().includes(q) || u.email.includes(q)),
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Usuarios" subtitle="Cuentas registradas en el auth-service. Desactivar una cuenta cierra todas sus sesiones." />
      {error && <p className="alert-error">{error}</p>}
      {notice && <p className={notice.ok ? "alert-ok" : "alert-error"}>{notice.text}</p>}

      <div className="flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o correo" className="input max-w-xs" />
        {(["ALL", "BUYER", "PRODUCER", "ADMIN"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`rounded-lg px-3 py-1.5 text-sm ${filter === r ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-surface-2"}`}
          >
            {r === "ALL" ? "Todos" : roleLabel[r]}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Alta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => {
              const self = u.id === meId;
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.name} {self && <span className="badge badge-muted">tú</span>}
                    </p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={self}
                      onChange={(e) => update(u, { role: e.target.value as Role }, `${u.name} ahora es ${roleLabel[e.target.value as Role].toLowerCase()}.`)}
                      className="input w-40 py-1"
                      aria-label={`Rol de ${u.name}`}
                    >
                      {(Object.keys(roleLabel) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {roleLabel[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted">{dateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.active ? "badge-brand" : "badge-muted"}`}>{u.active ? "Activa" : "Desactivada"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!self && (
                      <button
                        onClick={() => update(u, { active: !u.active }, `Cuenta de ${u.name} ${u.active ? "desactivada" : "reactivada"}.`)}
                        className={`text-sm hover:underline ${u.active ? "text-danger" : "text-brand"}`}
                      >
                        {u.active ? "Desactivar" : "Reactivar"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
