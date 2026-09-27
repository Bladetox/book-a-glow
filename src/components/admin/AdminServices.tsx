// C8 — Category Order rows now have inline confirm-delete; per-category service reorder manual save
// C9 — Trash only when the reference map reports zero references; Archive otherwise.
//      Archived filter, Restore action, and fail-closed reference gating.
//
// Archived services are excluded from the picker views below (category reorder,
// the all-services drag list) and appear only under the Archived filter option.
// This is intentional: archived services aren't offered for new bookings, and
// the reorder views exist to control booking-flow ordering. The category count
// and category list therefore reflect active, non-archived services only.
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AdminPageHeader,
  SectionLabel,
  SaveButton,
  EmptyState,
} from "@/components/admin/AdminSharedUI";
import {
  Plus, Pencil, Trash2, Check, Search,
  ChevronDown, ChevronUp, GripVertical, X, Sparkles,
  ArrowUp, ArrowDown, Archive, ArchiveRestore,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useSupabaseServices, useServiceCategories,
  useUpsertService, useDeleteService, useServiceReferences, useArchiveService,
  type Service,
} from "@/hooks/useSupabaseServices";
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
  customCategory: string;
  is_active: boolean;
}

const emptyService = (): EditingService => ({
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
  category: "",
  customCategory: "",
  is_active: true,
});

const NEW_CATEGORY_SENTINEL = "__new__";
const ARCHIVED_FILTER = "__archived__";

const SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  restSpeed: 0.5,
  restDelta: 0.5,
};

// ── Shared row actions (Edit / Delete / Archive / Restore) ────────────────────
interface ServiceRowActionsProps {
  service: Service;
  canDelete: boolean;
  referencesReady: boolean;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
}

