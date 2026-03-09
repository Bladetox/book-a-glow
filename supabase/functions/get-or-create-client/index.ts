import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, full_name, phone, address } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1. Look up existing user by email via SECURITY DEFINER function
    const { data: existingId, error: lookupError } = await supabaseAdmin
      .rpc("get_user_id_by_email", { p_email: email });

    if (lookupError) {
      console.error("Lookup error:", lookupError);
      throw lookupError;
    }

    if (existingId) {
      // User already exists — update their profile with latest details
      await supabaseAdmin.from("profiles").update({
        full_name: full_name ?? undefined,
        phone: phone ?? undefined,
        address: address ?? undefined,
      }).eq("id", existingId);

      return new Response(
        JSON.stringify({ userId: existingId, isNew: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. New user — create via admin API (skips email confirmation)
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createError) {
      console.error("Create user error:", createError);
      throw createError;
    }

    if (!newUserData?.user) {
      throw new Error("User creation returned no user");
    }

    const userId = newUserData.user.id;

    // Update profile (trigger may have already created it)
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name,
      phone,
      address,
    }, { onConflict: "id" });

    return new Response(
      JSON.stringify({ userId, isNew: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-or-create-client error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
