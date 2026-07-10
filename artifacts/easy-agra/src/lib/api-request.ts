import { getApiBase } from "@/lib/api-base";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function resolveUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
    return url;
  }
  const base = getApiBase();
  if (!base) return url;
  const prefix = base.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${prefix}${path}`;
}

export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {},
): Promise<any> {
  const { body, ...rest } = options;
  const resolved = resolveUrl(url);
  const res = await fetch(resolved, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data;
}
