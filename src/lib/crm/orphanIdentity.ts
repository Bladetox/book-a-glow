export type OrphanIdentityStatus =
  | "auto_link"
  | "keep_separate"
  | "needs_review";

export type OrphanReviewReason =
  | "no_match"
  | "conflicting_contact_matches"
  | "multiple_email_matches"
  | "multiple_phone_matches"
  | "missing_contact_details"
  | "partial_contact_match";

export type ContactIdentity = {
  id: string;
  email?: string | null;
  phone?: string | null;
};

export type OrphanBooking = {
  id: string;
  guest_name?: string | null;
  client_name?: string | null;
  guest_email?: string | null;
  client_email?: string | null;
  guest_phone?: string | null;
  client_phone?: string | null;
};

export type OrphanIdentityDecision = {
  status: OrphanIdentityStatus;
  reason: OrphanReviewReason;
  matchedClientId: string | null;
  emailMatches: string[];
  phoneMatches: string[];
};

export function normaliseIdentityEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function normaliseIdentityPhone(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

/*
 * Deterministic policy for bookings without canonical_client_id.
 * Names never establish identity. Contact evidence must be unambiguous.
 */
export function orphanIdentityGroupKey(booking: OrphanBooking) {
  const email = normaliseIdentityEmail(booking.guest_email || booking.client_email);
  const phone = normaliseIdentityPhone(booking.guest_phone || booking.client_phone);

  if (email && phone) return `contact:${email}|${phone}`;
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  return `booking:${booking.id}`;
}

export function resolveOrphanIdentity(
  booking: OrphanBooking,
  clients: ContactIdentity[],
): OrphanIdentityDecision {
  const email = normaliseIdentityEmail(booking.guest_email || booking.client_email);
  const phone = normaliseIdentityPhone(booking.guest_phone || booking.client_phone);

  const emailMatches = unique(
    email
      ? clients
          .filter((client) => normaliseIdentityEmail(client.email) === email)
          .map((client) => client.id)
      : [],
  );
  const phoneMatches = unique(
    phone
      ? clients
          .filter((client) => normaliseIdentityPhone(client.phone) === phone)
          .map((client) => client.id)
      : [],
  );

  if (email && phone) {
    if (emailMatches.length === 1 && phoneMatches.length === 1) {
      if (emailMatches[0] === phoneMatches[0]) {
        return {
          status: "auto_link",
          reason: "partial_contact_match",
          matchedClientId: emailMatches[0],
          emailMatches,
          phoneMatches,
        };
      }

      return {
        status: "needs_review",
        reason: "conflicting_contact_matches",
        matchedClientId: null,
        emailMatches,
        phoneMatches,
      };
    }

    if (emailMatches.length > 1) {
      return {
        status: "needs_review",
        reason: "multiple_email_matches",
        matchedClientId: null,
        emailMatches,
        phoneMatches,
      };
    }

    if (phoneMatches.length > 1) {
      return {
        status: "needs_review",
        reason: "multiple_phone_matches",
        matchedClientId: null,
        emailMatches,
        phoneMatches,
      };
    }

    if (emailMatches.length === 1 || phoneMatches.length === 1) {
      return {
        status: "needs_review",
        reason: "partial_contact_match",
        matchedClientId: null,
        emailMatches,
        phoneMatches,
      };
    }

    return {
      status: "keep_separate",
      reason: "no_match",
      matchedClientId: null,
      emailMatches,
      phoneMatches,
    };
  }

  if (email) {
    if (emailMatches.length === 1) {
      return {
        status: "auto_link",
        reason: "partial_contact_match",
        matchedClientId: emailMatches[0],
        emailMatches,
        phoneMatches,
      };
    }
    if (emailMatches.length > 1) {
      return {
        status: "needs_review",
        reason: "multiple_email_matches",
        matchedClientId: null,
        emailMatches,
        phoneMatches,
      };
    }
    return {
      status: "keep_separate",
      reason: "no_match",
      matchedClientId: null,
      emailMatches,
      phoneMatches,
    };
  }

  if (phone) {
    if (phoneMatches.length === 1) {
      return {
        status: "auto_link",
        reason: "partial_contact_match",
        matchedClientId: phoneMatches[0],
        emailMatches,
        phoneMatches,
      };
    }
    if (phoneMatches.length > 1) {
      return {
        status: "needs_review",
        reason: "multiple_phone_matches",
        matchedClientId: null,
        emailMatches,
        phoneMatches,
      };
    }
    return {
      status: "keep_separate",
      reason: "no_match",
      matchedClientId: null,
      emailMatches,
      phoneMatches,
    };
  }

  return {
    status: "needs_review",
    reason: "missing_contact_details",
    matchedClientId: null,
    emailMatches,
    phoneMatches,
  };
}
