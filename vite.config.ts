import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Never cache cross-origin Supabase requests — the service worker
        // cannot copy opaque (cross-origin) responses into the cache and
        // throws cross-origin-copy-response at runtime.
        // NetworkOnly for auth/storage/functions; NetworkFirst for rest/rpc
        // with CORS mode so the response is never opaque.
        runtimeCaching: [
          {
            // Auth, Storage, Edge Functions — must never be served stale
            urlPattern: /https:\/\/[a-z0-9]+\.supabase\.co\/(auth|storage|functions)\//,
            handler: "NetworkOnly",
          },
          {
            // REST + RPC — allow a short-lived cache but only for real 200s
            urlPattern: /https:\/\/[a-z0-9]+\.supabase\.co\/(rest|rpc)\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              fetchOptions: {
                // Ensures the browser sends a CORS request so the response
                // is never opaque — opaque responses cannot be cached.
                mode: "cors",
              },
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60,
              },
              cacheableResponse: {
                // Only cache genuine 200 responses — never status 0 (opaque)
                statuses: [200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "Book Online",
        short_name: "Book Now",
        description: "Online booking powered by NextSlot.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
        passes: 2,
      },
      mangle: {
        toplevel: false,
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("framer-motion"))           return "framer";
          if (id.includes("lucide-react"))             return "icons";
          if (id.includes("@radix-ui"))               return "radix";
          if (id.includes("@supabase"))               return "supabase";
          if (id.includes("@tanstack"))               return "query";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("date-fns") || id.includes("dayjs")) return "dates";
          return "vendor";
        },
      },
    },
  },
}));
