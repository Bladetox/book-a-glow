// C5 — Drag-to-reorder services list via @dnd-kit (persists display_order to Supabase)
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, Search, ChevronDown, Loader2, GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useSupabaseServices,
  useServiceCategories,
  useUpsertService,
  useDeleteService,
  type Service,
} from "@/hooks/useSupabaseServices";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

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

// ── Sortable row ──────────────────────────────────────────────────────────────
const SortableServiceRow = ({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: service.id });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-start gap-3 group select-none"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 transition-colors shrink-0 touch-none"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-white/90">{service.name}</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 uppercase tracking-wider">
            {service.category}
          </span>
          {!service.is_active && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400/70">Inactive</span>
          )}
        </div>
        {service.description && (
          <p className="text-xs text-white/40 mt-0.5">{service.description}</p>
        )}
        <div className="flex gap-3 mt-1.5">
          <span className="text-sm font-bold text-white/80">R{service.price}</span>
          <span className="text-xs text-white/30">{service.duration_minutes} min</span>
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        {confirmDelete ? (
          // ── Confirm deactivate UI ──
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5"
          >
            <span className="text-[11px] text-red-400/80 font-medium mr-1">Deactivate "{service.name}"?</span>
            <button
              onClick={() => { onDelete(service.id); setConfirmDelete(false); }}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-semibold transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          // ── Normal action buttons ──
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(service)}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminServices = () => {
  const { data: services = [], isLoading } = useSupabaseServices();
  const { data: categories = [] } = useServiceCategories();
  const upsertMutation = useUpsertService();
  const deleteMutation = useDeleteService();
  const { tenantId } = useTenant();

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingService | null>(null);
  const [isNew, setIsNew] = useState(false);
  // Local order override after drag
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Resolve display list — respect drag order, then apply filters
  const baseList = useMemo(() => {
    if (!orderedIds) return services;
    const map = new Map(services.map(s => [s.id, s]));
    const ordered = orderedIds.map(id => map.get(id)).filter(Boolean) as Service[];
    // append any new services not yet in orderedIds
    const inOrder = new Set(orderedIds);
    const extras = services.filter(s => !inOrder.has(s.id));
    return [...ordered, ...extras];
  }, [services, orderedIds]);

  const filtered = useMemo(() => {
    let list = baseList;
    if (filterCategory !== "all") list = list.filter(t => t.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        t => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, filterCategory, search]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIds = (orderedIds ?? services.map(s => s.id));
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(currentIds, oldIndex, newIndex);
    setOrderedIds(newOrder);

    // Persist display_order to Supabase
    try {
      const updates = newOrder.map((id, idx) => ({ id, display_order: idx }));
      for (const u of updates) {
        await supabase
          .from("services")
          .update({ display_order: u.display_order })
          .eq("id", u.id)
          .eq("tenant_id", tenantId);
      }
    } catch {
      toast.error("Could not save order — try again");
    }
  }, [orderedIds, services, tenantId]);

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

  const handleDelete = (id: string) => deleteMutation.mutate(id);

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

  // B4 — Skeleton loader
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 max-w-3xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 flex gap-3 animate-pulse">
            <div className="w-4 h-4 rounded bg-white/[0.06] mt-1 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3.5 w-40 rounded bg-white/[0.06]" />
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isDraggable = !search.trim() && filterCategory === "all";

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="text-base font-semibold text-white/90">Services Menu</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {services.length} service{services.length !== 1 ? "s" : ""} across {categories.length} categories
            {isDraggable && <span className="ml-2 text-white/20">· drag to reorder</span>}
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
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className={`${inputClass} pr-8 appearance-none cursor-pointer min-w-[160px]`}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Edit / new form */}
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
              <input className={inputClass} placeholder="Name *" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className={inputClass} placeholder="Category *" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} />
              <input className={inputClass} placeholder="Price *" type="number" min="0" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} />
              <input className={inputClass} placeholder="Duration (min) *" type="number" min="0" value={editing.duration_minutes} onChange={e => setEditing({ ...editing, duration_minutes: e.target.value })} />
            </div>
            <input className={inputClass} placeholder="Description" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                className="w-3.5 h-3.5 accent-emerald-400"
              />
              <span className="text-xs text-white/50">Active (visible to clients)</span>
            </label>
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

      {/* B3 — Empty state */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16 flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Plus className="w-5 h-5 text-white/20" />
          </div>
          <p className="text-sm text-white/40">
            {search.trim() ? `No services match "${search}"` : "No services yet"}
          </p>
          {!search.trim() && (
            <button
              onClick={startNew}
              className="text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2"
            >
              Add your first service
            </button>
          )}
        </motion.div>
      )}

      {/* Services list — draggable when no search/filter active */}
      {filtered.length > 0 && (
        isDraggable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {filtered.map(s => (
                  <SortableServiceRow key={s.id} service={s} onEdit={startEdit} onDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(s => (
              <SortableServiceRow key={s.id} service={s} onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminServices;
