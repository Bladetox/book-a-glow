import type { ReactNode } from "react";

const BASE_WIDTH = 1000;
const BASE_HEIGHT = 760;

interface ProductSnapshotFrameProps {
  width: number;
  children: ReactNode;
  shadow?: "hero" | "section";
}

export const ProductSnapshotFrame = ({
  width,
  children,
  shadow = "section",
}: ProductSnapshotFrameProps) => {
  const safeWidth = Math.max(1, Math.min(width, BASE_WIDTH));
  const scale = safeWidth / BASE_WIDTH;
  const height = BASE_HEIGHT * scale;

  return (
    <div
      style={{
        position: "relative",
        width: safeWidth,
        height,
        maxWidth: "100%",
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: 18 * scale,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#000",
        boxShadow:
          shadow === "hero"
            ? "0 24px 44px rgba(0,0,0,0.38)"
            : "0 24px 48px rgba(0,0,0,0.42)",
      }}
    >
      <div
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};
