import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Search, ChevronDown, Loader2 } from "lucide-react";
import {
  useSupabaseServices,
  useServiceCategories,
  useUpsertService,
  useDeleteService,
  type Service,
} from "@/hooks/useSupabaseServices";

interface EditingService {
  id?: string;
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  category: string;
  is_active: boolean;
}

const emptyService = (): EditingService => ({
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
  category: "",
  is_active: true,
});

const AdminServices = () => {
  const { data: services = [], isLoading } = useSupabaseServices();
  const { data: categories = [] } = useServiceCategories();
  const upsertMutation = useUpsertService();
  const deleteMutation = useDeleteService();

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingService | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = useMemo(() => {
    let list = services;
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, filterCategory, search]);

  const startEdit = (t: Service) => {
    setEditing({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      price: String(t.price),
      duration_minutes: String(t.duration_minutes),
      category: t.category,
      is_active: t.is_active,
    });
    setIsNew(false);
  };

  const startNew = () => {
    setEditing({
      ...emptyService(),
      category: filterCategory === "all" ? (categories[0]?.id || "") : filterCategory,
    });
    setIsNew(true);
  };

  const cancelEdit = () => { setEditing(null); setIsNew(false); };

  const saveEdit = () => {
    if (!editing) return;
    const price = parseFloat(editing.price);
    const duration = parseInt(editing.duration_minutes, 10);
    if (!editing.name.trim() || isNaN(price) || isNaN(duration) || !editing.category) return;

    upsertMutation.mutate(
      {
        id: isNew ? undefined : editing.id,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        price,
        duration_minutes: duration,
        category: editing.category,
        is_active: editing.is_active,
      },
      { onSuccess: cancelEdit }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="text-base font-semibold text-white/90">Services Menu</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {services.length} service{services.length !== 1 ? "s" : ""} across {categories.length} categories
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={startNew}
          className="text-xs px-4 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-colors flex items-center gap-1.5 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/25" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`${inputClass} pr-8 appearance-none cursor-pointer min-w-[160px]`}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/[0.04] border border-white/[0.1] rounded-2xl p-4 flex flex-col gap-3"
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              {isNew ? "New Service" : "Edit Service"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputClass} placeholder="Name *" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <input className={inputClass} placeholder="Category *" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              <input className={inputClass} placeholder="Price *" type="number" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
              <input className={inputClass} placeholder="Duration (min) *" type="number" min="0" value={editing.duration_minutes} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })} />
            </div>
            <input className={inputClass} placeholder="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button onClick={cancelEdit} className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/70 text-sm transition-colors">Cancel</button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={saveEdit}
                disabled={upsertMutation.isPending}
                className="px-4 py-2 rounded-xl bg-white/[0.12] text-white text-sm font-medium hover:bg-white/[0.18] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {upsertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-sm text-white/30 text-center py-8">No services found</p>
        )}
        {filtered.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-start gap-3 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-white/90">{t.name}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 uppercase tracking-wider">
                  {t.category}
                </span>
              </div>
              {t.description && <p className="text-xs text-white/40 mt-0.5">{t.description}</p>}
              <div className="flex gap-3 mt-1.5">
                <span className="text-sm font-bold text-white/80">R{t.price}</span>
                <span className="text-xs text-white/30">{t.duration_minutes} min</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => startEdit(t)} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminServices;
