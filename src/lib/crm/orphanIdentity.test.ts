import { describe, expect, it } from "vitest";
import { resolveOrphanIdentity } from "./orphanIdentity";

const clients = [
  { id: "a", email: "a@example.com", phone: "082 111 1111" },
  { id: "b", email: "b@example.com", phone: "082 222 2222" },
];

describe("resolveOrphanIdentity", () => {
  it("links when email and phone identify the same client", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-1", guest_email: "A@EXAMPLE.COM", guest_phone: "+27 82 111 1111" },
        clients,
      ),
    ).toMatchObject({ status: "auto_link", matchedClientId: "a" });
  });

  it("links on a unique email when no phone is available", () => {
    expect(
      resolveOrphanIdentity({ id: "booking-2", guest_email: "a@example.com" }, clients),
    ).toMatchObject({ status: "auto_link", matchedClientId: "a" });
  });

  it("links on a unique phone when no email is available", () => {
    expect(
      resolveOrphanIdentity({ id: "booking-3", guest_phone: "0821111111" }, clients),
    ).toMatchObject({ status: "auto_link", matchedClientId: "a" });
  });

  it("does not merge when email and phone point to different clients", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-4", guest_email: "a@example.com", guest_phone: "0822222222" },
        clients,
      ),
    ).toMatchObject({ status: "needs_review", reason: "conflicting_contact_matches" });
  });

  it("does not merge when one of two supplied contacts matches only one client", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-5", guest_email: "a@example.com", guest_phone: "0829999999" },
        clients,
      ),
    ).toMatchObject({ status: "needs_review", reason: "partial_contact_match" });
  });

  it("keeps an unmatched contact separate", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-6", guest_email: "new@example.com", guest_phone: "0829999999" },
        clients,
      ),
    ).toMatchObject({ status: "keep_separate", reason: "no_match" });
  });

  it("flags duplicate email matches", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-7", guest_email: "a@example.com" },
        [...clients, { id: "c", email: "a@example.com", phone: "0833333333" }],
      ),
    ).toMatchObject({ status: "needs_review", reason: "multiple_email_matches" });
  });

  it("flags duplicate phone matches", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-8", guest_phone: "0821111111" },
        [...clients, { id: "c", email: "c@example.com", phone: "0821111111" }],
      ),
    ).toMatchObject({ status: "needs_review", reason: "multiple_phone_matches" });
  });

  it("never uses name similarity as identity evidence", () => {
    expect(
      resolveOrphanIdentity(
        { id: "booking-9", guest_name: "Tamaryn Hartnic" },
        [{ id: "a", email: "a@example.com", phone: "0821111111" }],
      ),
    ).toMatchObject({ status: "needs_review", reason: "missing_contact_details" });
  });
});
