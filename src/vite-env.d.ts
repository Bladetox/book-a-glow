/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Globals set by scripts loaded at runtime or by older browsers.
interface Window {
  /** canvas-confetti, loaded from CDN by the celebration modals. */
  confetti?: (options?: Record<string, unknown>) => Promise<null> | null;
  /** Safari < 14.1 only exposes the prefixed constructor. */
  webkitAudioContext?: typeof AudioContext;
}
