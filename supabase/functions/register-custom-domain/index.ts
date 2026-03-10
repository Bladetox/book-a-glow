import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERCEL_PROJECT_ID = "prj_H1JhagjKJr4QCkiP3wAxqS9s2s9h";
const VERCEL_TEAM_ID = "team_Qt6EebC9KpmywPfXpRDgJYEd";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the user is an admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { domain, tenantId } = await req.json() as { domain: string; tenantId: string };

    if (!domain || !tenantId) {
      return new Response(JSON.stringify({ error: "domain and tenantId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return new Response(JSON.stringify({ error: "Invalid domain format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user has admin rights for this tenant
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (!role || !["owner", "admin"].includes(role.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VERCEL_TOKEN = Deno.env.get("VERCEL_API_TOKEN");
    if (!VERCEL_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Vercel API token not configured on server. Add VERCEL_API_TOKEN to Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Register domain with Vercel
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      },
    );

    const vercelData = await vercelRes.json();

    // Domain already registered is fine — treat as success
    if (!vercelRes.ok) {
      const code = vercelData?.error?.code ?? "";
      if (code === "domain_already_in_use" || code === "domain_already_exists") {
        return new Response(
          JSON.stringify({ success: true, message: "Domain already registered with Vercel" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: vercelData?.error?.message ?? "Vercel API error" }),
        { status: vercelRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the tenant's custom_domain in the DB
    await supabase.from("tenants").update({ custom_domain: domain }).eq("id", tenantId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Domain ${domain} registered. Ask your client to add a CNAME record pointing to cname.vercel-dns.com`,
        vercelDomain: vercelData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
