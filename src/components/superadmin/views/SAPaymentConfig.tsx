import BillingProviderCard from "./payment-config/BillingProviderCard";
import YocoKeysCard from "./payment-config/YocoKeysCard";
import YocoWebhookCard from "./payment-config/YocoWebhookCard";
import IkhokhaKeysCard from "./payment-config/IkhokhaKeysCard";
import PlanPaymentLinksCard from "./payment-config/PlanPaymentLinksCard";

// ─── Payment Configuration ───────────────────────────────────────────────────
export default function SAPaymentConfig() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Payment Configuration</h2>
        <p className="text-white/35 text-sm mt-0.5">
          Configure how NextSlot charges tenants for their subscription — pick a provider and manage its keys.
        </p>
      </div>

      <BillingProviderCard />
      <YocoKeysCard />
      <YocoWebhookCard />
      <IkhokhaKeysCard />
      <PlanPaymentLinksCard />
    </div>
  );
}
