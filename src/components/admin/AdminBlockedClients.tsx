import { useState, useEffect } from "react";
import { ShieldBan, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import BlockClientModal from "@/components/admin/BlockClientModal";
import { SectionLabel, EmptyState } from "@/components/admin/AdminSharedUI";
import { toast } from "sonner";

interface BlockedClientRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  reason: string | null;
  created_at?: string | null;
  is_active?: boolean | null;
}

const AdminBlockedClients = () => {
  const { tenantId } = useTenant();
  const [blockedClients, setBlockedClients] = useState<BlockedClientRow[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedBlockedClient, setSelectedBlockedClient] = useState<BlockedClientRow | null>(null);

  const loadBlockedClients = async () => {
    if (!tenantId) return;
    setBlockedLoading(true);
    try {
      const { data, error } = await supabase
        .from("blocked_clients")
        .select("id, name, email, phone, address, reason, created_at, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBlockedClients((data as BlockedClientRow[]) ?? []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load blocked clients");
    } finally {
      setBlockedLoading(false);
    }
  };

  useEffect(() => { loadBlockedClients(); }, [tenantId]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <BlockClientModal
        open={blockModalOpen}
        clientName={selectedBlockedClient?.name ?? ""}
        clientEmail={selectedBlockedClient?.email ?? ""}
        clientPhone={selectedBlockedClient?.phone ?? ""}
        clientAddress={selectedBlockedClient?.address ?? ""}
        existingBlockId={selectedBlockedClient?.id ?? null}
        onClose={() => { setBlockModalOpen(false); setSelectedBlockedClient(null); }}
        onSuccess={() => { loadBlockedClients(); }}
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldBan className="w-4 h-4 text-red-400/60" />
            <SectionLabel label="Blocked Clients" />
          </div>
          <button
            onClick={loadBlockedClients}
            disabled={blockedLoading}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white/50 hover:text-white/80 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {blockedLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            Refresh
          </button>
        </div>

        <p className="text-xs text-white/35 leading-relaxed">
          Active client blocks are managed here. Unblocking a client allows them to book again while keeping the audit trail intact.
        </p>

        {blockedLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
            ))}
          </div>
        ) : blockedClients.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No blocked clients"
            description="Block a client from the Bookings tab when you need to prevent future appointments."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {blockedClients.map((client) => (
              <div
                key={client.id}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.02] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-white/85 truncate">{client.name || "Unnamed client"}</p>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-400">Blocked</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {client.phone && <p className="text-[11px] text-white/35 truncate">{client.phone}</p>}
                    {client.email && <p className="text-[11px] text-white/35 truncate">{client.email}</p>}
                    {client.reason && <p className="text-[11px] text-white/45 truncate">Reason: {client.reason}</p>}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedBlockedClient(client); setBlockModalOpen(true); }}
                  className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminBlockedClients;
