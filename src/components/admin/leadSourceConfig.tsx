import {
  Globe, Instagram, Facebook, Youtube, Users, RefreshCw, HelpCircle,
} from "lucide-react";

// ─── lead source display config ─────────────────────────────────────────────
// Shared across AdminConsultations and the dashboard's Top Acquisition
// Channel card so every acquisition-channel badge in the admin app uses the
// same icon/colour identifiers.

export type LeadSourceConfig = {
  label: string;
  icon: React.ReactNode;
  className: string;
};

export function getLeadSourceConfig(source?: string | null): LeadSourceConfig {
  const s = (source ?? "").toLowerCase().trim();
  if (s.includes("tiktok"))
    return {
      label: source!,
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
        </svg>
      ),
      className: "bg-white/[0.06] text-white/60",
    };
  if (s.includes("instagram"))
    return {
      label: source!,
      icon: <Instagram className="w-3 h-3" />,
      className: "bg-pink-500/10 text-pink-400",
    };
  if (s.includes("facebook"))
    return {
      label: source!,
      icon: <Facebook className="w-3 h-3" />,
      className: "bg-blue-500/10 text-blue-400",
    };
  if (s.includes("youtube"))
    return {
      label: source!,
      icon: <Youtube className="w-3 h-3" />,
      className: "bg-red-500/10 text-red-400",
    };
  if (s.includes("website") || s.includes("web") || s.includes("google") || s.includes("seo"))
    return {
      label: source!,
      icon: <Globe className="w-3 h-3" />,
      className: "bg-teal-500/10 text-teal-400",
    };
  if (s.includes("referral") || s.includes("word"))
    return {
      label: source!,
      icon: <Users className="w-3 h-3" />,
      className: "bg-violet-500/10 text-violet-400",
    };
  if (s.includes("returning") || s.includes("existing"))
    return {
      label: source!,
      icon: <RefreshCw className="w-3 h-3" />,
      className: "bg-emerald-500/10 text-emerald-400",
    };
  if (!source)
    return {
      label: "Unknown",
      icon: <HelpCircle className="w-3 h-3" />,
      className: "bg-white/[0.04] text-white/25",
    };
  return {
    label: source,
    icon: <Globe className="w-3 h-3" />,
    className: "bg-white/[0.06] text-white/50",
  };
}
