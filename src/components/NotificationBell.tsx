"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const POLL_MS = 20_000;
const EVENT = "farmtotable:notifications";

export const refreshBell = () => window.dispatchEvent(new Event(EVENT));

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let ignore = false;
    const load = () =>
      api<{ count: number }>("/notifications/unread-count")
        .then((r) => !ignore && setCount(r.count))
        .catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(EVENT, load);
    return () => {
      ignore = true;
      clearInterval(timer);
      window.removeEventListener(EVENT, load);
    };
  }, [pathname]);

  return (
    <Link
      href="/notificaciones"
      className="relative grid size-9 place-items-center rounded-lg text-lg hover:bg-surface-2"
      aria-label={count ? `Notificaciones (${count} sin leer)` : "Notificaciones"}
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
