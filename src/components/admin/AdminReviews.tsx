import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Star, ExternalLink, MessageSquare,
  Copy, Check, Loader2, AlertTriangle, Settings2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAppSettings } from "@/hooks/useSupabaseSettings";
import { toast } from "sonner";

interface Review {
  id: string;
  author_name: string | null;
  author_photo_url: string | null;
  rating: number | null;
  review_text: string | null;
  relative_time: string | null;
  publish_time: string | null;
  fetched_at: string | null;
}

const StarRow = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => {
  const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${cls} ${
            n <= rating ? "text-amber-400 fill-amber-400" : "text-white/15"
          }`}
        />
      ))}
    </div>
  );
};

const AdminReviews = () => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const { data: appSettings = {} } = useAppSettings();

  const [respondTo, setRespondTo]   = useState<Review | null>(null);
  const [replyText, setReplyText]   = useState("");
  const [copied, setCopied]         = useState(false);

  const placeId        = appSettings["google_place_id"]  as string | undefined;
  const reviewLink     = appSettings["google_review_link"] as string | undefined;
  const mapsApiKey     = appSettings["google_maps_api_key"] as string | undefined;
  const isConfigured   = !!(placeId && mapsApiKey);

  // ── Fetch reviews from cache ──────────────────────────────────────────────
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews-cache", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews_cache")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("publish_time", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!tenantId,
  });

  // ── Refresh — calls Edge Function ─────────────────────────────────────────
  const refresh = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews", {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error ?? "Failed to fetch reviews");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reviews-cache", tenantId] });
      toast.success(`${data.count} review${data.count !== 1 ? "s" : ""} synced from Google`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const rated    = reviews.filter(r => r.rating !== null);
  const avgRating = rated.length
    ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length
    : null;
  const lastFetched = reviews[0]?.fetched_at
    ? new Date(reviews[0].fetched_at).toLocaleString("en-ZA", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  // ── Respond: copy + open Google Business ──────────────────────────────────
  const handleCopyAndOpen = () => {
    navigator.clipboard.writeText(replyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success("Reply copied — opening Google Business");
      const target = reviewLink || `https://business.google.com/reviews`;
      window.open(target, "_blank", "noopener,noreferrer");
    });
  };

  const distByRating = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: rated.filter(r => r.rating === n).length,
  }));

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Customer Feedback</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Google Reviews</h3>
          {lastFetched && (
            <p className="text-[10px] text-white/25 mt-0.5">Last synced: {lastFetched}</p>
          )}
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending || !isConfigured}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors self-start disabled:opacity-40"
        >
          {refresh.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Sync Reviews
        </button>
      </div>

      {/* Not configured */}
      {!isConfigured && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Google Reviews not configured</p>
            <p className="text-[11px] text-amber-300/50 mt-0.5">
              Add your Google Maps API Key and Place ID in
              <span className="text-amber-400/80 inline-flex items-center gap-1 mx-1">
                <Settings2 className="w-3 h-3" /> Settings → Google Reviews
              </span>
              to start syncing.
            </p>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center flex flex-col items-center gap-3">
          <Star className="w-8 h-8 text-white/10" />
          <p className="text-sm text-white/30">
            {isConfigured ? "No reviews yet — click Sync Reviews to fetch from Google." : "Configure your Google settings to see reviews here."}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col sm:flex-row gap-5">

            {/* Average */}
            <div className="flex flex-col items-center justify-center gap-1 sm:pr-5 sm:border-r border-white/[0.06]">
              <p className="text-4xl font-bold text-white/90">
                {avgRating ? avgRating.toFixed(1) : "—"}
              </p>
              {avgRating && <StarRow rating={Math.round(avgRating)} size="lg" />}
              <p className="text-[10px] text-white/30">{rated.length} review{rated.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Distribution */}
            <div className="flex-1 flex flex-col gap-1.5 justify-center">
              {distByRating.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-3 text-right">{star}</span>
                  <Star className="w-3 h-3 text-amber-400/60 fill-amber-400/60 shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400/60 transition-all duration-500"
                      style={{ width: rated.length ? `${(count / rated.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 w-3">{count}</span>
                </div>
              ))}
            </div>

            {/* Action */}
            {reviewLink && (
              <div className="flex items-center sm:pl-5 sm:border-l border-white/[0.06]">
                <a href={reviewLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                  <ExternalLink className="w-3.5 h-3.5" /> Get More Reviews
                </a>
              </div>
            )}
          </motion.div>

          {/* Review cards */}
          <div className="flex flex-col gap-3">
            {reviews.map((review, i) => (
              <motion.div key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {review.author_photo_url ? (
                      <img src={review.author_photo_url} alt={review.author_name ?? ""}
                        className="w-9 h-9 rounded-full object-cover bg-white/10 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white/40">
                          {(review.author_name ?? "?")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-white/80">{review.author_name ?? "Anonymous"}</p>
                      <p className="text-[10px] text-white/30">{review.relative_time ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.rating && <StarRow rating={review.rating} />}
                    <button
                      onClick={() => { setRespondTo(review); setReplyText(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] font-semibold text-white/50 hover:text-white/80 hover:bg-white/[0.09] transition-colors">
                      <MessageSquare className="w-3 h-3" /> Respond
                    </button>
                  </div>
                </div>
                {review.review_text && (
                  <p className="text-xs text-white/55 leading-relaxed">{review.review_text}</p>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Respond modal */}
      <AnimatePresence>
        {respondTo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a] p-6 max-w-lg w-full flex flex-col gap-4">

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white/80">Respond to Review</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{respondTo.author_name}</p>
                </div>
                <button onClick={() => setRespondTo(null)} className="text-white/30 hover:text-white/60">
                  ✕
                </button>
              </div>

              {/* Original review */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-1.5">
                {respondTo.rating && <StarRow rating={respondTo.rating} />}
                {respondTo.review_text && (
                  <p className="text-[11px] text-white/45 leading-relaxed italic">"{respondTo.review_text}"</p>
                )}
              </div>

              {/* Reply textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold tracking-wider uppercase text-white/30">Your Reply</label>
                <textarea
                  rows={5}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Thank you for your kind words..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none leading-relaxed"
                />
              </div>

              <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 px-3 py-2">
                <p className="text-[10px] text-amber-300/60 leading-relaxed">
                  Your reply will be <strong className="text-amber-400/80">copied to clipboard</strong> and Google Business will open in a new tab — paste it there to publish.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setRespondTo(null)}
                  className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/60">Cancel</button>
                <button
                  onClick={handleCopyAndOpen}
                  disabled={!replyText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-xs font-semibold text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-30">
                  {copied
                    ? <><Check className="w-3 h-3" /> Copied!</>
                    : <><Copy className="w-3 h-3" /> Copy &amp; Open Google</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminReviews;
