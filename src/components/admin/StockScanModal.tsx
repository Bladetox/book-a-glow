import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, FileText, Loader2, Check, Trash2,
  ScanLine, AlertTriangle, Upload,
} from "lucide-react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// Point PDF.js worker to the CDN bundle — no local worker file needed
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ─────────────────────────────────────────────────────────────────────────────

interface ScannedRow {
  item_name: string;
  qty: number;
  cost: number;
}

interface Props {
  tenantId: string;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER — tuned to Logica Beauty invoice format + generic fallback
// Handles:  "Description   Qty   Unit   UnitPrice   Disc   Tax   NettPrice"
// Also handles plain  "Item Name  qty  R120.00"  lines
// ─────────────────────────────────────────────────────────────────────────────

function parseInvoiceText(raw: string): ScannedRow[] {
  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 3);

  const results: ScannedRow[] = [];

  // Regex: capture trailing numbers — last two are qty + unit_price (or unit_price alone)
  // Matches lines like:  "Film Wax Pour Homme ItalWax1kg  2.0000  1kg  265.00  69.13  530.00"
  // and simpler:         "Nitrile Gloves 100s  1  100.00"
  const lineRe = /^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:[^\s]+\s+)?(\d+(?:\.\d+)?)(?:\s+[\d.]+)*\s*$/;

  // Simpler fallback: "Description ... R?price" — qty defaults to 1
  const simplePriceRe = /^(.+?)\s+R?\s*(\d{1,6}(?:\.\d{1,2})?)\s*$/i;

  // Skip known header/footer noise words
  const SKIP = [
    /^(code|description|quantity|unit|price|disc|tax|nett|total|amount|sub|vat|payment|signed|date|please|bank|account|branch|refer|terms|warranty|all\s|eft|proof|goods|reg|tel|fax)/i,
    /^(\d{1,2}\/\d{1,2}\/\d{4})/,  // date rows
    /^[A-Z]\d{3,}/,                  // product codes like I005H, W316
    /^R?\d+\.\d{2}$/,                // bare price rows
    /^(inclusive|store|cape\s|unit\s|monti|logica|shu-|phenom|\d+\s+[a-z]{2,}\s+\d{4})/i,
  ];

  for (const line of lines) {
    if (SKIP.some(r => r.test(line))) continue;

    const m1 = lineRe.exec(line);
    if (m1) {
      const name = m1[1].replace(/[^\w\s().\-]/g, "").trim();
      const qty  = parseFloat(m1[2]);
      const cost = parseFloat(m1[3]);
      if (name.length > 2 && cost > 0 && qty > 0) {
        results.push({ item_name: name, qty, cost });
        continue;
      }
    }

    const m2 = simplePriceRe.exec(line);
    if (m2) {
      const name = m2[1].replace(/[^\w\s().\-]/g, "").trim();
      const cost = parseFloat(m2[2]);
      if (name.length > 2 && cost > 0) {
        results.push({ item_name: name, qty: 1, cost });
      }
    }
  }

  // Deduplicate by item_name (case-insensitive) — keep first occurrence
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.item_name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF → canvas → dataURL helper
// ─────────────────────────────────────────────────────────────────────────────

async function pdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page   = await pdf.getPage(i);
    const vp     = page.getViewport({ scale: 2.5 }); // hi-res for OCR accuracy
    const canvas  = document.createElement("canvas");
    canvas.width  = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    images.push(canvas.toDataURL("image/png"));
  }
  return images;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type Stage = "idle" | "scanning" | "review" | "saving";

