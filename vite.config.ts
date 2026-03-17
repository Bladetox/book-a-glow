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
        // New service worker takes control of ALL open tabs immediately
        // after installation — no need for users to close/reopen the app.
        skipWaiting: true,
        clientsClaim: true,

        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Runtime caching: serve Supabase API calls network-first so
        // availability data is always fresh, falling back to cache only
        // if the network is unreachable.
        runtimeCaching: [
          {
            // Supabase REST + RPC endpoints
            urlPattern: /https:\/\/[a-z0-9]+\.supabase\.co\/(rest|rpc)\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60,   // 1-minute fallback cache only
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "NextSlot - Smart Booking for Service Businesses",
        short_name: "NextSlot",
        description: "Smart online booking for South African service businesses",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("date-fns") || id.includes("dayjs")) return "dates";
          return "vendor";
        },
      },
    },
  },
}));
