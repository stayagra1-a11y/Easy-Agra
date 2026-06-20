import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) view[i] = rawData.charCodeAt(i);
  return buffer;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported] = useState(
    () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
  );

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(() => {});
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      if (permResult !== "granted") return false;

      // Fetch VAPID public key
      const keyRes = await fetch(`${BASE}/api/vapid-public-key`);
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      });

      const subJson = subscription.toJSON();
      await fetch(`${BASE}/api/push-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
        }),
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return true;

      await fetch(`${BASE}/api/push-subscriptions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe };
}
