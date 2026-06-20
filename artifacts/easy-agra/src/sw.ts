/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Navigation (HTML pages) — NetworkFirst with offline fallback
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    networkTimeoutSeconds: 4,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  }),
);

// API listing endpoints — StaleWhileRevalidate so offline returns last cache
registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/tourist-places") ||
    url.pathname.startsWith("/api/hotels") ||
    url.pathname.startsWith("/api/restaurants") ||
    url.pathname.startsWith("/api/spas"),
  new StaleWhileRevalidate({
    cacheName: "api-listings",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60, maxEntries: 50 }),
    ],
  }),
);

// Static assets — CacheFirst only for images and fonts (NOT scripts/styles — those are handled by precacheAndRoute)
registerRoute(
  ({ request }) =>
    request.destination === "image" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60, maxEntries: 100 }),
    ],
  }),
);

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try { data = event.data.json(); } catch { data = { body: event.data.text() }; }

  const title = data.title ?? "Easy Agra";
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag ?? "general",
    data: { url: data.url ?? "/" },
    vibrate: [200, 100, 200],
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as any)?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
