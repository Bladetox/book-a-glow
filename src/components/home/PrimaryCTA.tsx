import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/** The homepage hero CTA opens the guided section selector before a destination is chosen. */
export const PrimaryCTA = ({ to, children }: { to: string; children: ReactNode }) => {
  if (to.startsWith("/#")) {
    return (
      <a href={to} className="marketing-cta" onClick={(event) => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("nextslot:journey-start"));
      }}>
        {children}
      </a>
    );
  }
  return <Link to={to} className="marketing-cta">{children}</Link>;
};
