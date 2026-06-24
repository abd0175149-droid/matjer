// عميل API موحّد. خادمياً (RSC) يتصل بالباكند داخل شبكة Docker، وفي المتصفح عبر مسار /api (يوجّهه التنل).
const SERVER_BASE = process.env.BACKEND_INTERNAL_URL || 'http://backend:4002';

function baseUrl(): string {
  return typeof window === 'undefined' ? SERVER_BASE : '';
}

async function handle(res: Response) {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error?.message || `خطأ (${res.status})`);
  }
  return json?.data;
}

export async function apiGet<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}/api${path}`, { cache: 'no-store', ...init });
  return handle(res);
}

export async function apiPost<T = any>(path: string, body?: any, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}/api${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  return handle(res);
}

export async function apiSend<T = any>(method: string, path: string, body?: any, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl()}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  return handle(res);
}
