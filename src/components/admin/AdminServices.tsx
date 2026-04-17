// C5 — Drag-to-reorder services list via @dnd-kit (persists display_order to Supabase)
import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, Search, ChevronDown, Loader2, GripVertical, X, Sparkles } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSupabaseServices, useServiceCategories, useUpsertService, useDeleteService, type Service, } from "@/hooks/useSupabaseServices";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import type { AddonRule } from "@/hooks/useSuggestedAddons";
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

// ── Rule Editor Sub-component (moved from Settings) ───────────────────────────────────
interface ServiceOption {
  id: string;
  name: string;
}

interface RuleEditorProps {
  rule: AddonRule;
  index: number;
  services: ServiceOption[];
  usedTriggerIds: string[];
  onChange: (updated: AddonRule) => void;
  onDelete: () => void;
}

const RuleEditor = ({ rule, index, services, usedTriggerIds, onChange, onDelete }: RuleEditorProps) => {
  const [open, setOpen] = useState(true);
  const triggerService = services.find((s) => s.id === rule.triggerId);

  const toggleSuggest = (id: string) => {
    const next = rule.suggestIds.includes(id)
      ? rule.suggestIds.filter((s) => s !== id)
      : [...rule.suggestIds, id];
    onChange({ ...rule, suggestIds: next });
  };

  const triggerOptions = services.filter(
    (s) => s.id === rule.triggerId || !usedTriggerIds.includes(s.id)
  );
  const suggestOptions = services.filter((s) => s.id !== rule.triggerId);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden transition-all">
      <div className="px-4 py-3 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider">#{index + 1}</span>
          <span className="text-xs font-medium text-white/70">
            {triggerService?.name ?? "— no trigger selected —"}
          </span>
          {rule.suggestIds.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-400/80 border border-amber-400/20">
              {rule.suggestIds.length} add-on{rule.suggestIds.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-white/20 hover:text-red-400/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="p-4 flex flex-col gap-4 border-t border-white/[0.04]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30">Trigger service</label>
            <select
              value={rule.triggerId}
              onChange={(e) => onChange({ ...rule, triggerId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 focus:outline-none focus:border-white/20 transition-colors"
            >
              <option value="" className="bg-zinc-900">— pick a trigger —</option>
              {triggerOptions.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30">Suggest these add-ons</label>
            {rule.triggerId === "" ? (
              <p className="text-[11px] text-white/20 italic px-1">Select a trigger first.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {suggestOptions.map((s) => {
                  const checked = rule.suggestIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSuggest(s.id)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all ${
                        checked
                          ? "border-amber-400/30 bg-amber-400/[0.07] text-white/85"
                          : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/60"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 text-amber-400" />}
                      <span className="text-xs truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sortable row ──────────────────────────────────────────────────────────────
const SortableServiceRow = ({ service, onEdit, onDelete, }: { service: Service; onEdit: (s: Service) => void; onDelete: (id: string) => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-white/10 group-hover:text-white/30 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-white/90 truncate">{service.name}</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/40 font-medium">
            {service.category}
          </span>
          {!service.is_active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400/80 font-medium">
              Inactive
            </span>
          )}
        </div>
        {service.description && (
          <p className="text-xs text-white/40 line-clamp-1 mb-1.5">{service.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="text-emerald-400/90">R{service.price}</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40">{service.duration_minutes} min</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
            <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-tight mr-1">Deactivate?</span>
            <button
              onClick={() => { onDelete(service.id); setConfirmDelete(false); }}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-semibold transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
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
          </>
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
  const { data: appSettings = {} } = useAppSettings();
  const upsertSetting = useUpsertAppSetting();

  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingService | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  // Suggested add-ons state
  const [addonRules, setAddonRules] = useState<AddonRule[]>([]);
  const [addonSaved, setAddonSaved] = useState(false);

  // Load existing add-on rules from appSettings
  useEffect(() => {
    if (appSettings.suggested_addons) {
      try {
        const parsed = JSON.parse(appSettings.suggested_addons);
        if (Array.isArray(parsed.rules)) {
          setAddonRules(
            parsed.rules.filter(
              (r: any): r is AddonRule =>
                !!r &&
                typeof r === "object" &&
                typeof (r as AddonRule).triggerId === "string" &&
                Array.isArray((r as AddonRule).suggestIds)
            )
          );
        } else if (Array.isArray(parsed.triggerIds) && Array.isArray(parsed.suggestIds)) {
          const suggestIds: string[] = parsed.suggestIds;
          setAddonRules(
            (parsed.triggerIds as string[]).map((triggerId: string) => ({
              triggerId,
              suggestIds,
            }))
          );
        }
      } catch (e) {
        console.error("Failed to parse add-on rules:", e);
      }
    }
  }, [appSettings.suggested_addons]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const baseList = useMemo(() => {
    if (!orderedIds) return services;
    const map = new Map(services.map(s => [s.id, s]));
    const ordered = orderedIds.map(id => map.get(id)).filter(Boolean) as Service[];
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

  const saveSuggestedAddons = () => {
    const validRules = addonRules.filter((r) => r.triggerId !== "" && r.suggestIds.length > 0);
    const json = JSON.stringify({ rules: validRules });
    upsertSetting.mutate({ suggested_addons: json });
    setAddonSaved(true);
    setTimeout(() => setAddonSaved(false), 3500);
  };

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

  const cancelEdit = () => {
    setEditing(null);
    setIsNew(false);
  };

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
  const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  const isDraggable = !search.trim() && filterCategory === "all";
  const serviceOptions = services.map((s) => ({ id: s.id, name: s.name }));
  const usedTriggerIds = addonRules.map((r) => r.triggerId).filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      {/* ── SERVICES LIST ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white/90">Services Menu</h3>
            <p className="text-xs text-white/30 font-medium">
              {services.length} service{services.length !== 1 ? "s" : ""} across {categories.length} categories {isDraggable && <span className="text-white/10 ml-1">· drag to reorder</span>}
            </p>
          </div>
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`${inputClass} pr-8 appearance-none cursor-pointer min-w-[160px]`}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
          </div>
        </div>

        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex flex-col gap-4"
          >
            <h4 className="text-sm font-bold text-white/80">{isNew ? "New Service" : "Edit Service"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className={inputClass}
                placeholder="Name *"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <select
                className={inputClass}
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                <option value="">Select Category *</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">R</span>
                <input
                  className={`${inputClass} pl-7`}
                  placeholder="Price *"
                  type="number"
                  min="0"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                />
              </div>
              <div className="relative">
                <input
                  className={inputClass}
                  placeholder="Duration (min) *"
                  type="number"
                  min="0"
                  value={editing.duration_minutes}
                  onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">min</span>
              </div>
            </div>
            <textarea
              className={`${inputClass} resize-none h-20`}
              placeholder="Description"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-0 focus:ring-offset-0 transition-colors"
                />
                <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Active (visible to clients)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-xl hover:bg-white/[0.05] text-xs font-semibold text-white/40 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={upsertMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {upsertMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Service
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {filtered.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4 rounded-3xl bg-white/[0.02] border border-dashed border-white/[0.08]">
            <p className="text-sm text-white/20 mb-3">{search.trim() ? `No services match "${search}"` : "No services yet"}</p>
            {!search.trim() && (
              <button onClick={startNew} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4">
                Add your first service
              </button>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {isDraggable ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {filtered.map(s => (
                    <SortableServiceRow key={s.id} service={s} onEdit={startEdit} onDelete={handleDelete} />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              filtered.map(s => (
                <SortableServiceRow key={s.id} service={s} onEdit={startEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── SUGGESTED ADD-ONS (moved from Settings) ── */}
      <section className="flex flex-col gap-4 mt-4 border-t border-white/[0.06] pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white/90 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Suggested Add-ons
            </h3>
            <p className="text-xs text-white/30 font-medium max-w-md">
              Define rules to suggest extra services when a client selects a specific trigger service.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {addonSaved && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Saved</span>}
            <button
              onClick={() => setAddonRules([...addonRules, { triggerId: "", suggestIds: [] }])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white/80 text-xs font-bold hover:bg-white/[0.12] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {addonRules.map((rule, i) => (
            <RuleEditor
              key={i}
              index={i}
              rule={rule}
              services={serviceOptions}
              usedTriggerIds={usedTriggerIds}
              onChange={(updated) => setAddonRules(addonRules.map((r, idx) => (idx === i ? updated : r)))}
              onDelete={() => setAddonRules(addonRules.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>

        {addonRules.length === 0 && (
          <div className="py-8 flex flex-col items-center justify-center text-center px-4 rounded-3xl bg-white/[0.01] border border-dashed border-white/[0.05]">
            <p className="text-xs text-white/20 italic">No rules yet. Click "Add Rule" to start suggesting add-ons.</p>
          </div>
        )}

        {addonRules.length > 0 && (
          <div className="flex justify-end pt-2">
            <button
              onClick={saveSuggestedAddons}
              disabled={upsertSetting.isPending}
              className="px-6 py-2.5 rounded-xl bg-amber-400 text-zinc-950 text-xs font-bold hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/10 disabled:opacity-50 flex items-center gap-2"
            >
              {upsertSetting.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Add-on Rules
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminServices;