const StockScanModal = ({ tenantId, onClose }: Props) => {
  const qc = useQueryClient();

  const [stage, setStage]       = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [rows, setRows]         = useState<ScannedRow[]>([]);
  const [rawText, setRawText]   = useState("");

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // ── OCR pipeline ─────────────────────────────────────────────────────────

  const runOcr = useCallback(async (images: string[]) => {
    setStage("scanning");
    setProgress(0);

    const worker = await createWorker("eng", 1, {
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          setProgress(Math.round(m.progress * 100));
        }
      },
    });

    let combined = "";
    for (const img of images) {
      const { data } = await worker.recognize(img);
      combined += data.text + "\n";
    }
    await worker.terminate();

    setRawText(combined);
    const parsed = parseInvoiceText(combined);

    if (parsed.length === 0) {
      toast.warning("No items detected. Try a clearer image or adjust manually.");
    }

    setRows(parsed);
    setStage("review");
  }, []);

  const handleCamera = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await runOcr([URL.createObjectURL(file)]);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type === "application/pdf") {
      try {
        const images = await pdfToImages(file);
        await runOcr(images);
      } catch (err: any) {
        toast.error("Could not read PDF: " + err.message);
        setStage("idle");
      }
    } else {
      await runOcr([URL.createObjectURL(file)]);
    }
  };

  // ── Row editing ──────────────────────────────────────────────────────────

  const updateRow = (i: number, field: keyof ScannedRow, val: string) => {
    setRows(prev => prev.map((r, idx) =>
      idx === i ? { ...r, [field]: field === "item_name" ? val : parseFloat(val) || 0 } : r
    ));
  };

  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const addRow = () => setRows(prev => [...prev, { item_name: "", qty: 1, cost: 0 }]);

  // ── Upsert to Supabase ───────────────────────────────────────────────────

  const handleImport = async () => {
    const valid = rows.filter(r => r.item_name.trim() && r.cost > 0);
    if (valid.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setStage("saving");

    try {
      // Fetch existing stock for this tenant to check for name matches
      const { data: existing, error: fetchErr } = await supabase
        .from("stock_inventory")
        .select("id, item_name, stock_on_hand")
        .eq("tenant_id", tenantId);

      if (fetchErr) throw fetchErr;

      const existingMap = new Map(
        (existing ?? []).map(e => [e.item_name.toLowerCase().trim(), e])
      );

      let inserted = 0;
      let updated  = 0;

      for (const row of valid) {
        const key     = row.item_name.toLowerCase().trim();
        const match   = existingMap.get(key);

        if (match) {
          // UPDATE: add scanned qty on top, update cost
          const { error } = await supabase
            .from("stock_inventory")
            .update({
              cost:          row.cost,
              stock_on_hand: match.stock_on_hand + row.qty,
              updated_at:    new Date().toISOString(),
            })
            .eq("id", match.id);
          if (error) throw error;
          updated++;
        } else {
          // INSERT new row
          const { error } = await supabase
            .from("stock_inventory")
            .insert({
              tenant_id:     tenantId,
              item_name:     row.item_name.trim(),
              cost:          row.cost,
              stock_on_hand: row.qty,
              opening_stock: row.qty,
              reorder_level: 1,
              notes:         null,
            });
          if (error) throw error;
          inserted++;
        }
      }

      qc.invalidateQueries({ queryKey: ["stock", tenantId] });
      qc.invalidateQueries({ queryKey: ["stock-alerts", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-stock", tenantId] });

      toast.success(
        `Done! ${inserted} added, ${updated} updated.`
      );
      onClose();
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
      setStage("review");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4"
      onClick={e => { if (e.target === e.currentTarget && stage !== "saving") onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#1a1a1a] w-full sm:max-w-lg flex flex-col max-h-[92dvh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-4 h-4 text-white/50" />
            <p className="text-sm font-semibold text-white/85">Scan Invoice</p>
          </div>
          {stage !== "saving" && (
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── IDLE: pick source ── */}
        {stage === "idle" && (
          <div className="flex flex-col gap-3 p-5">
            <p className="text-xs text-white/40 mb-1">
              Take a photo of your supplier invoice or upload a PDF — items, quantities and prices will be extracted automatically.
            </p>

            {/* Camera */}
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-3 w-full px-4 py-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left"
            >
              <span className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                <Camera className="w-4 h-4 text-white/60" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white/80">Take a Photo</p>
                <p className="text-[10px] text-white/35 mt-0.5">Open camera to capture invoice</p>
              </div>
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCamera}
            />

            {/* File upload (PDF or image) */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 w-full px-4 py-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left"
            >
              <span className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                <FileText className="w-4 h-4 text-white/60" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white/80">Upload File</p>
                <p className="text-[10px] text-white/35 mt-0.5">PDF or image from your device</p>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {/* ── SCANNING: progress ── */}
        {stage === "scanning" && (
          <div className="flex flex-col items-center justify-center gap-4 p-10">
            <div className="relative">
              <ScanLine className="w-10 h-10 text-white/20 animate-pulse" />
            </div>
            <p className="text-xs text-white/50">Reading document…</p>
            <div className="w-48 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-white/30 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-white/25">{progress}%</p>
          </div>
        )}

        {/* ── REVIEW: editable table ── */}
        {(stage === "review" || stage === "saving") && (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
              <p className="text-[11px] text-white/40">
                {rows.length} item{rows.length !== 1 ? "s" : ""} detected — review before importing
              </p>
              <button
                onClick={addRow}
                className="text-[10px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3 h-3" /> Add row
              </button>
            </div>

            {rows.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 px-5">
                <AlertTriangle className="w-7 h-7 text-amber-400/40" />
                <p className="text-xs text-white/40 text-center">
                  No items were detected. You can add rows manually above, or go back and try a clearer image.
                </p>
                <button
                  onClick={() => setStage("idle")}
                  className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
                >
                  ← Try again
                </button>
              </div>
            )}

            {rows.length > 0 && (
              <div className="overflow-y-auto flex-1 px-5 py-3">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_64px_80px_32px] gap-2 mb-2">
                  <p className="text-[9px] uppercase tracking-wider text-white/25 font-semibold">Item Name</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/25 font-semibold text-right">Qty</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/25 font-semibold text-right">Cost (R)</p>
                  <span />
                </div>

                <div className="flex flex-col gap-1.5">
                  {rows.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_64px_80px_32px] gap-2 items-center">
                      <input
                        value={row.item_name}
                        onChange={e => updateRow(i, "item_name", e.target.value)}
                        placeholder="Item name"
                        className="w-full px-2.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                      />
                      <input
                        type="number" step="0.5" min="0"
                        value={row.qty}
                        onChange={e => updateRow(i, "qty", e.target.value)}
                        className="w-full px-2 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/80 text-right focus:outline-none focus:border-white/20 transition-colors"
                      />
                      <input
                        type="number" step="0.01" min="0"
                        value={row.cost}
                        onChange={e => updateRow(i, "cost", e.target.value)}
                        className="w-full px-2 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/80 text-right focus:outline-none focus:border-white/20 transition-colors"
                      />
                      <button
                        onClick={() => removeRow(i)}
                        className="flex items-center justify-center p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-2 justify-between items-center px-5 py-4 border-t border-white/[0.06] shrink-0">
              <button
                onClick={() => { setStage("idle"); setRows([]); setRawText(""); }}
                disabled={stage === "saving"}
                className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1 transition-colors disabled:opacity-30"
              >
                ← Rescan
              </button>
              <button
                onClick={handleImport}
                disabled={stage === "saving" || rows.filter(r => r.item_name.trim() && r.cost > 0).length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.09] border border-white/[0.14] text-xs font-semibold text-white/80 hover:bg-white/[0.14] disabled:opacity-30 transition-colors"
              >
                {stage === "saving"
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  : <><Check className="w-3.5 h-3.5" /> Import to Stock</>}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default StockScanModal;
