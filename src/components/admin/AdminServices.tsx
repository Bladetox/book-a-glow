import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, RotateCcw, Search, ChevronDown } from "lucide-react";
import type { Treatment } from "@/data/bookingData";
import {
  useTreatments,
  useCategories,
  saveTreatments,
  saveCategories,
  resetToDefaults,
} from "@/data/servicesStore";

interface EditingTreatment extends Omit<Treatment, "price" | "duration"> {
  price: string;
  duration: string;
}

const emptyTreatment = (): EditingTreatment => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  price: "",
  duration: "",
  category: "",
});

const AdminServices = () => {
  const treatments = useTreatments();
  const categories = useCategories();

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingTreatment | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const filtered = useMemo(() => {
    let list = treatments;
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [treatments, filterCategory, search]);

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label || id;

  const startEdit = (t: Treatment) => {
    setEditing({ ...t, price: String(t.price), duration: String(t.duration) });
    setIsNew(false);
  };

  const startNew = () => {
    setEditing({ ...emptyTreatment(), category: filterCategory === "all" ? (categories[0]?.id || "") : filterCategory });
    setIsNew(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsNew(false);
  };

  const saveEdit = () => {
    if (!editing) return;
    const price = parseFloat(editing.price);
    const duration = parseInt(editing.duration, 10);
    if (!editing.name.trim() || isNaN(price) || isNaN(duration) || !editing.category) return;

    const treatment: Treatment = {
      id: editing.id,
      name: editing.name.trim(),
      description: editing.description.trim(),
      price,
      duration,
      category: editing.category,
    };

    if (isNew) {
      saveTreatments([...treatments, treatment]);
    } else {
      saveTreatments(treatments.map((t) => (t.id === treatment.id ? treatment : t)));
    }
    cancelEdit();
  };

  const deleteTreatment = (id: string) => {
    saveTreatments(treatments.filter((t) => t.id !== id));
  };

  const addCategory = () => {
    const label = newCategoryLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (categories.some((c) => c.id === id)) return;
    saveCategories([...categories, { id, label }]);
    setNewCategoryLabel("");
  };

  const deleteCategory = (id: string) => {
    saveCategories(categories.filter((c) => c.id !== id));
    saveTreatments(treatments.filter((t) => t.category !== id));
    if (filterCategory === id) setFilterCategory("all");
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    resetToDefaults();
    setConfirmReset(false);
    setEditing(null);
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="text-base font-semibold text-white/90">Services Menu</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {treatments.length} treatment{treatments.length !== 1 ? "s" : ""} across {categories.length} categories
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="text-xs px-3 py-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
          >
            Categories
          </button>
          <button
            onClick={handleReset}
            className={`text-xs px-3 py-2 rounded-xl border transition-colors flex items-center gap-1.5 ${
              confirmReset
                ? "border-red-500/40 text-red-400 bg-red-500/10"
                : "border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {confirmReset ? "Confirm Reset" : "Reset"}
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startNew}
            className="text-xs px-4 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-colors flex items-center gap-1.5 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </motion.button>
        </div>
      </div>

      {/* Category manager */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Manage Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-white/70"
                  >
                    {c.label}
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="New category name…"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <button
                  onClick={addCategory}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] text-white/70 hover:bg-white/[0.12] text-sm font-medium transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/25" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search treatments…"
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
              {isNew ? "New Treatment" : "Edit Treatment"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className={inputClass}
                placeholder="Name *"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <div className="relative">
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className={`${inputClass} pr-8 appearance-none cursor-pointer`}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
              <input
                className={inputClass}
                placeholder="Price (R) *"
                type="number"
                min="0"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Duration (min) *"
                type="number"
                min="0"
                value={editing.duration}
                onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
              />
            </div>
            <input
              className={inputClass}
              placeholder="Description"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/70 text-sm transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={saveEdit}
                className="px-4 py-2 rounded-xl bg-white/[0.12] text-white text-sm font-medium hover:bg-white/[0.18] transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Treatments list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-sm text-white/30 text-center py-8">No treatments found</p>
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
                  {categoryLabel(t.category)}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{t.description}</p>
              <div className="flex gap-3 mt-1.5">
                <span className="text-sm font-bold text-white/80">R{t.price}</span>
                <span className="text-xs text-white/30">{t.duration} min</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => startEdit(t)}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteTreatment(t.id)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
              >
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
