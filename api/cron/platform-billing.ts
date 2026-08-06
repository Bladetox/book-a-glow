import type { VercelRequest, VercelResponse } from "@vercel/node";

function previousMonth() {
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() - 1);
  return now.toISOString().slice(0, 7);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.CRON_SECRET;
  const supplied = req.headers["x-cron-secret"] ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!secret || supplied !== secret) return res.status(401).json({ error: "Unauthorized" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl) return res.status(500).json({ error: "Supabase URL is not configured" });
  if (!supabaseAnonKey) return res.status(500).json({ error: "Supabase anon key is not configured" });

  const response = await fetch(`${supabaseUrl}/functions/v1/platform-monthly-billing`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseAnonKey}`,
      "apikey": supabaseAnonKey,
      "Content-Type": "application/json",
      "x-cron-secret": secret,
    },
    body: JSON.stringify({ month: previousMonth() }),
  });

  const body = await response.json().catch(() => ({ error: "Invalid billing response" }));
  return res.status(response.status).json(body);
}