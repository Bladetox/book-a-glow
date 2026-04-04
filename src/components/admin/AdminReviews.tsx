import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Star, ExternalLink, MessageSquare,
  Copy, Check, Loader2, AlertTriangle, Sparkles, Filter
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

// C4: max reply length
const MAX_REPLY = 1000;

// C1: simple AI-reply starters keyed on rating bracket
function generateReplyDraft(review: Review): string {
  const name  = review.author_name ?? "there";
  const stars = review.rating ?? 0;
  const text  = (review.review_text ?? "").toLowerCase();

  if (stars >= 4) {
    return `Hi ${name}, thank you so much for your wonderful review! ✨ We're so glad you had a great experience at PhenomeBeauty and we look forward to seeing you again soon. 💖`;
  } else if (stars === 3) {
    return `Hi ${name}, thank you for taking the time to share your feedback. We're pleased you had an overall positive experience and we'll use your comments to keep improving. We hope to welcome you back soon!`;
  } else {
    return `Hi ${name}, thank you for your honest feedback. We're sorry to hear your experience didn't fully meet expectations. Please reach out to us directly so we can make this right. We truly value every client.`;
  }
}

const AdminReviews = () => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const { data: appSettings = {} } = useAppSettings();

  const [respondTo, setRespondTo]   = useState<Review | null>(null);
  const [replyText, setReplyText]   = useState("");
  const [copied, setCopied]         = useState(false);
  // C2: filter by star rating
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const placeId    = appSettings["google_place_id"]   as string | undefined;
  const reviewLink = appSettings["google_review_link"] as string | undefined;
  const isConfigured = !!placeId;

  // ── Fetch reviews from cache ──
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

  // ── Refresh ──
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

  // ── Stats ──
  const rated = reviews.filter(r => r.rating !== null);
  const avgRating = rated.length
    ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length
    : null;
  const lastFetched = reviews[0]?.fetched_at
    ? new Date(reviews[0].fetched_at).toLocaleString("en-ZA", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : null;

  // C2: filtered reviews list
  const filteredReviews = useMemo(() =>
    ratingFilter !== null
      ? reviews.filter(r => r.rating === ratingFilter)
      : reviews,
    [reviews, ratingFilter]
  );

  // ── Copy + open ──
  const handleCopyAndOpen = () => {
    navigator.clipboard.writeText(replyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success("Reply copied — opening Google Business");
      const target = reviewLink || "https://business.google.com/reviews";
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
              Contact NextSlot support to enable Google Reviews for your account.
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
            {isConfigured
              ? "No reviews yet — click Sync Reviews to fetch from Google."
              : "Contact NextSlot support to enable Google Reviews."}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col sm:flex-row gap-5">

            <div className="flex flex-col items-center justify-center gap-1 sm:pr-5 sm:border-r border-white/[0.06]">
              <p className="text-4xl font-bold text-white/90">
                {avgRating ? avgRating.toFixed(1) : "—"}
              </p>
              {avgRating && <StarRow rating={Math.round(avgRating)} size="lg" />}
              <p className="text-[10px] text-white/30">{rated.length} review{rated.length !== 1 ? "s" : ""}</p>
            </div>

            {/* C2: clickable star bars for filtering */}
            <div className="flex-1 flex flex-col gap-1.5 justify-center">
              {distByRating.map(({ star, count }) => (
                <button
                  key={star}
                  onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                  className={`flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors ${
                    ratingFilter === star ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="text-[10px] text-white/40 w-3 text-right">{star}</span>
                  <Star className="w-3 h-3 text-amber-400/60 fill-amber-400/60 shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400/60 transition-all duration-500"
                      style={{ width: rated.length ? `${(count / rated.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 w-3">{count}</span>
                </button>
              ))}
              {ratingFilter !== null && (
                <button
                  onClick={() => setRatingFilter(null)}
                  className="text-[10px] text-amber-400/70 hover:text-amber-400 mt-1 text-left px-1"
                >
                  × Clear filter
                </button>
              )}
            </div>

            {reviewLink && (
              <div className="flex items-center sm:pl-5 sm:border-l border-white/[0.06]">
                <a href={reviewLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                  <ExternalLink className="w-3.5 h-3.5" /> Get More Reviews
                </a>
              </div>
            )}
          </motion.div>

          {/* C2: filter indicator */}
          {ratingFilter !== null && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400/80">
              <Filter className="w-3 h-3" />
              Showing {filteredReviews.length} review{filteredReviews.length !== 1 ? "s" : ""} for {ratingFilter}★
            </div>
          )}

          {/* Review cards */}
          <div className="flex flex-col gap-3">
            {filteredReviews.map((review, i) => (
              <motion.div key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* C3: graceful photo fallback */}
                    {review.author_photo_url ? (
                      <img
                        src={review.author_photo_url}
                        alt={review.author_name ?? ""}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty("display", "flex"); }}
                        className="w-9 h-9 rounded-full object-cover bg-white/10 shrink-0"
                      />
                    ) : null}
                    <div className={`w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] items-center justify-center shrink-0 ${
                      review.author_photo_url ? "hidden" : "flex"
                    }`}>
                      <span className="text-sm font-bold text-white/40">
                        {(review.author_name ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/80">{review.author_name ?? "Anonymous"}</p>
                      <p className="text-[10px] text-white/30">{review.relative_time ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.rating && <StarRow rating={review.rating} />}
                    <button
                      onClick={() => { setRespondTo(review); setReplyText(generateReplyDraft(review)); }}
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
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a] p-6 max-w-lg w-full flex flex-col gap-4">

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white/80">Respond to Review</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{respondTo.author_name}</p>
                </div>
                <button onClick={() => setRespondTo(null)} className="text-white/30 hover:text-white/60 text-lg leading-none">
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

              {/* C1: AI-draft hint row */}
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="review-reply" className="text-[10px] font-semibold tracking-wider uppercase text-white/30">Your Reply</label>
                <button
                  onClick={() => setReplyText(generateReplyDraft(respondTo))}
                  className="flex items-center gap-1 text-[10px] text-emerald-400/80 hover:text-emerald-400 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> Re-generate draft
                </button>
              </div>

              {/* C4: textarea with char count */}
              <div className="flex flex-col gap-1">
                <textarea
                  id="review-reply"
                  name="review-reply"
                  rows={5}
                  maxLength={MAX_REPLY}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Thank you for your kind words..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none leading-relaxed"
                />
                <p className={`text-right text-[10px] ${
                  replyText.length > MAX_REPLY * 0.9 ? "text-amber-400" : "text-white/25"
                }`}>
                  {replyText.length}/{MAX_REPLY}
                </p>
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
