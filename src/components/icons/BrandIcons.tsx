/**
 * Phenome Beauty — Brand Icon Set
 * All icons share the same visual DNA as the favicon:
 * fine curved strokes, lash/petal/wing motifs, thin elegant lines.
 * Each icon is a React SVG component accepting standard SVG props.
 */
import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { className?: string };

const defaults: React.SVGProps<SVGSVGElement> = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Dashboard — 4-cell grid; top-right cell sports a lash-curl flourish */
export const DashboardIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* grid cells */}
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    {/* lash-curl accent on top-right cell */}
    <path d="M16 5 Q18 3.5 20 5" strokeWidth="1.2" opacity="0.7" />
  </svg>
);

/** Bookings — calendar with a petal-curl replacing the top-right corner */
export const BookingsIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* calendar body */}
    <rect x="3" y="5" width="18" height="16" rx="2" />
    {/* header bar */}
    <line x1="3" y1="10" x2="21" y2="10" />
    {/* binding pins */}
    <line x1="8" y1="3" x2="8" y2="7" />
    <line x1="16" y1="3" x2="16" y2="7" />
    {/* day dots */}
    <circle cx="8" cy="14" r="0.8" fill="currentColor" />
    <circle cx="12" cy="14" r="0.8" fill="currentColor" />
    {/* petal-curl in bottom-right */}
    <path d="M16 17 Q18.5 15.5 19 18 Q17.5 19.5 16 17Z" strokeWidth="1.1" />
  </svg>
);

/** Services — scissors whose blades curve into lash-tip flourishes */
export const ServicesIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* pivot circle */}
    <circle cx="12" cy="12" r="1.2" />
    {/* upper blade — curves into a lash tip */}
    <path d="M12 12 Q8 8 4.5 6 Q3.5 5.2 4 4.5 Q4.8 4 5.5 4.8 Q8.5 7.5 12 10.8" />
    {/* lower blade — mirrors with curl */}
    <path d="M12 12 Q8 16 4.5 18 Q3.5 18.8 4 19.5 Q4.8 20 5.5 19.2 Q8.5 16.5 12 13.2" />
    {/* right handle ring — upper */}
    <path d="M12 10.8 Q16 8 19.5 9.5 Q21 10.5 20 12 Q18.5 13 17 12 Q14.5 11 12 12" />
    {/* right handle ring — lower */}
    <path d="M12 13.2 Q16 16 19.5 14.5 Q21 13.5 20 12 Q18.5 11 17 12 Q14.5 13 12 12" />
  </svg>
);

/** Consultations — sparkle star whose rays end in soft petal curves */
export const ConsultationsIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* main star rays as lash-tipped spokes */}
    <path d="M12 3 Q12.4 7 12 9" />
    <path d="M12 15 Q11.6 19 12 21" />
    <path d="M3 12 Q7 12.4 9 12" />
    <path d="M15 12 Q19 11.6 21 12" />
    {/* diagonal rays with petal curl at tips */}
    <path d="M5.6 5.6 Q8.2 8.5 9.2 9.5" />
    <path d="M14.8 14.8 Q17 17.5 18.4 18.4" />
    <path d="M18.4 5.6 Q15.8 8.5 14.8 9.5" />
    <path d="M9.2 14.8 Q7 17.5 5.6 18.4" />
    {/* inner glow circle */}
    <circle cx="12" cy="12" r="2.5" />
    {/* petal curl at top tip */}
    <path d="M11.4 3 Q12 1.5 12.6 3" strokeWidth="1.1" />
  </svg>
);

/** Availability — clock with hands tapered like lash strokes */
export const AvailabilityIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* clock face */}
    <circle cx="12" cy="12" r="9" />
    {/* hour hand — tapers to a fine lash tip */}
    <path d="M12 12 Q11.6 9 12 7" strokeWidth="1.8" />
    {/* minute hand — longer, tapered */}
    <path d="M12 12 Q14.5 11.5 16 11" strokeWidth="1.4" />
    {/* centre dot */}
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    {/* lash accent at 12 o'clock */}
    <path d="M11.3 3.5 Q12 2 12.7 3.5" strokeWidth="1.1" opacity="0.6" />
  </svg>
);

/** Stock — open box with petal shapes floating inside */
export const StockIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* box base */}
    <path d="M21 8 L12 13 L3 8" />
    <path d="M3 8 L3 19 Q3 20 4 20 L20 20 Q21 20 21 19 L21 8" />
    {/* box top flaps open */}
    <path d="M3 8 L7.5 5 L12 8" />
    <path d="M21 8 L16.5 5 L12 8" />
    {/* front fold line */}
    <line x1="12" y1="8" x2="12" y2="13" />
    {/* petal inside */}
    <path d="M10 16 Q12 14 14 16 Q12 18 10 16Z" strokeWidth="1.1" />
  </svg>
);

