import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { persistSession: false },
    });

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const rawText = await req.text();
    if (!rawText?.trim()) {
      return json({ error: "Empty request body" }, 400);
    }

    let body: {
      user_id?: string;
      payload?: unknown;
    };

    try {
      body = JSON.parse(rawText);
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.user_id || body.user_id !== user.id) {
      return json({ error: "User mismatch" }, 403);
    }

    if (!body.payload || typeof body.payload !== "object") {
      return json({ error: "payload is required" }, 400);
    }

    const { error } = await admin
      .from("pending_onboarding")
      .upsert(
        {
          user_id: user.id,
          payload: body.payload,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      throw new Error(`pending_onboarding: ${error.message}`);
    }

    return json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
