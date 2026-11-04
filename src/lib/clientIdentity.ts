/**
 * Shared tenant-scoped guest identity resolution for dashboard reporting.
 *
 * A booking can carry a canonical client ID, a profile client ID, email,
 * phone, or (for legacy records without contact details) a name. Contact
 * tokens include the guest's first name so family members sharing an email
 * or phone number are not automatically merged.
 */
export function buildClientIdentityKeys(rows: any[]): Map<string, string | null> {
  const parent = new Map<string, string>();

  const normalizePhone = (value: unknown): string => {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("27")
      ? `0${digits.slice(2)}`
      : digits;
  };

  const tokensFor = (booking: any): string[] => {
    const tokens: string[] = [];
    if (booking.canonical_client_id) tokens.push(`canonical:${booking.canonical_client_id}`);
    if (booking.client_id) tokens.push(`client:${booking.client_id}`);

    const firstName = String(booking.client_name || booking.guest_name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9'-]+/g, " ")
      .trim()
      .split(/\s+/)[0] || "unknown";

    [booking.client_email, booking.guest_email]
      .filter(Boolean)
      .forEach((value: string) => tokens.push(
        `email:${String(value).trim().toLowerCase()}|person:${firstName}`,
      ));

    [booking.client_phone, booking.guest_phone]
      .filter(Boolean)
      .map(normalizePhone)
      .filter((value: string) => value.length >= 9)
      .forEach((value: string) => tokens.push(
        `phone:${value}|person:${firstName}`,
      ));

    if (tokens.length === 0) {
      const fullName = String(booking.client_name || booking.guest_name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9'-]+/g, " ")
        .trim();
      if (fullName) tokens.push(`name:${fullName}`);
    }

    return [...new Set(tokens)];
  };

  const find = (value: string): string => {
    const parentValue = parent.get(value);
    if (!parentValue) {
      parent.set(value, value);
      return value;
    }
    if (parentValue === value) return value;
    const root = find(parentValue);
    parent.set(value, root);
    return root;
  };

  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  const tokensByBookingId = new Map<string, string[]>();
  rows.forEach((booking: any) => {
    const tokens = tokensFor(booking);
    tokensByBookingId.set(booking.id, tokens);
    tokens.forEach(find);
    for (let index = 1; index < tokens.length; index++) {
      union(tokens[0], tokens[index]);
    }
  });

  const result = new Map<string, string | null>();
  rows.forEach((booking: any) => {
    const tokens = tokensByBookingId.get(booking.id) ?? [];
    result.set(booking.id, tokens.length > 0 ? find(tokens[0]) : null);
  });

  return result;
}
