import { Shield, XCircle } from "lucide-react";

const badges = [
  { icon: Shield, label: "POPIA Compliant" },
  { icon: XCircle, label: "Cancel Anytime" },
];

const TrustBadges = () => (
  <div className="flex flex-wrap items-center gap-4">
    {badges.map((b) => (
      <div key={b.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <b.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>{b.label}</span>
      </div>
    ))}
  </div>
);

export default TrustBadges;
