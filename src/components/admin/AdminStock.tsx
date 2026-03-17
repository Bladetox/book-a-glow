import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, X, Loader2, Trash2, Edit3, Upload, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface StockItem {
  id: string;
  item_name: string;
  stock_on_hand: number;
  opening_stock: number;
  reorder_level: number;
  cost: number;
  total_cost: number | null;
  notes: string | null;
}

type Tab = "stock" | "consumption";

const AdminStock = () => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("stock");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ item_name: "", stock_on_hand: 0, opening_stock: 0, reorder_level: 1, cost: 0, notes: "" });
  const [csvRows, setCsvRows] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const lowStock = items.filter(i => i.stock_on_hand <= i.reorder_level);

  // ── Upsert (never sends total_cost — it is a generated column) ──
  const upsert = useMutation({
    mutationFn: async (item: Omit<Partial<StockItem>, "total_cost"> & { item_name: string }) => {
      const { total_cost: _drop, ...safe } = item as any;
      const payload = { ...safe, tenant_id: tenantId };
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
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock", tenantId] });
      setDeleteId(null);
      toast.success("Item deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ item_name: "", stock_on_hand: 0, opening_stock: 0, reorder_level: 1, cost: 0, notes: "" });
  };

  const startEdit = (item: StockItem) => {
    setEditingId(item.id);
    setForm({
      item_name: item.item_name,
      stock_on_hand: item.stock_on_hand,
      opening_stock: item.opening_stock ?? item.stock_on_hand,
      reorder_level: item.reorder_level ?? 1,
      cost: item.cost,
      notes: item.notes || "",
    });
    setShowAdd(true);
  };

  // ── CSV import ──
  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const [header, ...rows] = text.trim().split("\n");
      const keys = header.split(",").map(k => k.trim().toLowerCase().replace(/ /g, "_"));
      const parsed = rows
        .map(row => {
          const vals = row.split(",");
          return keys.reduce((acc: any, k, i) => { acc[k] = vals[i]?.trim() ?? ""; return acc; }, {});
        })
        .filter(r => r.item_name);
      setCsvRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const importCsv = useMutation({
    mutationFn: async () => {
      if (!csvRows) return;
      const payload = csvRows.map(r => ({
        tenant_id: tenantId,
        item_name: r.item_name,
        cost: parseFloat(String(r.cost).replace(/[^0-9.]/g, "")) || 0,
        stock_on_hand: parseFloat(r.stock_on_hand) || 0,
        opening_stock: parseFloat(r.opening_stock || r.stock_on_hand) || 0,
        reorder_level: parseFloat(r.reorder_level) || 1,
        notes: r.notes || null,
      }));
      const { error } = await supabase.from("stock_inventory").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock", tenantId] });
      setCsvRows(null);
      toast.success(`${csvRows?.length} items imported`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalStockValue = items.reduce((sum, i) => sum + (i.total_cost ?? i.stock_on_hand * i.cost), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Inventory</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Stock Management</h3>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-white/60 hover:bg-white/[0.09] transition-colors">
            <Upload className="w-3.5 h-3.5" /> CSV Import
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          <button onClick={() => { resetForm(); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
      </div>

      {/* Low stock alert banner */}
      <AnimatePresence>
        {lowStock.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1">Low Stock Alert — {lowStock.length} item{lowStock.length > 1 ? "s" : ""} need restocking</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {lowStock.map(i => (
                  <span key={i.id} className="text-[11px] text-amber-300/70">
                    {i.item_name} <span className="text-amber-400/60">({i.stock_on_hand} left)</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV preview */}
      <AnimatePresence>
        {csvRows && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-white/70">{csvRows.length} rows ready to import</p>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
              {csvRows.map((r, i) => (
                <div key={i} className="text-[11px] text-white/50 flex gap-3">
                  <span className="text-white/70 w-48 truncate">{r.item_name}</span>
                  <span>qty: {r.stock_on_hand}</span>
                  <span>cost: R{r.cost}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCsvRows(null)} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60"><X className="w-3 h-3 inline mr-1" />Cancel</button>
              <button onClick={() => importCsv.mutate()} disabled={importCsv.isPending}
                className="px-4 py-1.5 rounded-lg bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] flex items-center gap-1.5">
                {importCsv.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Confirm Import
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Product Name</label>
                <input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Opening Stock</label>
                <input type="number" step="0.5" value={form.opening_stock} onChange={e => setForm(f => ({ ...f, opening_stock: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Qty on Hand</label>
                <input type="number" step="0.5" value={form.stock_on_hand} onChange={e => setForm(f => ({ ...f, stock_on_hand: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Cost per Unit (R)</label>
                <input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1 block">Reorder Alert Level</label>
                <input type="number" step="0.5" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: Number(e.target.value) }))}
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
              <button onClick={() => upsert.mutate(form)} disabled={!form.item_name || upsert.isPending}
                className="px-4 py-1.5 rounded-lg bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] disabled:opacity-30 flex items-center gap-1.5">
                {upsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a] p-6 max-w-sm w-full flex flex-col gap-4">
              <p className="text-sm font-semibold text-white/80">Delete this item?</p>
              <p className="text-xs text-white/40">This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white/70">Cancel</button>
                <button onClick={() => remove.mutate(deleteId)} disabled={remove.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/30 flex items-center gap-1.5">
                  {remove.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0">
        {(["stock", "consumption"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px ${
              tab === t ? "border-white/40 text-white/80" : "border-transparent text-white/30 hover:text-white/50"
            }`}>
            {t === "stock" ? "Stock" : "Consumption"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : tab === "stock" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Product</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">On Hand</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Cost</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Total Value</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Notes</th>
                <th className="px-4 sm:px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 sm:px-5 py-8 text-center text-white/30">No stock items yet.</td></tr>
              ) : items.map(item => {
                const isLow = item.stock_on_hand <= item.reorder_level;
                const isEmpty = item.stock_on_hand === 0;
                return (
                  <tr key={item.id} className={`border-t border-white/[0.04] ${isLow ? "bg-amber-500/[0.03]" : ""}`}>
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 text-xs">{item.item_name}</span>
                        {isEmpty && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400">OUT</span>}
                        {!isEmpty && isLow && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400">LOW</span>}
                      </div>
                    </td>
                    <td className={`px-4 sm:px-5 py-3 text-xs font-medium ${isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-white/60"}`}>
                      {item.stock_on_hand}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/50">R{item.cost}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/60">R{(item.total_cost ?? item.stock_on_hand * item.cost).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/40">{item.notes || "—"}</td>
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-red-400/50 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.08]">
                <td colSpan={3} className="px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Total Stock Value</td>
                <td className="px-4 sm:px-5 py-3 text-xs font-bold text-white/70">R{totalStockValue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </motion.div>
      ) : (
        // ── Consumption tab ──
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Product</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Opening</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Used</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">On Hand</th>
                <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Cost Used</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 sm:px-5 py-8 text-center text-white/30">No stock items yet.</td></tr>
              ) : items.map(item => {
                const used = Math.max(0, (item.opening_stock ?? 0) - item.stock_on_hand);
                const costUsed = used * item.cost;
                return (
                  <tr key={item.id} className="border-t border-white/[0.04]">
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/80">{item.item_name}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/50">{item.opening_stock ?? 0}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/60">{used > 0 ? used : "—"}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/60">{item.stock_on_hand}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-white/60">
                      {used > 0 ? `R${costUsed.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.08]">
                <td colSpan={4} className="px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Total Cost Used</td>
                <td className="px-4 sm:px-5 py-3 text-xs font-bold text-white/70">
                  R{items.reduce((s, i) => s + Math.max(0, (i.opening_stock ?? 0) - i.stock_on_hand) * i.cost, 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default AdminStock;