/** Reviews — 5-point star with softly curved petal-like points */
export const ReviewsIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* star outline with curved points */}
    <path d="M12 2
      Q12.4 5.8 14.5 6.5
      Q18.5 6 19 6.5
      Q18 9 16 10.5
      Q17 14 16.5 15
      Q13.5 13.5 12 14
      Q10.5 13.5 7.5 15
      Q7 14 8 10.5
      Q6 9 5 6.5
      Q5.5 6 9.5 6.5
      Q11.6 5.8 12 2Z" />
    {/* small lash accents at top point */}
    <path d="M11.2 2.5 Q12 1 12.8 2.5" strokeWidth="1" opacity="0.5" />
  </svg>
);

/** Integrations — two interlocked rings with fine curved connectors */
export const IntegrationsIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* left link */}
    <path d="M9 7 L6 7 Q3 7 3 12 Q3 17 6 17 L9 17" />
    {/* right link */}
    <path d="M15 7 L18 7 Q21 7 21 12 Q21 17 18 17 L15 17" />
    {/* overlap bar top */}
    <line x1="9" y1="7" x2="15" y2="7" />
    {/* overlap bar bottom */}
    <line x1="9" y1="17" x2="15" y2="17" />
    {/* decorative lash-curl on left link */}
    <path d="M3.5 10 Q2 12 3.5 14" strokeWidth="1.1" opacity="0.6" />
  </svg>
);

/** Settings — gear where teeth are softened into petal-leaf shapes */
export const SettingsIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* inner circle */}
    <circle cx="12" cy="12" r="3" />
    {/* petal teeth — 8 evenly spaced */}
    <path d="M12 3 Q12.6 4.5 12 6 Q11.4 4.5 12 3Z" />
    <path d="M12 18 Q12.6 19.5 12 21 Q11.4 19.5 12 18Z" />
    <path d="M3 12 Q4.5 12.6 6 12 Q4.5 11.4 3 12Z" />
    <path d="M18 12 Q19.5 12.6 21 12 Q19.5 11.4 18 12Z" />
    <path d="M5.6 5.6 Q6.6 7 5.6 8.4 Q4.6 7 5.6 5.6Z" />
    <path d="M15.6 15.6 Q16.6 17 15.6 18.4 Q14.6 17 15.6 15.6Z" />
    <path d="M18.4 5.6 Q17.4 7 18.4 8.4 Q19.4 7 18.4 5.6Z" />
    <path d="M5.6 15.6 Q6.6 17 5.6 18.4 Q4.6 17 5.6 15.6Z" />
  </svg>
);

/** Loyalty Tracker — faceted gemstone with lash detail beneath */
export const LoyaltyIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* gem top facet */}
    <path d="M8 4 L16 4 L20 9 L12 21 L4 9 Z" />
    {/* gem horizontal split */}
    <line x1="4" y1="9" x2="20" y2="9" />
    {/* inner facet lines */}
    <line x1="8" y1="4" x2="12" y2="9" />
    <line x1="16" y1="4" x2="12" y2="9" />
    {/* lash accent beneath gem */}
    <path d="M9 21.5 Q12 23 15 21.5" strokeWidth="1.1" opacity="0.6" />
  </svg>
);

/** Terms & Conditions — document with a decorative petal flourish on top-right corner */
export const TermsIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* page body */}
    <path d="M6 2 L15 2 L15 6 L19 6 L19 22 L5 22 L5 3 Q5 2 6 2Z" />
    {/* fold corner */}
    <path d="M15 2 L19 6" />
    {/* text lines */}
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="16" x2="13" y2="16" />
    {/* petal flourish on folded corner */}
    <path d="M15.5 3 Q17.5 2 18.5 4 Q16.5 5.5 15.5 3Z" strokeWidth="1.1" />
  </svg>
);

/** Client Management — two profile silhouettes with a lash-curl accent top-right */
export const ClientManagementIcon = ({ className, ...props }: IconProps) => (
  <svg {...defaults} className={className} {...props}>
    {/* back person silhouette */}
    <circle cx="9" cy="7" r="3" />
    <path d="M2 20c0-3.3 3.1-6 7-6" />
    {/* front person silhouette */}
    <circle cx="16" cy="9" r="3.5" />
    <path d="M9.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    {/* lash-curl accent top-right */}
    <path d="M19 3 Q21 1 22 3" strokeWidth="1.1" opacity="0.6" />
  </svg>
);
