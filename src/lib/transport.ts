export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const SHOW_TEST_ACCOUNTS = DEMO_MODE || process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS === "true";

export interface RawResponse {
  status: number;
  body: unknown;
}

const RETRIES = 4;
const RETRY_DELAY_MS = 6000;
const TIMEOUT_MS = 75_000;

export class NetworkError extends Error {}

export async function request(path: string, init: RequestInit = {}): Promise<RawResponse> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (DEMO_MODE) {
    const { mockRequest } = await import("./mock/server");
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    return mockRequest(method, path, body, headers.get("authorization"));
  }

  if (init.body) headers.set("Content-Type", "application/json");
  const retries = method === "GET" ? RETRIES : 0;
  let res: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (![502, 503, 504].includes(res.status) || attempt === retries) break;
    } catch {
      res = undefined;
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  if (!res) {
    throw new NetworkError("No se pudo conectar con el servidor. Puede estar despertando o limitando peticiones; espera un momento y pulsa Actualizar.");
  }
  if (res.status === 429) throw new NetworkError("Demasiadas peticiones seguidas. Espera un momento y pulsa Actualizar.");
  if (res.status === 204) return { status: 204, body: undefined };
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
