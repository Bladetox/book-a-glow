import { useLayoutEffect } from "react";

/**
 * Paints the whole page surface (html, body, iOS/Android status bar and the
 * Safari bottom-toolbar region) one solid colour while an app shell is
 * mounted, so no white bars show above, below or beside it on any screen size.
 *
 * The global stylesheet pads <body> by the top safe-area inset (so tenant
 * booking pages sit below the notch). Shells paint under the notch themselves,
 * so the top padding is zeroed here and the shell header adds the inset.
 * Everything is restored on unmount.
 */
export function useShellBackground(color: string) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    const prev = {
      htmlBg: html.style.background,
      htmlScheme: html.style.colorScheme,
      bodyBg: body.style.getPropertyValue("background"),
      bodyBgPriority: body.style.getPropertyPriority("background"),
      bodyPadTop: body.style.paddingTop,
      bodyTransition: body.style.transition,
      meta: meta?.getAttribute("content") ?? null,
    };

    html.style.background = color;
    html.style.colorScheme = "dark";
    body.style.setProperty("background", color, "important");
    body.style.paddingTop = "0px";
    body.style.transition = "none";
    meta?.setAttribute("content", color);

    return () => {
      html.style.background = prev.htmlBg;
      html.style.colorScheme = prev.htmlScheme;
      if (prev.bodyBg) body.style.setProperty("background", prev.bodyBg, prev.bodyBgPriority);
      else body.style.removeProperty("background");
      body.style.paddingTop = prev.bodyPadTop;
      body.style.transition = prev.bodyTransition;
      if (meta && prev.meta !== null) meta.setAttribute("content", prev.meta);
    };
  }, [color]);
}
