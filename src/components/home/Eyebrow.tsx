import { C } from "./tokens";

export const Eyebrow = ({ text }: { text: string }) => (
  <div style={{
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 18,
    lineHeight: 1.4,
  } as React.CSSProperties}>
    {text}
  </div>
);
