import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.text();
  let event: any;
  try { event = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }

  // Yoco sends: payload.metadata.booking_id, payload.metadata.payment_type
  const payload = event.payload ?? event;
  const metadata = payload.metadata ?? {};
  const bookingId = metadata.booking_id;
  const paymentType = metadata.payment_type ?? "deposit";
  const status = payload.status ?? event.type;

  if (!bookingId) return new Response("No booking_id", { status: 400 });

  // Only process successful payments
  const isSuccess = status === "succeeded" || status === "payment.succeeded" || event.type === "payment.succeeded";
  if (!isSuccess) return new Response("Not a success event", { status: 200 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch booking + client
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id,tenant_id,status,deposit_paid,final_payment_paid,total_amount,deposit_amount,balance_due,booking_date,start_time,client_id")
    .eq("id", bookingId)
    .single();
  if (bErr || !booking) return new Response("Booking not found", { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,phone")
    .eq("id", booking.client_id)
    .single();

  const { data: items } = await supabase
    .from("booking_items")
    .select("service_name,price")
    .eq("booking_id", bookingId)
    .order("sort_order");

  // Update booking state
  let updateData: Record<string, any>;
  if (paymentType === "final") {
    updateData = {
      final_payment_paid: true,
      full_payment_received: true,
      balance_due: 0,
      status: "completed",
    };
  } else {
    const newBalance = booking.total_amount - booking.deposit_amount;
    updateData = {
      deposit_paid: true,
      balance_due: Math.max(0, newBalance),
      status: "confirmed",
    };
  }
  await supabase.from("bookings").update(updateData).eq("id", bookingId);

  // Fire email
  await supabase.functions.invoke("send-booking-email", {
    body: {
      booking_id: bookingId,
      tenant_id: booking.tenant_id,
      payment_type: paymentType,
      client_name: profile?.full_name ?? "Client",
      client_email: profile?.email ?? "",
      client_phone: profile?.phone ?? "",
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      total_amount: booking.total_amount,
      deposit_amount: booking.deposit_amount,
      balance_due: paymentType === "final" ? 0 : Math.max(0, booking.total_amount - booking.deposit_amount),
      services: items ?? [],
    },
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
