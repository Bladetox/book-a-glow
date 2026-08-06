import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.CRON_SECRET;
  const supplied = req.headers["x-cron-secret"] ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!secret || supplied !== secret) return res.status(401).json({ error: "Unauthorized" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!supabaseUrl) return res.status(500).json({ error: "Supabase URL is not configured" });

  const response = await fetch(`${supabaseUrl}/functions/v1/platform-monthly-billing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": secret,
    },
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => ({ error: "Invalid billing response" }));
  return res.status(response.status).json(body);
}