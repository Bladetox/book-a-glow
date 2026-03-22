import { supabase } from "@/integrations/supabase/client";

/**
 * saLog — Super-admin audit logger.
 * Writes a row to the `sa_audit_logs` table.
 *
 * @param action   e.g. "tenant.suspended", "tenant.activated", "user.password_reset"
 * @param entity   e.g. "tenant", "user"
 * @param entityId UUID of the affected record
 * @param label    Human-readable name for the record (tenant name, user email…)
 * @param meta     Optional extra payload stored as JSONB
 */
export async function saLog(
  action: string,
  entity: string,
  entityId: string,
  label: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sa_audit_logs").insert({
      action,
      entity,
      entity_id:   entityId,
      label,
      meta:        meta ?? null,
      actor_id:    user?.id ?? null,
      actor_email: user?.email ?? null,
      created_at:  new Date().toISOString(),
    });
  } catch (err) {
    // Audit logging must never crash the app — swallow silently.
    console.warn("[saLog] failed to write audit log:", err);
  }
}
