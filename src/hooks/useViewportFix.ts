/**
 * useViewportFix
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes the iOS Safari virtual keyboard layout problem.
 *
 * On Android, `interactive-widget=resizes-content` in the viewport meta tag
 * makes the layout viewport shrink when the keyboard opens — position:fixed
 * elements like StickyBottomBar move up naturally. Done.
 *
 * iOS Safari ignores interactive-widget entirely. The layout viewport never
 * shrinks. position:fixed elements stay at the original screen bottom, hidden
 * behind the keyboard. The browser shifts the visual viewport upward to reveal
 * the focused input — causing the "jump" that clients experience.
 *
 * THE FIX
 * ───────
 * We listen to window.visualViewport resize events.
 * When keyboard opens, visualViewport.height shrinks.
 * We set --keyboard-height on :root = how many px the keyboard covers.
 * StickyBottomBar reads this var and translateY's itself above the keyboard.
 *
 * Only runs on iOS — Android is handled entirely by CSS.
 */

import { useEffect, useState } from "react";

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

export function useViewportFix() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;

    // Set initial CSS vars immediately — prevents flash on first render
    if (vv) {
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        `${vv.height}px`
      );
      document.documentElement.style.setProperty("--keyboard-height", "0px");
    }

    // Android: interactive-widget=resizes-content handles the layout in CSS.
    // Only the JS listener is needed on iOS where CSS can't fix it.
    if (!isIOS() || !vv) return;

    let rafId: number;

    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const visualH = vv.height;
        const windowH = window.innerHeight;

        // Keyboard height = window height minus visible area, minus a small
        // offset for the browser chrome that may also be present.
        // Threshold of 100px distinguishes keyboard from address bar changes.
        const raw = windowH - visualH;
        const kbHeight = raw > 100 ? raw : 0;
        const isOpen = kbHeight > 0;

        document.documentElement.style.setProperty(
          "--visual-viewport-height",
          `${visualH}px`
        );
        document.documentElement.style.setProperty(
          "--keyboard-height",
          `${kbHeight}px`
        );

        setKeyboardOpen(isOpen);
      });
    };

    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);

    return () => {
      cancelAnimationFrame(rafId);
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, []);

  return { keyboardOpen };
}
