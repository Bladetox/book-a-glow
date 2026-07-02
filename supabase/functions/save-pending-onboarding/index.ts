import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const rawText = await req.text();
    if (!rawText?.trim()) return json({ error: "Empty request body" }, 400);

    let body: {
      user_id: string;
      email: string;
      business_name: string;
      business_type: string;
      theme_id: string;
      services: { name: string; price: string; duration: string }[];
      schedule: Record<string, string>;
      selected_plan: string;
      trial_days: number;
    };

    try {
      body = JSON.parse(rawText);
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const {
      user_id,
      email,
      business_name,
      business_type,
      theme_id,
      services,
      schedule,
      selected_plan,
      trial_days,
    } = body;

    if (!user_id?.trim())     return json({ error: "user_id is required" }, 400);
    if (!email?.trim())       return json({ error: "email is required" }, 400);
    if (!business_name?.trim()) return json({ error: "business_name is required" }, 400);

    // Verify the user_id actually exists in auth.users.
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(user_id);
    if (authErr || !authUser?.user) {
      return json({ error: "Invalid user_id" }, 400);
    }

    // Block if this user already owns a provisioned tenant.
    const { data: existingTenant } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", user_id)
      .maybeSingle();

    if (existingTenant) {
      return json(
        { error: "User already has a provisioned tenant", tenant_id: existingTenant.id },
        409
      );
    }

    // Upsert the pending_onboarding row. If the user retries before
    // confirming their email, we overwrite the previous draft.
    const { error: upsertErr } = await admin
      .from("pending_onboarding")
      .upsert(
        {
          user_id,
          email: email.trim(),
          business_name: business_name.trim(),
          business_type: business_type ?? "General",
          theme_id:      theme_id ?? "standard",
          services:      JSON.stringify(services ?? []),
          schedule:      JSON.stringify(schedule ?? {}),
          selected_plan: selected_plan ?? "professional",
          trial_days:    trial_days ?? 30,
          created_at:    new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("[save-pending-onboarding] upsert error:", upsertErr.message);
      throw new Error(`pending_onboarding: ${upsertErr.message}`);
    }

    console.log(`[save-pending-onboarding] saved draft for user=${user_id}`);
    return json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[save-pending-onboarding] error:", message);
    return json({ error: message }, 500);
  }
});
