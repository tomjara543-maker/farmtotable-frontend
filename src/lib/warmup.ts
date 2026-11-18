import { API_URL, DEMO_MODE } from "./transport";

const KEY = "farmtotable.warmup";
const FRESH_MS = 10 * 60_000;
const PATHS = [
  "/products",
  "/producers",
  "/auth/me",
  "/orders/mine",
  "/inventory/stock",
  "/deliveries/mine",
  "/payments/mine",
  "/notifications/unread-count",
  "/analytics/dashboard",
  "/pricing/rules",
];

function recentlyWarmed() {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < FRESH_MS;
  } catch {
    return false;
  }
}

export async function warmUp(): Promise<void> {
  if (DEMO_MODE || recentlyWarmed()) return;
  const ping = (path: string) =>
    fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(90_000) }).catch(() => undefined);
  await ping("/products");
  await Promise.all(PATHS.map(ping));
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {}
}
