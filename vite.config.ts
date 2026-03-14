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
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
          // Supabase
          if (id.includes("@supabase")) return "supabase";
          // React core
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "react";
          // Router
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";
          // Animation
          if (id.includes("framer-motion")) return "framer";
          // Radix UI / shadcn
          if (id.includes("@radix-ui")) return "radix";
          // Charts
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          // Date utilities
          if (id.includes("date-fns") || id.includes("dayjs")) return "dates";
          // Icons
          if (id.includes("lucide-react")) return "icons";
          // Query
          if (id.includes("@tanstack")) return "query";
          // Everything else in node_modules
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
}));
