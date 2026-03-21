import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGcalToken(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Token refresh failed:", data);
    return null;
  }
  await supabase.from("app_settings").upsert(
    { tenant_id: tenantId, key: "gcal_access_token", value: data.access_token },
    { onConflict: "tenant_id,key" }
  );
  await supabase.from("app_settings").upsert(
    { tenant_id: tenantId, key: "gcal_token_expiry", value: String(Date.now() + (data.expires_in ?? 3600) * 1000) },
    { onConflict: "tenant_id,key" }
  );
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { gcal_event_id, tenant_id } = await req.json();

    if (!gcal_event_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing gcal_event_id or tenant_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["gcal_connected", "gcal_access_token", "gcal_refresh_token", "gcal_token_expiry"]);

    const settings: Record<string, string> = {};
    for (const row of rows ?? []) settings[row.key] = row.value;

    if (settings["gcal_connected"] !== "true") {
      console.log("Google Calendar not connected for tenant:", tenant_id);
      return new Response(JSON.stringify({ skipped: "gcal_not_connected" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    let accessToken = settings["gcal_access_token"];
    const expiry    = Number(settings["gcal_token_expiry"] ?? 0);
    if (Date.now() > expiry - 60_000) {
      const newToken = await refreshGcalToken(supabase, tenant_id, settings["gcal_refresh_token"], clientId, clientSecret);
      if (!newToken) {
        return new Response(JSON.stringify({ error: "Could not refresh Google token" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = newToken;
    }

    const deleteRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(gcal_event_id)}`,
      { method: "DELETE", headers: { "Authorization": `Bearer ${accessToken}` } }
    );

    if (deleteRes.status === 404 || deleteRes.status === 410) {
      // Event already deleted or gone — not an error
      console.log("GCal event not found (already deleted?):", gcal_event_id);
      return new Response(JSON.stringify({ deleted: true, note: "already_gone" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error("GCal delete error:", deleteRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to delete calendar event", status: deleteRes.status }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("GCal event deleted:", gcal_event_id, "for tenant:", tenant_id);
    return new Response(JSON.stringify({ deleted: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("delete-gcal-event error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
