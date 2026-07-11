import { getApiBase } from "@/lib/api-base";
import { Capacitor } from "@capacitor/core";

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
  // Native app: omit credentials (session cookies don't work cross-origin in Capacitor)
  // Web: include credentials for session cookies to work
  const isNative = Capacitor.isNativePlatform();
  const res = await fetch(resolved, {
    credentials: isNative ? "omit" : "include",
    headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data;
}
