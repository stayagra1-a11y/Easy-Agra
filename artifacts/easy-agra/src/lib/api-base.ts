import { Capacitor } from "@capacitor/core";

const NATIVE_API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_API_URL;
  }
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}
