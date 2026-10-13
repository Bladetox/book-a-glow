import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/** `to="/#section-id"` smooth-scrolls on the home page instead of routing. */
export const PrimaryCTA = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => {
  if (to.startsWith("/#")) {
    const id = to.slice(2);
    return (
      <a
        href={to}
        className="marketing-cta"
        onClick={(e) => {
          const el = document.getElementById(id);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            window.history.replaceState(null, "", `#${id}`);
          }
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className="marketing-cta">
      {children}
    </Link>
  );
};
