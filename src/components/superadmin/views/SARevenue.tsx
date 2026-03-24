import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  gateway: string;
  created_at: string | null;
  tenant_id: string | null;
}

const toRand = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SARevenue() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("payments")
      .select("id, amount, status, payment_type, gateway, created_at, tenant_id")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setPayments(data ?? []); setLoading(false); });
  }, []);

  const completed = payments.filter(p => p.status === "completed");
  const totalRev  = completed.reduce((s, p) => s + p.amount, 0);

  const thisMonth = completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

  const lastMonth = completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at), now = new Date();
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: "Total Revenue", value: toRand(totalRev),  sub: "all completed payments", icon: DollarSign },
    { label: "This Month",    value: toRand(thisMonth), sub: "current month",           icon: TrendingUp },
    { label: "Last Month",    value: toRand(lastMonth), sub: "previous month",          icon: CreditCard },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-white font-semibold text-lg">Revenue</h2>
        <p className="text-white/40 text-sm">Platform-wide payment analytics across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-violet-400" />
              <p className="text-xs text-white/40 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white/80">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Amount", "Type", "Gateway", "Status", "Date", "Tenant"].map(h => (
                  <th key={h} className="text-left text-xs text-white/30 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-white/30 text-xs">Loading…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-white/30 text-xs">No payments found</td></tr>
              ) : payments.slice(0, 100).map(p => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/80 font-medium text-sm">{toRand(p.amount)}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{p.payment_type}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{p.gateway}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      p.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-[11px] font-mono">
                    {p.tenant_id ? p.tenant_id.slice(0, 8) + "…" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
