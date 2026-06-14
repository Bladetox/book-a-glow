import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlPage(title: string, emoji: string, message: string, colour: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <title>${title} — NextSlot</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100dvh;display:flex;align-items:center;justify-content:center;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
         background:#f2f2f2;padding:24px;}
    .card{background:#fff;border-radius:14px;border:1px solid #e0e0e0;
          box-shadow:0 2px 12px rgba(0,0,0,0.07);max-width:420px;width:100%;
          padding:40px 36px;text-align:center;}
    .emoji{font-size:48px;margin-bottom:16px;}
    h1{font-size:20px;font-weight:700;color:#000;margin-bottom:10px;}
    p{font-size:14px;color:#666;line-height:1.6;}
    .badge{display:inline-block;margin-top:18px;padding:8px 18px;
           border-radius:999px;font-size:12px;font-weight:600;
           letter-spacing:.06em;text-transform:uppercase;
           background:${colour};color:#fff;}
    .footer{margin-top:28px;font-size:11px;color:#bbb;}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${emoji}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="badge">${title}</div>
    <p class="footer">Powered by NextSlot</p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url        = new URL(req.url);
    const booking_id = url.searchParams.get("booking_id");

    if (!booking_id) {
      return new Response(
        htmlPage("Missing booking ID", "\u26A0\uFE0F", "No booking ID was provided in the link.", "#e53e3e"),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Fetch the booking first to check current status
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status, client_name, guest_name, booking_date, start_time")
      .eq("id", booking_id)
      .single();

    if (fetchErr || !booking) {
      console.error("confirm-booking: booking not found", booking_id, fetchErr);
      return new Response(
        htmlPage("Booking Not Found", "\u2753", "We could not find a booking with that ID. It may have already been removed.", "#718096"),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Already confirmed — idempotent response
    if (booking.status === "confirmed" || booking.status === "complete" || booking.status === "completed" || booking.status === "in_progress") {
      return new Response(
        htmlPage("Already Confirmed", "\u2705", "This booking is already confirmed. No further action is needed.", "#38a169"),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Update status to confirmed
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        status:       "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateErr) {
      console.error("confirm-booking: update failed", booking_id, updateErr);
      return new Response(
        htmlPage("Update Failed", "\u274C", "Something went wrong while confirming the booking. Please confirm manually in your admin panel.", "#e53e3e"),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const clientName = booking.client_name || booking.guest_name || "Client";
    console.log("confirm-booking: confirmed", booking_id, clientName);

    return new Response(
      htmlPage(
        "Booking Confirmed",
        "\u2705",
        `${clientName}'s booking has been marked as confirmed. Your client will also receive a confirmation shortly.`,
        "#38a169",
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );

  } catch (err) {
    console.error("confirm-booking error:", err);
    return new Response(
      htmlPage("Unexpected Error", "\u274C", "An unexpected error occurred. Please try again or confirm the booking in your admin panel.", "#e53e3e"),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );
  }
});
