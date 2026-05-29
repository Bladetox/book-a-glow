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
        runtimeCaching: [
          {
            // All Supabase traffic must bypass the cache entirely.
            // Caching cross-origin responses causes cross-origin-copy-response.
            urlPattern: /https:\/\/[a-z0-9]+\.supabase\.co\//,
            handler: "NetworkOnly",
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
