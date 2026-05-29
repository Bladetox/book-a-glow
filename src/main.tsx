import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// When a new service worker activates mid-session (skipWaiting + clientsClaim),
// the page still holds references to old chunk URLs that no longer exist in
// the new precache. Force a full reload so the fresh shell + fresh chunks
// are fetched together, preventing the
// "'text/html' is not a valid JavaScript MIME type" error on mobile PWA.
registerSW({
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {},
});

createRoot(document.getElementById("root")!).render(<App />);
