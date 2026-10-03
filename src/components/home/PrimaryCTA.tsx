import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { C, FONT_BODY } from "./tokens";

export const PrimaryCTA = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => (
  <Link
    to={to}
    style={{
      background: C.gold,
      color: "#080808",
      fontFamily: FONT_BODY,
      fontSize: 15,
      fontWeight: 700,
      padding: "15px 32px",
      borderRadius: 8,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Link>
);
