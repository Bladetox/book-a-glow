import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secure queue processor: pulls one pending webhook at a time and
// dispatches to the appropriate edge function. We do NOT require a JWT
// (verify_jwt: false) because pg_cron cannot send one, but we protect
// the endpoint with a secret header shared with the cron job. The secret
// lives in Vault (process_webhook_queue_secret) and there is deliberately
// no fallback value: a missing secret must fail closed.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Only allow internal callers that know the cron secret.
    const { data: vaultSecret } = await supabase.rpc("get_vault_secret", {
      secret_name: "process_webhook_queue_secret",
    });
    const expectedSecret = Deno.env.get("PROCESS_WEBHOOK_QUEUE_SECRET") || (typeof vaultSecret === "string" ? vaultSecret : "");
    const headerSecret = req.headers.get("x-cron-secret");
    if (!expectedSecret || !headerSecret || headerSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Grab the next pending webhook using the existing helper
    // get_next_webhook(), which handles SKIP LOCKED + retry caps.
    const { data: webhookRows, error: nextErr } = await supabase
      .rpc("get_next_webhook");

    if (nextErr) {
      console.error("get_next_webhook error", nextErr);
      return new Response(JSON.stringify({ error: "Failed to fetch job" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const webhook = webhookRows?.[0];

    if (!webhook) {
      // Nothing to do – exit quietly so cron doesn't spam logs
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const webhookId = webhook.id as string;
    const eventType = webhook.event_type as string;
    const bookingId = webhook.booking_id as string | null;
    const payload   = webhook.payload as { booking_id?: string; action?: string } | null;
    const tenantId  = webhook.tenant_id as string | null;

    console.log("Processing webhook", { webhookId, eventType, bookingId, tenantId });

    let ok = false;
    let errorMessage = "";

    try {
      if (eventType === "create_calendar_event") {
        // ------------------------------------------------------------------
        // Fetch the booking to build the full payload for update-gcal-event
        // ------------------------------------------------------------------
        const resolvedBookingId = bookingId ?? payload?.booking_id;

        if (!resolvedBookingId) {
          throw new Error("create_calendar_event webhook has no booking_id");
        }

        const { data: booking, error: bErr } = await supabase
          .from("bookings")
          .select(`
            id, booking_date, start_time, end_time, tenant_id,
            is_call_out, call_out_address,
            client_name, guest_name, client_phone, guest_phone,
            client:profiles!bookings_client_id_fkey(full_name, phone),
            service_ids, gcal_event_id
          `)
          .eq("id", resolvedBookingId)
          .single();

        if (bErr || !booking) {
          throw new Error(`Booking not found: ${resolvedBookingId} – ${bErr?.message}`);
        }

        // Skip if a GCal event was already created between queue time and now
        if (booking.gcal_event_id) {
          console.log("gcal_event_id already set, skipping:", booking.gcal_event_id);
          ok = true;
          // Fall through to mark processed
        } else {
          // Resolve client name & phone
          const clientName  = (booking as any).client_name  || (booking as any).guest_name  || (booking.client as any)?.full_name  || "Guest";
          const clientPhone = (booking as any).client_phone || (booking as any).guest_phone || (booking.client as any)?.phone      || "";

          // Resolve service name(s)
          let serviceNames = "Beauty Service";
          if (booking.service_ids) {
            let ids: string[] = [];
            if (Array.isArray(booking.service_ids)) {
              ids = booking.service_ids;
            } else if (typeof booking.service_ids === "string") {
              try {
                const parsed = JSON.parse(booking.service_ids);
                ids = Array.isArray(parsed) ? parsed : booking.service_ids.split(",").map((s: string) => s.trim());
              } catch { ids = booking.service_ids.split(",").map((s: string) => s.trim()); }
            }
            if (ids.length > 0) {
              const { data: services } = await supabase.from("services").select("name").in("id", ids);
              if (services && services.length > 0) serviceNames = services.map((s: any) => s.name).join(", ");
            }
          }

          // Resolve location
          let locationStr = "Studio";
          if (booking.is_call_out) {
            locationStr = `Call-out: ${booking.call_out_address ?? ""}`;
          } else {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("address")
              .eq("id", booking.tenant_id)
              .single();
            locationStr = tenant?.address ?? "Studio";
          }

          // Calculate duration in minutes
          const [sh, sm] = (booking.start_time as string).split(":").map(Number);
          const [eh, em] = (booking.end_time   as string).split(":").map(Number);
          const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);

          // Call update-gcal-event with NO gcal_event_id → triggers the CREATE branch
          const targetUrl = `${supabaseUrl}/functions/v1/update-gcal-event`;
          const res = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              tenant_id:        booking.tenant_id,
              booking_id:       resolvedBookingId,
              // No gcal_event_id → CREATE branch
              new_date:         booking.booking_date,
              new_start_time:   (booking.start_time as string).slice(0, 5),
              duration_minutes: durationMinutes,
              client_name:      clientName,
              service_name:     serviceNames,
              client_phone:     clientPhone,
              location:         locationStr,
            }),
          });

          if (!res.ok) {
            const body = await res.text();
            errorMessage = `update-gcal-event failed: ${res.status} ${body}`;
            console.error(errorMessage);
          } else {
            const result = await res.json();
            console.log("GCal event created:", result);
            ok = true;
          }
        }
      } else {
        // Unknown event type: mark as processed so it doesn't block the queue
        errorMessage = `Unsupported event_type: ${eventType}`;
        console.warn(errorMessage);
        ok = true; // don't retry unknown types indefinitely
      }
    } catch (err) {
      errorMessage = `Exception in processor: ${err}`;
      console.error(errorMessage);
    }

    // Mark processed / failed using the existing helper
    const { error: markErr } = await supabase.rpc("mark_webhook_processed", {
      p_webhook_id:    webhookId,
      p_success:       ok,
      p_error_message: ok ? null : errorMessage,
    });

    if (markErr) {
      console.error("mark_webhook_processed error", markErr);
      return new Response(JSON.stringify({ error: "Failed to update job state" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: ok, processed: 1, id: webhookId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-webhook-queue fatal error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
