import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
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
    legacy({
      targets: ["ios >= 13", "safari >= 13"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    }),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Only allow the app shell to be used as a navigation fallback.
        // Supabase auth redirects and API calls must never hit the fallback.
        navigateFallbackDenylist: [/^\/~oauth/, /\.supabase\.co/],
        // Precache only static assets bundled with the app.
        // Explicitly exclude anything that could resolve to a cross-origin URL.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/supabase/**", "**/*.map"],
        // Hard cap so large cross-origin opaque responses never enter the cache.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // All Supabase traffic (REST, Auth, Storage, Realtime) — never cache.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkOnly",
          },
          {
            // Google Fonts stylesheets — stale-while-revalidate, same-origin only.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            // Google Fonts files — cache-first, long-lived.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
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
