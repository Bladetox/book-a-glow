import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/** Use a real in-page anchor for homepage section CTAs. */
export const PrimaryCTA = ({ to, children }: { to: string; children: ReactNode }) => {
  if (to.startsWith("/#")) {
    return <a href={to.slice(1)} className="marketing-cta">{children}</a>;
  }
  return <Link to={to} className="marketing-cta">{children}</Link>;
};
