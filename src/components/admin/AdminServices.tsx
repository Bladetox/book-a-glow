// C5 — Drag-to-reorder services list via @dnd-kit (persists display_order to Supabase)
import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AdminPageHeader,
  SectionLabel,
  SaveButton,
  EmptyState,
} from "@/components/admin/AdminSharedUI";
import { Plus, Pencil, Trash2, Check, Search, ChevronDown, ChevronUp, Loader2, GripVertical, X, Sparkles } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSupabaseServices, useServiceCategories, useUpsertService, useDeleteService, type Service } from "@/hooks/useSupabaseServices";
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

// ── Rule Editor ───────────────────────────────────────────────────────────────
interface ServiceOption { id: string; name: string; }

interface RuleEditorProps {
  rule: AddonRule;
  index: number;
  isOpen: boolean;
  services: ServiceOption[];
  usedTriggerIds: string[];
  onToggle: () => void;
  onChange: (updated: AddonRule) => void;
  onDelete: () => void;
}

const RuleEditor = ({ rule, index, isOpen, services, usedTriggerIds, onToggle, onChange, onDelete }: RuleEditorProps) => {
  const triggerService = services.find((s) => s.id === rule.triggerId);

  const toggleSuggest = (id: string) => {
    const next = rule.suggestIds.includes(id)
      ? rule.suggestIds.filter((s) => s !== id)
      : [...rule.suggestIds, id];
    onChange({ ...rule, suggestIds: next });
  };

  const triggerOptions = services.filter((s) => s.id === rule.triggerId || !usedTriggerIds.includes(s.id));
  const suggestOptions = services.filter((s) => s.id !== rule.triggerId);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-all">
      <div className="px-4 py-3 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider">#{index + 1}</span>
          <span className="text-xs font-medium text-white/70">
            {triggerService?.name ?? "— no trigger selected —"}
          </span>
          {rule.suggestIds.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400/80 border border-amber-400/20">
              {rule.suggestIds.length} add-on{rule.suggestIds.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggle} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="p-1 text-white/20 hover:text-red-400/60 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4 border-t border-white/[0.04]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">Trigger service</label>
                <select
                  value={rule.triggerId}
                  onChange={(e) => onChange({ ...rule, triggerId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 focus:outline-none focus:border-white/20 transition-colors"
                >
                  <option value="" className="bg-zinc-900">— pick a trigger —</option>
                  {triggerOptions.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-900">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">Suggest these add-ons</label>
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
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left transition-all ${
                            checked
                              ? "border-amber-400/30 bg-amber-400/[0.07] text-white/85"
                              : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/60"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                          <span className="text-xs truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Sortable service row ──────────────────────────────────────────────────────
const SortableServiceRow = ({ service, onEdit, onDelete }: { service: Service; onEdit: (s: Service) => void; onDelete: (id: string) => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });
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
      className="group relative flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-white/10 group-hover:text-white/30 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h4 className="text-sm font-semibold text-white/90 truncate">{service.name}</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/40 font-medium">
            {service.category}
          </span>
          {!service.is_active && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/80 font-medium">
              Inactive
            </span>
          )}
        </div>
        {service.description && (
          <p className="text-xs text-white/40 line-clamp-1 mb-1.5">{service.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="text-emerald-400/90">R{service.price}</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40">{service.duration_minutes} min</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
            <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-tight mr-1">Deactivate?</span>
            <button
              onClick={() => { onDelete(service.id); setConfirmDelete(false); }}
              className="px-2.5 py-1 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-semibold transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onEdit(service)}
              className="p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
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

  const [addonRules, setAddonRules] = useState<AddonRule[]>([]);
  const [addonSaved, setAddonSaved] = useState(false);
  const [openRuleIndex, setOpenRuleIndex] = useState<number | null>(null);

  const handleToggleRule = (i: number) => {
    setOpenRuleIndex(prev => (prev === i ? null : i));
  };

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
            (parsed.triggerIds as string[]).map((triggerId: string) => ({ triggerId, suggestIds }))
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
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
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

  const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

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
    <div className="flex flex-col gap-8 pb-12">

      <AdminPageHeader
        title="Services"
        subtitle="Manage your service menu, pricing, durations, and smart add-on suggestions."
      />

      {/* ── Services list ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SectionLabel label={`Services Menu · ${services.length} service${services.length !== 1 ? "s" : ""} across ${categories.length} categories${isDraggable ? " · drag to reorder" : ""}`} />
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Service
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

        {/* Inline edit / create form */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.1] flex flex-col gap-4"
          >
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/30">
              {isNew ? "New Service" : "Edit Service"}
            </p>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">R</span>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 text-xs">min</span>
              </div>
            </div>
            <textarea
              className={`${inputClass} resize-none h-20`}
              placeholder="Description (optional)"
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
                <SaveButton label="Cancel" variant="secondary" onClick={cancelEdit} />
                <SaveButton
                  label="Save Service"
                  loading={upsertMutation.isPending}
                  onClick={saveEdit}
                />
              </div>
            </div>
          </motion.div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search.trim() ? `No services match "${search}"` : "No services yet"}
            description={!search.trim() ? "Add your first service to get started." : "Try a different search term."}
            action={!search.trim() ? { label: "Add your first service", onClick: startNew } : undefined}
          />
        ) : (
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

      {/* ── Suggested add-ons ── */}
      <section className="flex flex-col gap-4 border-t border-white/[0.06] pt-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <SectionLabel label="Suggested Add-ons" />
            </div>
            <p className="text-[11px] text-white/30 max-w-md pl-6">
              Define rules to suggest extra services when a client selects a specific trigger service.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {addonSaved && (
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Saved</span>
            )}
            <button
              onClick={() => {
                const newIndex = addonRules.length;
                setAddonRules([...addonRules, { triggerId: "", suggestIds: [] }]);
                setOpenRuleIndex(newIndex);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/70 text-xs font-bold hover:bg-white/[0.10] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {addonRules.map((rule, i) => (
            <RuleEditor
              key={i}
              index={i}
              rule={rule}
              isOpen={openRuleIndex === i}
              services={serviceOptions}
              usedTriggerIds={usedTriggerIds}
              onToggle={() => handleToggleRule(i)}
              onChange={(updated) => setAddonRules(addonRules.map((r, idx) => (idx === i ? updated : r)))}
              onDelete={() => {
                setAddonRules(addonRules.filter((_, idx) => idx !== i));
                setOpenRuleIndex(prev => (prev === i ? null : prev !== null && prev > i ? prev - 1 : prev));
              }}
            />
          ))}
        </div>

        {addonRules.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="No add-on rules yet"
            description='Click "Add Rule" to start suggesting add-ons when specific services are booked.'
          />
        )}

        {addonRules.length > 0 && (
          <div className="flex justify-end pt-2">
            <SaveButton
              label="Save Add-on Rules"
              loading={upsertSetting.isPending}
              onClick={saveSuggestedAddons}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminServices;
