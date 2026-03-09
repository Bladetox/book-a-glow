import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Save, X, Loader2, Trash2, Edit3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface StockItem {
  id: string;
  item_name: string;
  stock_on_hand: number;
  cost: number;
  total_cost: number | null;
  notes: string | null;
}

const AdminStock = () => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ item_name: "", stock_on_hand: 0, cost: 0, notes: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["stock", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_inventory")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("item_name");
      if (error) throw error;
      return data as StockItem[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (item: Partial<StockItem> & { item_name: string }) => {
      const payload = { ...item, tenant_id: tenantId, total_cost: (item.stock_on_hand || 0) * (item.cost || 0) };
      if (editingId) {
        const { error } = await supabase.from("stock_inventory").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock_inventory").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-stock", tenantId] });
      toast.success(editingId ? "Item updated" : "Item added");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock", tenantId] });
      toast.success("Item deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ item_name: "", stock_on_hand: 0, cost: 0, notes: "" });
  };

  const startEdit = (item: StockItem) => {
    setEditingId(item.id);
    setForm({ item_name: item.item_name, stock_on_hand: item.stock_on_hand, cost: item.cost, notes: item.notes || "" });
    setShowAdd(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Inventory</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Stock Management</h3>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors self-start">
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Product Name</label>
              <input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Qty on Hand</label>
              <input type="number" value={form.stock_on_hand} onChange={e => setForm(f => ({ ...f, stock_on_hand: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Cost per Unit (R)</label>
              <input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60"><X className="w-3 h-3 inline mr-1" />Cancel</button>
            <button onClick={() => upsert.mutate(form)} disabled={!form.item_name}
              className="px-4 py-1.5 rounded-lg bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] disabled:opacity-30 flex items-center gap-1.5">
              <Save className="w-3 h-3" /> {editingId ? "Update" : "Add"}
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Product</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Qty</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Cost</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Total</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 sm:px-5 py-8 text-center text-white/30">No stock items yet.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-t border-white/[0.04]">
                  <td className="px-4 sm:px-5 py-3 text-white/80">{item.item_name}</td>
                  <td className={`px-4 sm:px-5 py-3 ${item.stock_on_hand <= 2 ? "text-red-400" : item.stock_on_hand <= 5 ? "text-amber-400" : "text-white/60"}`}>
                    {item.stock_on_hand}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-white/60">R {item.cost}</td>
                  <td className="px-4 sm:px-5 py-3 text-white/60">R {(item.total_cost || item.stock_on_hand * item.cost).toLocaleString()}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70"><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => remove.mutate(item.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-red-400/50 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default AdminStock;
