import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConsistencyQuote {
  is_qualifying_booking: boolean;
  service_name: string | null;
  state: "none" | "progress" | "qualified" | "lapsed";
  completed_count: number;
  bookings_remaining: number;
  consistency_price: number | null;
  service_total: number;
  callout_fee: number;
  total_amount: number;
  deposit_amount: number;
}

interface QuoteArgs {
  tenantId: string | null | undefined;
  serviceIds: string[];
  guestEmail: string | null;
  guestPhone: string | null;
  isCallout: boolean;
  distanceKm: number;
}

// Display-only. The quote mirrors calculate_booking_price() exactly, but
// create_booking_with_consultation remains the sole pricing authority —
// this hook never blocks or overrides booking creation on failure.
export function useConsistencyQuote(args: QuoteArgs) {
  const [quote, setQuote] = useState<ConsistencyQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const { tenantId, serviceIds, guestEmail, guestPhone, isCallout, distanceKm } = args;
  const serviceIdsKey = serviceIds.join(",");

  useEffect(() => {
    if (!tenantId || serviceIds.length === 0) {
      setQuote(null);
      return;
    }

    const thisRequest = ++requestId.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("get_booking_consistency_quote", {
          p_tenant_id: tenantId,
          p_service_ids: serviceIds,
          p_guest_email: guestEmail || null,
          p_guest_phone: guestPhone || null,
          p_is_callout: isCallout,
          p_distance_km: distanceKm,
        });

        if (thisRequest !== requestId.current) return; // stale response

        if (error) {
          console.error("Could not load consistency quote:", error);
          setQuote(null);
          return;
        }

        setQuote((data?.[0] as ConsistencyQuote) ?? null);
      } catch (err) {
        if (thisRequest !== requestId.current) return;
        console.error("Could not load consistency quote:", err);
        setQuote(null);
      } finally {
        if (thisRequest === requestId.current) setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, serviceIdsKey, guestEmail, guestPhone, isCallout, distanceKm]);

  return { quote, loading };
}
