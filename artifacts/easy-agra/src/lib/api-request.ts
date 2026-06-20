type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {},
): Promise<any> {
  const { body, ...rest } = options;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data;
}
