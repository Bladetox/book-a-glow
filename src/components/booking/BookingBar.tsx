import { useEffect, useRef, type ReactNode } from "react";

interface BookingBarProps {
  children: ReactNode;
  /** Set when the bar is portalled outside the booking shell, so it carries the style scope itself. */
  standalone?: boolean;
}

/**
 * The fixed action bar at the bottom of every booking step.
 *
 * It owns two pieces of layout plumbing so callers only supply content:
 *
 * 1. --bottom-bar-height is kept equal to the bar's rendered height, which the
 *    scroll body in Book.tsx uses as bottom padding. The observer is created
 *    per mount, so a bar that is hidden and shown again (iOS keyboard, moving
 *    between steps) always reports its live height.
 *
 * 2. On iOS the layout viewport does not shrink when the keyboard opens, so a
 *    fixed bar would sit behind it. useViewportFix publishes --keyboard-height
 *    and the bar lifts itself by that amount. Android resizes the layout
 *    viewport itself (interactive-widget=resizes-content), where the variable
 *    stays 0px.
 */
const BookingBar = ({ children, standalone = false }: BookingBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty("--bottom-bar-height", `${el.offsetHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      className={standalone ? "booking-app bk-bar" : "bk-bar"}
      style={{ transform: "translateY(calc(-1 * var(--keyboard-height, 0px)))" }}
    >
      {children}
    </div>
  );
};

export default BookingBar;
