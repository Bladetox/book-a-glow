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
      transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "#DDB487";
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(212,165,116,0.18)";
      e.currentTarget.style.transform = "translateY(-1px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = C.gold;
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    {children}
  </Link>
);
