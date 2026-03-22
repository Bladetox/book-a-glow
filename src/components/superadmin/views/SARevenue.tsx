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

export default function SARevenue() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("payments")
      .select("id, amount, status, payment_type, gateway, created_at, tenant_id")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setPayments(data ?? []); setLoading(false); });
  }, []);

  const completed  = payments.filter(p => p.status === "completed");
  const totalRev   = completed.reduce((s, p) => s + p.amount, 0);
  const thisMonth  = completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);
  const lastMonth  = completed.filter(p => {
    if (!p.created_at) return false;
    const d   = new Date(p.created_at);
    const now = new Date();
    const lm  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: "Total Revenue", value: `R${totalRev.toLocaleString()}`,  sub: "all completed payments", icon: DollarSign, gradient: "from-[#868CFF] to-[#4318FF]" },
    { label: "This Month",    value: `R${thisMonth.toLocaleString()}`, sub: "current month",          icon: TrendingUp, gradient: "from-[#01B574] to-[#3DDB85]" },
    { label: "Last Month",    value: `R${lastMonth.toLocaleString()}`, sub: "previous month",         icon: CreditCard, gradient: "from-[#FFB547] to-[#FF7A00]" },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-white font-bold text-xl">Revenue</h2>
        <p className="text-[#A3AED0] text-sm">Platform-wide payment analytics across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, gradient }) => (
          <div key={label} className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-[#A3AED0] font-semibold">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[11px] text-[#A3AED0]/60 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ffffff0f]">
          <h3 className="text-sm font-semibold text-white">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-[#ffffff0f] bg-[#111C44]">
                {["Amount", "Type", "Gateway", "Status", "Date", "Tenant"].map(h => (
                  <th key={h} className="text-left text-xs text-[#A3AED0] font-semibold px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#A3AED0] text-xs">Loading…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#A3AED0] text-xs">No payments found</td></tr>
              ) : payments.slice(0, 50).map(p => (
                <tr key={p.id} className="border-b border-[#ffffff05] bg-[#0B1437] hover:bg-[#1B2559] transition-colors">
                  <td className="px-4 py-3.5 text-white font-semibold text-sm">R{p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">{p.payment_type}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">{p.gateway}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                      p.status === "completed"
                        ? "bg-[#01B574]/10 text-[#01B574] border-[#01B574]/20"
                        : "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0]/60 text-[11px] font-mono">
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
