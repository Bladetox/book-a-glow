import { CreditCard, ExternalLink } from "lucide-react";
import { GlassCard, SectionHeader } from "./shared";

const PLANS = [
  { plan: "Starter",      amount: "R99/mo" },
  { plan: "Flow",         amount: "R399/mo" },
  { plan: "Professional", amount: "R699/mo" },
  { plan: "Studio",       amount: "R1299/mo" },
];

// ─── Static reference card only — actual pricing is resolved dynamically ────
// per tenant plan inside platform-monthly-billing. This is not a source of truth.
export default function PlanPaymentLinksCard() {
  return (
    <GlassCard>
      <SectionHeader
        icon={CreditCard}
        title="Plan Payment Links"
        desc="Quick reference — create these links in your Yoco dashboard and paste them into invoices."
      />
      <div className="p-5">
        <div className="space-y-2">
          {PLANS.map(({ plan, amount }) => (
            <div key={plan} className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "rgba(0,200,83,0.55)" }} />
                <span className="text-[12px] text-white/60">{plan}</span>
              </div>
              <span className="text-[12px] font-mono text-white/35">{amount}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/20 mt-4">
          Pricing is applied dynamically per tenant plan by platform-monthly-billing — this is a reference only,
          not a source of truth. Create a separate payment link per plan in{" "}
          <a
            href="https://dashboard.yoco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white/50 transition-colors"
            style={{ color: "rgba(0,200,83,0.5)" }}
          >
            dashboard.yoco.com
            <ExternalLink className="inline w-2.5 h-2.5 ml-0.5" />
          </a>
          . Paste each link into the invoice's payment link field in Billing &amp; Revenue.
        </p>
      </div>
    </GlassCard>
  );
}
