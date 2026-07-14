import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const isBuild = process.env.NODE_ENV === "production" || process.argv.includes("build");

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

if (!isBuild && (!rawPort || Number.isNaN(port) || port <= 0)) {
  throw new Error(
    `PORT environment variable is required for dev but was not provided or invalid: "${rawPort}"`,
  );
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // runtimeErrorOverlay disabled — was causing false-positive crash overlays
    // in dev on React module reload. Errors still appear in browser console.
    // PWA disabled in production to prevent stale service-worker caching
    // (users were seeing old builds after publish)
    ...(process.env.NODE_ENV !== "production"
      ? [VitePWA({
          registerType: "autoUpdate",
          strategies: "injectManifest",
          srcDir: "src",
          filename: "sw.ts",
          injectRegister: "auto",
          devOptions: { enabled: false },
          manifest: {
            name: "Easy Agra",
            short_name: "Easy Agra",
            description: "Your guide to Agra — Hotels, Restaurants, Spas & Tourism",
            theme_color: "#1a1a2e",
            background_color: "#ffffff",
            display: "standalone",
            start_url: "/",
            scope: "/",
            orientation: "portrait",
            categories: ["travel", "lifestyle"],
            icons: [
              { src: "/icons/icon-72.png",  sizes: "72x72",   type: "image/png" },
              { src: "/icons/icon-96.png",  sizes: "96x96",   type: "image/png" },
              { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
              { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
              { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
              { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
              { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
              { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            screenshots: [
              { src: "/opengraph.jpg", sizes: "1200x630", type: "image/jpeg", form_factor: "wide" },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          },
        })]
      : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  define: {
    __BUILD_TIME__: JSON.stringify(Date.now()),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
