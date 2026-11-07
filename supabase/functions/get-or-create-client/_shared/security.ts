export function buildCorsHeaders(req: Request): Record<string, string> {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowed.length === 0 || allowed.includes(origin) ? origin || "*" : allowed[0];
  return { "Access-Control-Allow-Origin": allowOrigin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Vary": "Origin" };
}
export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...extraHeaders, "Content-Type": "application/json" } });
}
export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
export async function getSecret(supabase: any, tenantId: string, key: string, cfg: Record<string, string>): Promise<string | null> {
  try { const { data } = await supabase.rpc("get_tenant_secret", { p_tenant_id: tenantId, p_key: key }); if (data && data !== "") return data as string; } catch (e) { console.warn(`vault read failed for ${key}:`, e); }
  return cfg[key] ?? null;
}
export async function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string | null): Promise<boolean> {
  if (!secret) { console.warn("yoco_webhook_secret not configured"); return true; }
  if (!signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return await timingSafeEqual(computed, signature.replace(/^sha256=/, ""));
}
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const dummyKey = await crypto.subtle.importKey("raw", new Uint8Array(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [aSig, bSig] = await Promise.all([crypto.subtle.sign("HMAC", dummyKey, enc.encode(a)), crypto.subtle.sign("HMAC", dummyKey, enc.encode(b))]);
  const aArr = new Uint8Array(aSig); const bArr = new Uint8Array(bSig); let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= aArr[i] ^ bArr[i];
  return diff === 0;
}
export function generateSecurePassword(length = 24): string {
  const lower = "abcdefghijklmnopqrstuvwxyz", upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits = "0123456789", special = "!@#$%^&*", all = lower + upper + digits + special;
  const pickFrom = (charset: string): string => { const limit = 256 - (256 % charset.length); const buf = new Uint8Array(1); let b: number; do { crypto.getRandomValues(buf); b = buf[0]; } while (b >= limit); return charset[b % charset.length]; };
  const chars: string[] = [pickFrom(lower), pickFrom(upper), pickFrom(digits), pickFrom(special)];
  for (let i = 4; i < length; i++) chars.push(pickFrom(all));
  for (let i = chars.length - 1; i > 0; i--) { const limit = 256 - (256 % (i + 1)); const buf = new Uint8Array(1); let b: number; do { crypto.getRandomValues(buf); b = buf[0]; } while (b >= limit); const j = b % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}
export function isValidEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }
export function sanitiseSubject(subject: string): string { return subject.replace(/[\r\n]+/g, " ").slice(0, 200); }
