import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export const PrimaryCTA = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => (
  <Link to={to} className="marketing-cta">
    {children}
  </Link>
);
