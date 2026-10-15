import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/** Homepage journey links activate the guided experience before scrolling. */
export const PrimaryCTA = ({ to, children }: { to: string; children: ReactNode }) => {
  if (to.startsWith("/#")) {
    const id = to.slice(2);
    return (
      <a
        href={to}
        className="marketing-cta"
        onClick={(event) => {
          const target = document.getElementById(id);
          if (!target) return;
          event.preventDefault();
          window.history.pushState(null, "", `#${id}`);
          window.dispatchEvent(new CustomEvent("nextslot:journey-start", { detail: { targetId: id } }));
        }}
      >
        {children}
      </a>
    );
  }

  return <Link to={to} className="marketing-cta">{children}</Link>;
};
