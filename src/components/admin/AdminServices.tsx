import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, Check, Search, ChevronDown,
  Loader2, GripVertical, X, Sparkles
} from "lucide-react";

import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";

import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  useSupabaseServices,
  useServiceCategories,
  useUpsertService,
  useDeleteService,
  type Service
} from "@/hooks/useSupabaseServices";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import type { AddonRule } from "@/hooks/useSuggestedAddons";
import { toast } from "sonner";

/* ───────────────────────────────────────────────────────────── */
/* UI COMPONENTS (MATCH SETTINGS) */
/* ───────────────────────────────────────────────────────────── */

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

const SettingsCard = ({
  title,
  icon: Icon,
  gradient,
  children,
  rightContent,
  collapsible = false,
  defaultOpen = true,
}: any) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${gradient} border border-white/[0.05] overflow-hidden`}>
      <div
        className={`flex items-center gap-3 p-5 ${collapsible ? "cursor-pointer" : ""}`}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        {Icon && (
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
        )}
        <h4 className="text-sm font-bold text-white/80 flex-1">{title}</h4>
        {rightContent}
      </div>

      {(!collapsible || open) && (
        <div className="px-5 pb-5 flex flex-col gap-5">
          {children}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────────────────────────────────────────── */
/* SORTABLE ROW */
/* ───────────────────────────────────────────────────────────── */

const SortableServiceRow = ({ service, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: service.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-white/20">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex-1">
        <h4 className="text-sm text-white/90">{service.name}</h4>
        <p className="text-xs text-white/40">{service.duration_minutes} min · R{service.price}</p>
      </div>

      <button onClick={() => onEdit(service)} className="text-white/40">
        <Pencil className="w-4 h-4" />
      </button>

      <button onClick={() => onDelete(service.id)} className="text-red-400">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────── */
/* MAIN */
/* ───────────────────────────────────────────────────────────── */

const AdminServices = () => {
  const { data: services = [] } = useSupabaseServices();
  const { data: categories = [] } = useServiceCategories();
  const upsert = useUpsertService();
  const del = useDeleteService();
  const { tenantId } = useTenant();
  const { data: appSettings = {} } = useAppSettings();
  const upsertSetting = useUpsertAppSetting();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [addonRules, setAddonRules] = useState<AddonRule[]>([]);

  /* ── FILTERED LIST */
  const filtered = useMemo(() => {
    return services.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [services, search]);

  /* ── DRAG */
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = services.map(s => s.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);

    const newOrder = arrayMove(ids, oldIndex, newIndex);

    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from("services")
        .update({ display_order: i })
        .eq("id", newOrder[i])
        .eq("tenant_id", tenantId);
    }
  }, [services, tenantId]);

  /* ── EDIT */
  const save = () => {
    upsert.mutate(editing);
    setEditing(null);
  };

  /* ───────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-8 pb-12">

      {/* SERVICES */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Services Menu" />

        <SettingsCard
          title="Your Services"
          icon={Sparkles}
          gradient="from-white/[0.05] to-white/[0.02]"
          rightContent={
            <button
              onClick={() => {
                setEditing({ name: "", price: "", duration_minutes: "" });
                setIsNew(true);
              }}
              className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold"
            >
              <Plus className="w-3 h-3 inline mr-1" /> Add
            </button>
          }
        >
          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-white/20" />
            <input
              className="w-full pl-9 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* LIST */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {filtered.map(s => (
                  <SortableServiceRow
                    key={s.id}
                    service={s}
                    onEdit={(s: any) => setEditing(s)}
                    onDelete={(id: string) => del.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </SettingsCard>
      </section>

      {/* EDITOR */}
      {editing && (
        <section className="flex flex-col gap-3">
          <SectionLabel label={isNew ? "New Service" : "Edit Service"} />

          <SettingsCard
            title="Service Details"
            icon={Pencil}
            gradient="from-white/[0.05] to-white/[0.02]"
          >
            <input
              placeholder="Name"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="input"
            />

            <input
              placeholder="Price"
              value={editing.price}
              onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              className="input"
            />

            <input
              placeholder="Duration"
              value={editing.duration_minutes}
              onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })}
              className="input"
            />

            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="text-white/40">
                Cancel
              </button>

              <button
                onClick={save}
                className="px-4 py-2 bg-white text-black rounded-xl"
              >
                Save
              </button>
            </div>
          </SettingsCard>
        </section>
      )}

      {/* ADD-ONS */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Smart Add-ons" />

        <SettingsCard
          title="Suggested Add-ons"
          icon={Sparkles}
          gradient="from-amber-500/[0.05] to-white/[0.02]"
          collapsible
        >
          <button
            onClick={() =>
              setAddonRules([...addonRules, { triggerId: "", suggestIds: [] }])
            }
            className="px-3 py-2 bg-white/10 rounded-xl text-xs"
          >
            Add Rule
          </button>

          <button
            onClick={() =>
              upsertSetting.mutate({
                suggested_addons: JSON.stringify({ rules: addonRules }),
              })
            }
            className="px-4 py-2 bg-amber-400 text-black rounded-xl"
          >
            Save Rules
          </button>
        </SettingsCard>
      </section>
    </div>
  );
};

export default AdminServices;
