import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { email, full_name, phone, address } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let clientId: string;

    // Attempt to create a new auth user
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: { full_name, phone },
    });

    if (!createErr && newUser?.user) {
      // New user created successfully
      clientId = newUser.user.id;
    } else {
      // User already exists — find their id via the admin users list
      // We list all users and filter by email. For large user bases this should be
      // replaced with a custom RPC that queries auth.users directly.
      const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listErr || !usersPage) {
        console.error("Failed to list users:", listErr);
        return new Response(
          JSON.stringify({ error: "Failed to look up existing user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const existing = usersPage.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!existing) {
        console.error("User not found after create conflict:", createErr);
        return new Response(
          JSON.stringify({ error: "User could not be created or found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      clientId = existing.id;
    }

    // Upsert profile with provided contact details
    const profileUpdate: Record<string, string | null> = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (address !== undefined) profileUpdate.address = address;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({ id: clientId, ...profileUpdate }, { onConflict: "id" });

      if (profileErr) {
        // Non-fatal: log and continue — the user was still created/found
        console.warn("Profile upsert warning:", profileErr.message);
      }
    }

    return new Response(
      JSON.stringify({ client_id: clientId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-or-create-client error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
