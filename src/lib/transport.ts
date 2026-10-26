export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const SHOW_TEST_ACCOUNTS = DEMO_MODE || process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS === "true";

export interface RawResponse {
  status: number;
  body: unknown;
}

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
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new NetworkError("No se pudo conectar con el API Gateway. ¿Está levantado el backend?");
  }
  if (res.status === 204) return { status: 204, body: undefined };
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
