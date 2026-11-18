"use client";

import Link from "next/link";
import { refreshBell } from "@/components/NotificationBell";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { Notification, post } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { notificationIcon } from "@/lib/labels";
import { useApi } from "@/lib/useApi";
import { BellIcon } from "@/components/landing/icons";

export default function NotificationsPage() {
  return <RequireRole>{() => <Notifications />}</RequireRole>;
}

function Notifications() {
  const { data, error, reload } = useApi<Notification[]>("/notifications/mine");
  const unread = data?.filter((n) => !n.read).length ?? 0;

  async function markRead(n: Notification) {
    if (n.read) return;
    await post(`/notifications/${n.id}/read`).catch(() => {});
    reload();
    refreshBell();
  }

  async function markAll() {
    await post("/notifications/read-all").catch(() => {});
    reload();
    refreshBell();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notificaciones"
        subtitle={unread ? `Tienes ${unread} sin leer.` : "Estás al día."}
        action={
          unread > 0 && (
            <button onClick={markAll} className="btn-ghost">
              Marcar todas como leídas
            </button>
          )
        }
      />
      {error && <p className="alert-error">{error}</p>}
      {!data && !error && <div className="card h-40 animate-pulse bg-surface-2" />}
      {data?.length === 0 && (
        <div className="card py-12 text-center">
          <BellIcon size={40} strokeWidth={1.5} className="mx-auto text-brand" />
          <p className="mt-3 text-muted">No tienes notificaciones.</p>
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="card divide-y divide-line p-0">
          {data.map((n) => (
            <li key={n.id} className={`flex gap-4 p-4 ${n.read ? "" : "bg-brand-soft/40"}`}>
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-brand">
                {(() => { const Ic = notificationIcon[n.type]; return <Ic size={20} />; })()}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={n.read ? "font-medium" : "font-semibold"}>{n.title}</p>
                  {!n.read && <span className="size-2 rounded-full bg-accent" aria-label="Sin leer" />}
                </div>
                <p className="text-sm text-muted">{n.body}</p>
                <p className="text-xs text-muted">{timeAgo(n.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                {n.link && (
                  <Link href={n.link} onClick={() => markRead(n)} className="font-medium text-brand hover:underline">
                    Ver
                  </Link>
                )}
                {!n.read && (
                  <button onClick={() => markRead(n)} className="text-xs text-muted hover:text-fg">
                    Marcar leída
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
