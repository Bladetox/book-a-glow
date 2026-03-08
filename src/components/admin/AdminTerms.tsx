import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";

interface TermsSection {
  id: string;
  title: string;
  content: string;
}

const STORAGE_KEY = "pb_terms_and_conditions";

const defaultSections: TermsSection[] = [
  {
    id: "booking",
    title: "Booking & Deposits",
    content:
      "A 50% deposit is required to confirm your booking. Deposits are non-refundable unless cancelled more than 48 hours before your appointment. The remaining balance is due on the day of your appointment.",
  },
  {
    id: "cancellation",
    title: "Cancellation & Rescheduling",
    content:
      "Cancellations made less than 24 hours before your appointment will forfeit the full deposit. Rescheduling is allowed up to 24 hours in advance, subject to availability. No-shows will be charged the full service amount.",
  },
  {
    id: "late",
    title: "Late Arrivals",
    content:
      "If you are more than 15 minutes late, your appointment may be shortened or rescheduled at the therapist's discretion. The full service fee will still apply.",
  },
  {
    id: "health",
    title: "Health & Safety",
    content:
      "Clients must complete a consultation form before their first appointment. You must disclose any medical conditions, allergies, medications, or skin sensitivities. PhenomeBeauty reserves the right to refuse service if it is deemed unsafe.",
  },
  {
    id: "callout",
    title: "Call-Out Fee",
    content:
      "A call-out fee is calculated based on the round-trip distance from our base at R3.60 per kilometre. This fee is non-refundable and is included in your total quote.",
  },
  {
    id: "results",
    title: "Results & Liability",
    content:
      "Results may vary between individuals. PhenomeBeauty is not liable for adverse reactions if the client has failed to disclose relevant medical or skin information. Aftercare instructions must be followed for optimal results.",
  },
  {
    id: "privacy",
    title: "Privacy & Data",
    content:
      "Your personal information is collected solely for booking and consultation purposes. We will never share your data with third parties without your consent. Photos may be taken for records with your permission only.",
  },
];

// --- Store ---
let cache: TermsSection[] | null = null;
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

function getSections(): TermsSection[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [...defaultSections];
  } catch {
    cache = [...defaultSections];
  }
  return cache!;
}

function saveSections(sections: TermsSection[]) {
  cache = sections;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Public hook for booking app
export function useTermsSections(): TermsSection[] {
  return useSyncExternalStore(subscribe, getSections, getSections);
}

// --- Component ---
const AdminTerms = () => {
  const sections = useTermsSections();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const startEdit = (s: TermsSection) => {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditContent(s.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    saveSections(
      sections.map((s) =>
        s.id === editingId ? { ...s, title: editTitle.trim(), content: editContent.trim() } : s
      )
    );
    cancelEdit();
  };

  const addSection = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    saveSections([
      ...sections,
      { id: crypto.randomUUID(), title: newTitle.trim(), content: newContent.trim() },
    ]);
    setNewTitle("");
    setNewContent("");
    setIsAdding(false);
  };

  const deleteSection = (id: string) => {
    saveSections(sections.filter((s) => s.id !== id));
    if (editingId === id) cancelEdit();
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    saveSections(next);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    saveSections([...defaultSections]);
    setConfirmReset(false);
    cancelEdit();
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h3 className="text-base font-semibold text-white/90">Terms & Conditions</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {sections.length} section{sections.length !== 1 ? "s" : ""} — displayed to clients before payment
          </p>
        </div>
        <div className="flex gap-2">
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
            onClick={() => setIsAdding(true)}
            className="text-xs px-4 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-colors flex items-center gap-1.5 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Section
          </motion.button>
        </div>
      </div>

      {/* Add new section form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/[0.04] border border-white/[0.1] rounded-2xl p-4 flex flex-col gap-3"
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">New Section</p>
            <input
              className={inputClass}
              placeholder="Section title *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="Section content *"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setIsAdding(false); setNewTitle(""); setNewContent(""); }}
                className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/70 text-sm transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={addSection}
                className="px-4 py-2 rounded-xl bg-white/[0.12] text-white text-sm font-medium hover:bg-white/[0.18] transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sections list */}
      <div className="flex flex-col gap-2">
        {sections.length === 0 && (
          <p className="text-sm text-white/30 text-center py-8">No sections yet</p>
        )}
        {sections.map((s, i) => (
          <motion.div
            key={s.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 group"
          >
            {editingId === s.id ? (
              <div className="flex flex-col gap-3">
                <input
                  className={inputClass}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Section title"
                />
                <textarea
                  className={`${inputClass} min-h-[100px] resize-y`}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Section content"
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
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveSection(i, -1)}
                    disabled={i === 0}
                    className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSection(i, 1)}
                    disabled={i === sections.length - 1}
                    className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEdit(s)}>
                  <h4 className="text-sm font-semibold text-white/90">{s.title}</h4>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed line-clamp-3">{s.content}</p>
                </div>

                <button
                  onClick={() => deleteSection(s.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminTerms;