const ServiceRowActions = ({
  service, canDelete, referencesReady, onEdit, onDelete, onArchive,
}: ServiceRowActionsProps) => {
  const [confirm, setConfirm] = useState<null | "delete" | "archive" | "restore">(null);

  // Archived → Restore only. No edit, delete, or archive churn on archived rows.
  if (service.is_archived) {
    if (confirm === "restore") {
      return (
        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
          <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-tight mr-1">Restore?</span>
          <button
            onClick={() => { onArchive(service.id, false); setConfirm(null); }}
            className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-semibold transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            aria-label="Cancel restore"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setConfirm("restore")}
        className="p-2 rounded-xl hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-colors"
        aria-label={`Restore ${service.name}`}
        title="Restore"
      >
        <ArchiveRestore className="w-3.5 h-3.5" />
      </button>
    );
  }

  if (confirm === "delete") {
    return (
      <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
        <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-tight mr-1">Delete forever?</span>
        <button
          onClick={() => { onDelete(service.id); setConfirm(null); }}
          className="px-2.5 py-1 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-semibold transition-colors"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirm(null)}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
          aria-label="Cancel delete"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (confirm === "archive") {
    return (
      <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
        <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-tight mr-1">Archive?</span>
        <button
          onClick={() => { onArchive(service.id, true); setConfirm(null); }}
          className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-[11px] font-semibold transition-colors"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirm(null)}
          className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
          aria-label="Cancel archive"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Non-archived: Trash when the reference map has confirmed zero references
  // AND the map query has succeeded; Archive otherwise. Fail-closed: while the
  // map is loading or errored, Archive is shown instead of Trash, so the UI
  // never offers an action the guarded delete would refuse.
  const showTrash = canDelete && referencesReady;

  return (
    <>
      <button
        onClick={() => onEdit(service)}
        className="p-2 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
        aria-label={`Edit ${service.name}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {showTrash ? (
        <button
          onClick={() => setConfirm("delete")}
          className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
          aria-label={`Permanently delete ${service.name}`}
          title="Permanently delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setConfirm("archive")}
          className="p-2 rounded-xl hover:bg-amber-500/10 text-white/40 hover:text-amber-400 transition-colors"
          aria-label={`Archive ${service.name}`}
          title="Archive"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      )}
    </>
  );
};

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

const RuleEditor = ({
  rule, index, isOpen, services, usedTriggerIds,
  onToggle, onChange, onDelete,
}: RuleEditorProps) => {
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

// ── Arrow-reorder service row (used inside category reorder panel) ─────────────
interface ServiceReorderRowProps {
  service: Service;
  index: number;
  total: number;
  canDelete: boolean;
  referencesReady: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
}

const ServiceReorderRow = ({
  service, index, total, canDelete, referencesReady,
  onMoveUp, onMoveDown, onEdit, onDelete, onArchive,
}: ServiceReorderRowProps) => {
  return (
    <div className="group flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all">
      <span className="text-[10px] font-bold text-white/20 w-4 shrink-0 tabular-nums">{index + 1}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white/90 truncate">{service.name}</span>
          {!service.is_active && !service.is_archived && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/80 font-medium">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium mt-0.5">
          <span className="text-emerald-400/90">R{service.price}</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40">{service.duration_minutes} min</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none transition-colors"
          aria-label={`Move ${service.name} up`}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none transition-colors"
          aria-label={`Move ${service.name} down`}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-l border-white/[0.06] pl-2">
        <ServiceRowActions
          service={service}
          canDelete={canDelete}
          referencesReady={referencesReady}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
        />
      </div>
    </div>
  );
};

// ── Sortable service row (used in the all-services drag list) ─────────────────
const SortableServiceRow = ({
  service, canDelete, referencesReady, onEdit, onDelete, onArchive,
}: {
  service: Service;
  canDelete: boolean;
  referencesReady: boolean;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });
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
            {service.category.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
          {!service.is_active && !service.is_archived && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/80 font-medium">
              Inactive
            </span>
          )}
          {service.is_archived && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/80 font-medium">
              Archived
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
        <ServiceRowActions
          service={service}
          canDelete={canDelete}
          referencesReady={referencesReady}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
        />
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminServices = () => {
  const { data: services = [], isLoading } = useSupabaseServices();
  const { data: appSettings = {}, isSuccess: appSettingsReady } = useAppSettings();
  const {
    data: references,
    isSuccess: referencesReady,
    isError: referencesError,
  } = useServiceReferences();
  const upsertSetting = useUpsertAppSetting();
  const { tenantId } = useTenant();
  const upsertMutation = useUpsertService();
  const deleteMutation = useDeleteService();
  const archiveMutation = useArchiveService();

  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutate(id),
    [deleteMutation]
  );
  const handleArchive = useCallback(
    (id: string, archived: boolean) => archiveMutation.mutate({ id, archived }),
    [archiveMutation]
  );
  // Fail-closed: Trash only when the map has succeeded AND reported zero
  // references. While loading or errored, callers get false and render
  // Archive instead. The referencesReady prop gates the same decision in
  // the row so a stale canDelete during load can't show Trash.
  const canDelete = useCallback(
    (s: Service) => !s.is_archived && (references?.get(s.id) ?? 0) === 0,
    [references]
  );

  // ── Saved category order ──────────────────────────────────────────────────
  const savedCategoryOrder = useMemo<string[]>(() => {
    if (!appSettingsReady) return [];
    try {
      if (appSettings.category_order) {
        const parsed = JSON.parse(appSettings.category_order);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {
      // ignore malformed JSON
    }
    return [];
  }, [appSettingsReady, appSettings.category_order]);

  const { data: categories = [] } = useServiceCategories(savedCategoryOrder);

  // ── Local category order (unsaved UI state) ───────────────────────────────
  const [localCatOrder, setLocalCatOrder] = useState<string[] | null>(null);
  const [catOrderSaved, setCatOrderSaved] = useState(false);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!appSettingsReady || categories.length === 0) return;
    if (seededRef.current) return;
    seededRef.current = true;
    setLocalCatOrder(categories.map((c) => c.id));
  }, [appSettingsReady, categories]);

  useEffect(() => {
    if (!appSettingsReady) {
      seededRef.current = false;
    }
  }, [appSettingsReady]);

  const orderedCategories = useMemo(() => {
    if (!localCatOrder) return categories;
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const inOrder = localCatOrder
      .map((id) => catMap.get(id))
      .filter(Boolean) as typeof categories;
    const extras = categories.filter((c) => !localCatOrder.includes(c.id));
    return [...inOrder, ...extras];
  }, [categories, localCatOrder]);

  const moveCategoryUp = (index: number) => {
    if (index === 0) return;
    setLocalCatOrder((prev) => {
      const ids = prev ?? orderedCategories.map((c) => c.id);
      const next = [...ids];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveCategoryDown = (index: number) => {
    setLocalCatOrder((prev) => {
      const ids = prev ?? orderedCategories.map((c) => c.id);
      if (index >= ids.length - 1) return ids;
      const next = [...ids];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const saveCategoryOrder = () => {
    const ids = localCatOrder ?? orderedCategories.map((c) => c.id);
    upsertSetting.mutate(
      { category_order: JSON.stringify(ids) },
      {
        onSuccess: () => {
          seededRef.current = false;
          setCatOrderSaved(true);
          setTimeout(() => setCatOrderSaved(false), 3500);
        },
      }
    );
  };

  const deleteCategory = useCallback(async (catId: string) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from("services")
      .update({ is_active: false })
      .eq("category", catId)
      .eq("tenant_id", tenantId);
    if (error) {
      toast.error("Could not deactivate services — try again");
      return;
    }
    setLocalCatOrder((prev) => {
      const ids = prev ?? orderedCategories.map((c) => c.id);
      return ids.filter((id) => id !== catId);
    });
    const newIds = (localCatOrder ?? orderedCategories.map((c) => c.id)).filter((id) => id !== catId);
    upsertSetting.mutate({ category_order: JSON.stringify(newIds) });
    setConfirmDeleteCatId(null);
    setReorderCatId((prev) => (prev === catId ? null : prev));
    toast.success("Category deleted and its services deactivated");
  }, [tenantId, localCatOrder, orderedCategories, upsertSetting]);

  // ── Per-category service reorder — LOCAL STATE, manual save ──────────────
  const [reorderCatId, setReorderCatId] = useState<string | null>(null);
  const [localSvcOrder, setLocalSvcOrder] = useState<Map<string, Service[]>>(new Map());
  const [svcOrderSaving, setSvcOrderSaving] = useState(false);
  const [svcOrderSaved, setSvcOrderSaved] = useState(false);

  const openReorderCategory = (catId: string | null) => {
    setReorderCatId(catId);
    if (!catId) return;
    setLocalSvcOrder((prev) => {
      if (prev.has(catId)) return prev;
      // Archived services are intentionally excluded from this reorder view.
      // They aren't offered in the booking flow, and this panel exists to
      // control booking-flow ordering. Archived services are surfaced only
      // under the Archived filter in the section below.
      const sorted = services
        .filter((s) => s.category === catId && !s.is_archived)
        .sort((a, b) => {
          const ao = a.display_order ?? 999999;
          const bo = b.display_order ?? 999999;
          if (ao !== bo) return ao - bo;
          return a.name.localeCompare(b.name);
        });
      const next = new Map(prev);
      next.set(catId, sorted);
      return next;
    });
  };

  const reorderCatServices: Service[] = reorderCatId
    ? (localSvcOrder.get(reorderCatId) ?? [])
    : [];

  const moveServiceUp = (index: number) => {
    if (!reorderCatId || index === 0) return;
    setLocalSvcOrder((prev) => {
      const list = [...(prev.get(reorderCatId) ?? [])];
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
      const next = new Map(prev);
      next.set(reorderCatId, list);
      return next;
    });
  };

  const moveServiceDown = (index: number) => {
    if (!reorderCatId) return;
    setLocalSvcOrder((prev) => {
      const list = [...(prev.get(reorderCatId) ?? [])];
      if (index >= list.length - 1) return prev;
      [list[index], list[index + 1]] = [list[index + 1], list[index]];
      const next = new Map(prev);
      next.set(reorderCatId, list);
      return next;
    });
  };

  const saveServiceOrder = useCallback(async () => {
    if (!reorderCatId || !tenantId) return;
    const list = localSvcOrder.get(reorderCatId);
    if (!list || list.length === 0) return;
    setSvcOrderSaving(true);
    try {
      await Promise.all(
        list.map((svc, idx) =>
          supabase
            .from("services")
            .update({ display_order: idx })
            .eq("id", svc.id)
            .eq("tenant_id", tenantId)
        )
      );
      setSvcOrderSaved(true);
      setTimeout(() => setSvcOrderSaved(false), 3500);
    } catch {
      toast.error("Could not save order — try again");
    } finally {
      setSvcOrderSaving(false);
    }
  }, [reorderCatId, localSvcOrder, tenantId]);

  const prevServicesRef = useRef(services);
  useEffect(() => {
    if (prevServicesRef.current !== services) {
      prevServicesRef.current = services;
      setLocalSvcOrder(new Map());
    }
  }, [services]);

  // ── Filtering / searching (all-services view) ─────────────────────────────
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingService | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  const [addonRules, setAddonRules] = useState<AddonRule[]>([]);
  const [addonSaved, setAddonSaved] = useState(false);
  const [openRuleIndex, setOpenRuleIndex] = useState<number | null>(null);

  const handleToggleRule = (i: number) => {
    setOpenRuleIndex((prev) => (prev === i ? null : i));
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

  // Non-archived services form the drag-order universe.
  const activeServices = useMemo(
    () => services.filter((s) => !s.is_archived),
    [services]
  );

  const baseList = useMemo(() => {
    if (!orderedIds) return activeServices;
    const map = new Map(activeServices.map((s) => [s.id, s]));
    const ordered = orderedIds.map((id) => map.get(id)).filter(Boolean) as Service[];
    const inOrder = new Set(orderedIds);
    const extras = activeServices.filter((s) => !inOrder.has(s.id));
    return [...ordered, ...extras];
  }, [activeServices, orderedIds]);

  const filtered = useMemo(() => {
    if (filterCategory === ARCHIVED_FILTER) {
      let archived = services.filter((s) => s.is_archived);
      if (search.trim()) {
        const q = search.toLowerCase();
        archived = archived.filter(
          (t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
        );
      }
      return archived;
    }
    let list = baseList;
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, services, filterCategory, search]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIds = orderedIds ?? activeServices.map((s) => s.id);
    const oldIndex = currentIds.indexOf(active.id as string);
    const newIndex = currentIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(currentIds, oldIndex, newIndex);
    setOrderedIds(newOrder);
    try {
      for (const [idx, id] of newOrder.entries()) {
        await supabase
          .from("services")
          .update({ display_order: idx })
          .eq("id", id)
          .eq("tenant_id", tenantId);
      }
    } catch {
      toast.error("Could not save order — try again");
    }
  }, [orderedIds, activeServices, tenantId]);

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
      customCategory: "",
      is_active: t.is_active,
    });
    setIsNew(false);
  };

  const startNew = () => {
    setEditing({
      ...emptyService(),
      category:
        filterCategory === "all" || filterCategory === ARCHIVED_FILTER
          ? (categories[0]?.id || "")
          : filterCategory,
    });
    setIsNew(true);
  };

  const cancelEdit = () => { setEditing(null); setIsNew(false); };

  const saveEdit = () => {
    if (!editing) return;
    if (!tenantId) {
      toast.error("Tenant not ready — please wait a moment and try again.");
      return;
    }
    const price = parseFloat(editing.price);
    const duration = parseInt(editing.duration_minutes, 10);
    const resolvedCategory =
      editing.category === NEW_CATEGORY_SENTINEL
        ? editing.customCategory.trim().toLowerCase().replace(/\s+/g, "-")
        : editing.category;
    if (!editing.name.trim()) { toast.error("Service name is required."); return; }
    if (isNaN(price) || price < 0) { toast.error("Enter a valid price."); return; }
    if (isNaN(duration) || duration <= 0) { toast.error("Enter a valid duration."); return; }
    if (!resolvedCategory) { toast.error("Please select or enter a category."); return; }
    upsertMutation.mutate(
      {
        id: isNew ? undefined : editing.id,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        price,
        duration_minutes: duration,
        category: resolvedCategory,
        is_active: editing.is_active,
        display_order: isNew ? activeServices.length : undefined,
      },
      { onSuccess: cancelEdit }
    );
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

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
  const serviceOptions = activeServices.map((s) => ({ id: s.id, name: s.name }));
  const usedTriggerIds = addonRules.map((r) => r.triggerId).filter(Boolean);
  const hasArchived = services.some((s) => s.is_archived);

  return (
    <div className="flex flex-col gap-8 pb-12">

      <AdminPageHeader
        title="Services"
        subtitle="Manage your service menu, pricing, durations, and smart add-on suggestions."
      />

      {/* ═══ SECTION 1: Category Order ══════════════════════════════════════ */}
      {orderedCategories.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel label="Category Order" />
            <div className="flex items-center gap-3">
              {catOrderSaved && (
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Saved</span>
              )}
              <SaveButton
                label="Save Order"
                loading={upsertSetting.isPending}
                onClick={saveCategoryOrder}
              />
            </div>
          </div>
          <p className="text-[11px] text-white/30 -mt-1">
            Set the order your categories appear in the booking flow. Changes go live after Save Order.
          </p>
          <div className="flex flex-col gap-1.5">
            {orderedCategories.map((cat, idx) => {
              const isConfirming = confirmDeleteCatId === cat.id;
              const svcCount = activeServices.filter((s) => s.category === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <span className="text-[10px] font-bold text-white/20 w-4 shrink-0 tabular-nums">{idx + 1}</span>
                  <span className="flex-1 text-sm font-medium text-white/70">{cat.label}</span>
                  <span className="text-[10px] text-white/25 tabular-nums shrink-0">
                    {svcCount} service{svcCount !== 1 ? "s" : ""}
                  </span>

                  {!isConfirming && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveCategoryUp(idx)}
                        disabled={idx === 0}
                        className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        aria-label={`Move ${cat.label} up`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveCategoryDown(idx)}
                        disabled={idx === orderedCategories.length - 1}
                        className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        aria-label={`Move ${cat.label} down`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 border-l border-white/[0.06] pl-2">
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                        <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-tight mr-1">Delete?</span>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="px-2.5 py-1 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] font-semibold transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCatId(null)}
                          className="p-1.5 rounded-xl hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteCatId(cat.id)}
                        className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                        aria-label={`Delete ${cat.label}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ SECTION 2: Per-category service reorder ════════════════════════ */}
      <section className="flex flex-col gap-3 border-t border-white/[0.06] pt-6">
        <div className="flex items-center justify-between">
          <SectionLabel label="Reorder Services by Category" />
          {reorderCatId && (
            <div className="flex items-center gap-3">
              {svcOrderSaved && (
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Saved</span>
              )}
              <SaveButton
                label="Save Order"
                loading={svcOrderSaving}
                onClick={saveServiceOrder}
              />
            </div>
          )}
        </div>
        <p className="text-[11px] text-white/30 -mt-1">
          Select a category, use ↑ ↓ to reorder its services, then click Save Order.
        </p>

        <div className="flex flex-wrap gap-2">
          {orderedCategories.map((cat) => {
            const isActive = reorderCatId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => openReorderCategory(isActive ? null : cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-white/[0.10] border-white/[0.20] text-white/90"
                    : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:border-white/[0.15] hover:text-white/70"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {reorderCatId && (
            <motion.div
              key={reorderCatId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-1.5"
            >
              {reorderCatServices.length === 0 ? (
                <p className="text-xs text-white/25 py-3 text-center">No services in this category.</p>
              ) : (
                reorderCatServices.map((svc, idx) => (
                  <ServiceReorderRow
                    key={svc.id}
                    service={svc}
                    index={idx}
                    total={reorderCatServices.length}
                    canDelete={canDelete(svc)}
                    referencesReady={referencesReady}
                    onMoveUp={() => moveServiceUp(idx)}
                    onMoveDown={() => moveServiceDown(idx)}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ═══ SECTION 3: Full services list with search / filter / drag ══════ */}
      <section className="flex flex-col gap-4 border-t border-white/[0.06] pt-6">
        <div className="flex items-center justify-between">
          <SectionLabel
            label={`All Services · ${activeServices.length} service${
              activeServices.length !== 1 ? "s" : ""
            } across ${categories.length} ${
              categories.length !== 1 ? "categories" : "category"
            }${isDraggable ? " · drag to reorder" : ""}`}
          />
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Service
          </button>
        </div>

        {referencesError && (
          <p role="alert" className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
            Reference counts are unavailable. Trash is hidden until this reloads; Archive is offered instead.
          </p>
        )}

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
              {orderedCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
              {hasArchived && (
                <option value={ARCHIVED_FILTER}>Archived</option>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
          </div>
        </div>

        <AnimatePresence>
          {editing && (
            <>
              <motion.div
                key="edit-service-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={cancelEdit}
                aria-hidden="true"
              />

              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
                <motion.div
                  key="edit-service-panel"
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 10 }}
                  transition={SPRING}
                  style={{ willChange: "transform" }}
                  className="pointer-events-auto w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-[#161616] to-[#0f0f0f] border border-white/[0.1] shadow-2xl p-5 flex flex-col gap-4"
                >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/30">
                {isNew ? "New Service" : "Edit Service"}
              </p>
              <button
                onClick={cancelEdit}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className={inputClass}
                placeholder="Name *"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <div className="flex flex-col gap-2">
                <select
                  className={inputClass}
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value, customCategory: "" })}
                >
                  <option value="">Select Category *</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                  <option value={NEW_CATEGORY_SENTINEL}>＋ Add new category…</option>
                </select>
                {editing.category === NEW_CATEGORY_SENTINEL && (
                  <input
                    className={inputClass}
                    placeholder="Type your category name *"
                    autoFocus
                    value={editing.customCategory}
                    onChange={(e) => setEditing({ ...editing, customCategory: e.target.value })}
                  />
                )}
              </div>
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
                  min="1"
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
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editing.is_active}
                  onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    editing.is_active ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      editing.is_active ? "translate-x-[18px]" : "translate-x-1"
                    }`}
                  />
                </button>
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
              </div>
            </>
          )}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              search.trim()
                ? `No services match "${search}"`
                : filterCategory === ARCHIVED_FILTER
                  ? "No archived services"
                  : "No services yet"
            }
            description={
              search.trim()
                ? "Try a different search term."
                : filterCategory === ARCHIVED_FILTER
                  ? "Services with references appear here when archived."
                  : "Add your first service to get started."
            }
            action={
              !search.trim() && filterCategory !== ARCHIVED_FILTER ? (
                <button
                  onClick={startNew}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add your first service
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {isDraggable ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {filtered.map((s) => (
                    <SortableServiceRow
                      key={s.id}
                      service={s}
                      canDelete={canDelete(s)}
                      referencesReady={referencesReady}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                      onArchive={handleArchive}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              filtered.map((s) => (
                <SortableServiceRow
                  key={s.id}
                  service={s}
                  canDelete={canDelete(s)}
                  referencesReady={referencesReady}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* ═══ SECTION 4: Suggested add-ons ═══════════════════════════════════ */}
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
                setOpenRuleIndex((prev) =>
                  prev === i ? null : prev !== null && prev > i ? prev - 1 : prev
                );
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
