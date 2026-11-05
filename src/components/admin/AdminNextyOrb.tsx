import "./AdminNextyOrb.css";

type AdminNextyOrbProps = {
  size?: "small" | "medium";
};

/** Shared admin-only Nexty identity. Marketing orb presentation remains separate. */
export function AdminNextyOrb({ size = "small" }: AdminNextyOrbProps) {
  return (
    <span className={`admin-nexty-orb admin-nexty-orb--${size}`} aria-hidden="true">
      <span className="admin-nexty-orb__aura" />
      <span className="admin-nexty-orb__ring" />
      <span className="admin-nexty-orb__core">
        <span className="admin-nexty-orb__highlight" />
      </span>
    </span>
  );
}
