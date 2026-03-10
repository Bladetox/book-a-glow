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

    // Require an authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { domain, tenant_id } = await req.json();

    if (!domain || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "domain and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the caller belongs to and has admin access to this tenant
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (profile.tenant_id !== tenant_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: tenant mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (profile.role !== "owner" && profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: insufficient role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read Vercel credentials from environment
    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

    if (!vercelToken || !vercelProjectId) {
      return new Response(
        JSON.stringify({ error: "Vercel integration is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Add the domain to the Vercel project
    const vercelRes = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${vercelToken}`,
        },
        body: JSON.stringify({ name: domain }),
      },
    );

    const vercelData = await vercelRes.json();

    if (!vercelRes.ok) {
      console.error("Vercel API error:", vercelData);
      return new Response(
        JSON.stringify({ error: "Failed to register domain with Vercel", details: vercelData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Persist the custom domain on the tenant record
    const { error: tenantUpdateErr } = await supabase
      .from("tenants")
      .update({ custom_domain: domain })
      .eq("id", tenant_id);

    if (tenantUpdateErr) {
      // Non-fatal: domain was registered with Vercel; log and continue
      console.warn("Could not save custom_domain to tenants table:", tenantUpdateErr.message);
    }

    // Return DNS configuration instructions
    return new Response(
      JSON.stringify({
        domain,
        vercel: vercelData,
        dns_instructions: {
          cname: {
            from: domain,
            to: "cname.vercel-dns.com",
          },
          arecord: {
            from: "@",
            to: "76.76.21.21",
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("register-custom-domain error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
