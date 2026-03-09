import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Star, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAppSettings } from "@/hooks/useSupabaseSettings";
import { toast } from "sonner";

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-white/15"}`}
      />
    ))}
  </div>
);

interface ReviewRow {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  review_text: string | null;
  relative_time: string | null;
  fetched_at: string;
}

const AdminReviews = () => {
  const { tenantId } = useTenant();
  const { data: settings = {} } = useAppSettings();
  const [fetching, setFetching] = useState(false);

  const placeId = settings["google_place_id"] as string | undefined;
  const reviewUrl = settings["google_review_url"] as string | undefined;

  const { data: reviews = [], isLoading, refetch } = useQuery<ReviewRow[]>({
    queryKey: ["reviews_cache", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews_cache")
        .select("id, author_name, author_photo_url, rating, review_text, relative_time, fetched_at")
        .eq("tenant_id", tenantId)
        .order("rating", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const handleFetch = async () => {
    if (!placeId) {
      toast.error("Set your Google Place ID in Integrations → Google Reviews first.");
      return;
    }
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews", {
        body: { tenantId },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Fetched ${data.count} review${data.count !== 1 ? "s" : ""} from Google`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch reviews");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Customer Feedback</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Google Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={parseFloat(avgRating)} />
              <span className="text-sm font-semibold text-white/70">{avgRating}</span>
              <span className="text-xs text-white/30">({reviews.length} reviews)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-start">
          {reviewUrl && (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white/70 hover:bg-white/[0.1] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Review Link
            </a>
          )}
          <button
            onClick={handleFetch}
            disabled={fetching || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors disabled:opacity-50"
          >
            {fetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {fetching ? "Fetching…" : "Fetch Reviews"}
          </button>
        </div>
      </div>

      {/* Not configured */}
      {!placeId && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-3 items-start">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Google Reviews not configured</p>
            <p className="text-xs text-white/40 mt-1">
              Go to <strong className="text-white/60">Integrations → Google Reviews</strong> and enter your Google Place ID and review link.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reviews.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center"
        >
          <Star className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">No reviews yet.</p>
          <p className="text-xs text-white/20 mt-1">
            {placeId
              ? "Click "Fetch Reviews" to pull your latest Google reviews."
              : "Configure your Google Place ID in Integrations first."}
          </p>
        </motion.div>
      )}

      {/* Reviews grid */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                {r.author_photo_url ? (
                  <img
                    src={r.author_photo_url}
                    alt={r.author_name}
                    className="w-9 h-9 rounded-full object-cover border border-white/[0.08]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white/50">
                    {r.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80 truncate">{r.author_name}</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} />
                    {r.relative_time && (
                      <span className="text-[10px] text-white/25">{r.relative_time}</span>
                    )}
                  </div>
                </div>
              </div>
              {r.review_text && (
                <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{r.review_text}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
