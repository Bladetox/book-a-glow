import { Shield, XCircle, MapPin, CalendarCheck } from "lucide-react";

const badges = [
  { icon: CalendarCheck, label: "30-Day Free Trial" },
  { icon: Shield,        label: "POPIA Compliant" },
  { icon: XCircle,       label: "Cancel Anytime" },
  { icon: MapPin,        label: "Built for South Africa" },
];

const TrustBadges = () => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {badges.map((b) => (
      <div key={b.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <b.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span>{b.label}</span>
      </div>
    ))}
  </div>
);

export default TrustBadges;
