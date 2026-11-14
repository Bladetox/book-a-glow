/**
 * Video-call service helpers (see docs/VIDEO_CONSULTATION_BUILD_SCOPE.md).
 *
 * NextSlot never starts or hosts a call. These helpers only build the
 * WhatsApp contact link the tenant clicks on the appointment day.
 */

/**
 * Normalise a phone number to WhatsApp's wa.me format: digits only, with the
 * country code and no leading zero or "+".
 *
 * - South African local numbers (10 digits starting with 0) become 27XXXXXXXXX.
 * - International numbers ("+44…", "0044…", "44…") keep their country code.
 * - Returns null when the input can't be a valid number, so callers render an
 *   unavailable state instead of a broken link.
 */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    if (digits.startsWith("0")) return null;
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    if (digits.length !== 10) return null;
    digits = `27${digits.slice(1)}`;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** https://wa.me/<digits> for a client phone number, or null if unusable. */
export function buildWhatsAppContactUrl(raw: string | null | undefined): string | null {
  const digits = toWhatsAppDigits(raw);
  return digits ? `https://wa.me/${digits}` : null;
}

/**
 * Service fields to write when the Video call toggle changes.
 * Enabling video calls switches off call-out, so no call-out fee, distance or
 * waiver can apply to the service. Disabling video calls only clears the flag
 * and leaves call-out as it was.
 */
export function videoServiceFields(isVideoConsultation: boolean):
  | { is_video_consultation: true; is_call_out_available: false }
  | { is_video_consultation: false } {
  return isVideoConsultation
    ? { is_video_consultation: true, is_call_out_available: false }
    : { is_video_consultation: false };
}
