import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Wires up the vite-plugin-pwa service worker lifecycle.
 *
 * Behaviour:
 *  - Fresh install  : silent (offline-ready fires but we don't annoy the user).
 *  - Update waiting : shows a persistent toast with a "Refresh" button.
 *    Clicking calls updateSW(true) which tells the waiting SW to skipWaiting
 *    then reloads the page — all browsers including Safari converge immediately.
 *  - Safari polling : registration.update() is called every 60 s because Safari
 *    only checks for SW updates passively (every 24 h), unlike Chrome.
 *
 * Mount this ONCE inside <BrowserRouter> so the toast context is available.
 * It renders nothing to the DOM.
 */
export const PwaUpdater = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Dynamic import keeps this out of SSR / test bundles cleanly.
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        registerSW({
          // Called when a new SW has finished installing and is waiting to activate.
          onNeedRefresh(updateSW) {
            const { dismiss } = toast({
              title: "Update available",
              description: "A new version of the app is ready.",
              duration: 0, // keep open until the user acts
              action: (
                <button
                  className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                  onClick={() => {
                    dismiss();
                    // true = reload the page after the new SW activates
                    updateSW(true);
                  }}
                >
                  Refresh now
                </button>
              ),
            });
          },

          // Fires when the app is offline-ready (first install or update complete).
          // Kept intentionally silent — no need to tell users about offline support.
          onOfflineReady() {},

          // Fires after the SW is registered. We use this to set up the Safari
          // polling interval since Safari won't trigger update checks automatically.
          onRegisteredSW(_swUrl, registration) {
            if (!registration) return;

            // Proactively check for a new SW every 60 seconds.
            // Chrome does this on every navigation; Safari does not.
            const intervalId = setInterval(() => {
              registration.update().catch(() => {
                // Silently ignore — e.g. Safari private mode, offline
              });
            }, 60_000);

            // Clean up the interval if the component ever unmounts (defensive).
            return () => clearInterval(intervalId);
          },
        });
      })
      .catch(() => {
        // virtual:pwa-register is not available in dev mode or test — ignore.
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
