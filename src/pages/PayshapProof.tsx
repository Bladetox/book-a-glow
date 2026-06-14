import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ─── types ───────────────────────────────────────────────────────────────────

interface BookingSummary {
  id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  deposit_amount: number;
  balance_due: number;
  client_name: string;
  client_email: string | null;
  tenant_id: string;
  payshap_reference: string | null;
  status: string;
}

interface TenantPayshap {
  name: string;
  logo_url: string | null;
  payshap_number: string | null;
  payshap_name: string | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// ─── component ───────────────────────────────────────────────────────────────

type Stage = "loading" | "error" | "already_paid" | "form" | "submitted";

export default function PayshapProof() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();

  // fallback: ?booking_id=... (used in email links on marketing domain)
  const resolvedId = bookingId || searchParams.get("booking_id") || "";

  const [stage, setStage] = useState<Stage>("loading");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [tenant, setTenant] = useState<TenantPayshap | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // form state
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── load booking ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedId) {
      setErrorMsg("No booking ID found in this link. Please use the link from your email.");
      setStage("error");
      return;
    }

    (async () => {
      const { data: b, error: bErr } = await supabase
        .from("bookings")
        .select(
          "id, booking_date, start_time, total_amount, deposit_amount, balance_due, client_name, client_email, guest_name, guest_email, tenant_id, payshap_reference, status"
        )
        .eq("id", resolvedId)
        .single();

      if (bErr || !b) {
        setErrorMsg("We could not find your booking. Please double-check the link in your email.");
        setStage("error");
        return;
      }

      const clientName =
        (b as any).client_name || (b as any).guest_name || "Client";
      const clientEmail =
        (b as any).client_email || (b as any).guest_email || null;

      const summary: BookingSummary = {
        id: b.id,
        booking_date: b.booking_date,
        start_time: b.start_time,
        total_amount: parseFloat(String(b.total_amount)),
        deposit_amount: parseFloat(String(b.deposit_amount)),
        balance_due: parseFloat(String(b.balance_due ?? 0)),
        client_name: clientName,
        client_email: clientEmail,
        tenant_id: b.tenant_id,
        payshap_reference: (b as any).payshap_reference ?? null,
        status: (b as any).status ?? "",
      };

      // if already submitted or confirmed, skip form
      const alreadyDone = ["confirmed", "paid", "completed"].includes(
        summary.status
      );
      const alreadySubmitted =
        summary.status === "payshap_proof_submitted" ||
        !!summary.payshap_reference;

      if (alreadyDone) {
        setBooking(summary);
        setStage("already_paid");
        return;
      }

      if (alreadySubmitted) {
        setBooking(summary);
        setStage("submitted");
        return;
      }

      // load tenant PayShap details
      const { data: t } = await supabase
        .from("tenants")
        .select("name, logo_url")
        .eq("id", summary.tenant_id)
        .single();

      const { data: settingsRows } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", summary.tenant_id);

      const settings: Record<string, string> = {};
      settingsRows?.forEach((r: any) => {
        if (r.value) settings[r.key] = r.value;
      });

      const payshapNumber =
        settings["payshap_number"] ||
        settings["payshap_phone"] ||
        settings["payshap"] ||
        null;
      const payshapName =
        settings["payshap_name"] ||
        settings["payshap_account_name"] ||
        t?.name ||
        null;

      setTenant({
        name: t?.name ?? "Studio",
        logo_url: t?.logo_url ?? null,
        payshap_number: payshapNumber,
        payshap_name: payshapName,
      });
      setBooking(summary);
      setStage("form");
    })();
  }, [resolvedId]);

  // ── file picker ────────────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    if (!reference.trim()) {
      alert("Please enter your PayShap reference number.");
      return;
    }
    setSubmitting(true);

    try {
      let proofUrl: string | null = null;

      // upload proof screenshot if provided
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `payshap-proofs/${booking.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("booking-assets")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("booking-assets")
            .getPublicUrl(path);
          proofUrl = urlData?.publicUrl ?? null;
        }
      }

      // write reference + optional proof URL to booking
      const updatePayload: Record<string, unknown> = {
        payshap_reference: reference.trim(),
        status: "payshap_proof_submitted",
      };
      if (proofUrl) updatePayload["payshap_proof_url"] = proofUrl;

      const { error: updateErr } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", booking.id);

      if (updateErr) throw updateErr;

      // trigger the existing payshap_proof_submitted email flow
      await supabase.functions.invoke("send-booking-email", {
        body: {
          booking_id: booking.id,
          tenant_id: booking.tenant_id,
          email_type: "payshap_proof_submitted",
        },
      });

      setStage("submitted");
    } catch (err: any) {
      console.error("PayShap proof submit error:", err);
      alert(
        "Something went wrong submitting your proof. Please try again or contact the studio directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── render helpers ─────────────────────────────────────────────────────────

  const amountDue =
    booking && booking.deposit_amount < booking.total_amount
      ? booking.deposit_amount
      : booking?.total_amount ?? 0;

  const isDepositOnly =
    booking ? booking.deposit_amount < booking.total_amount : false;

  // ── shell ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f2f2f2",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px 48px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e0e0e0",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "28px 28px 18px",
            borderBottom: "1px solid #ebebeb",
            textAlign: "center",
            background: "#fff",
          }}
        >
          {tenant?.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              width={52}
              height={52}
              loading="lazy"
              style={{
                width: 52,
                height: 52,
                objectFit: "contain",
                borderRadius: 10,
                margin: "0 auto 12px",
                display: "block",
                boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
              }}
            />
          )}
          {tenant && (
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#000",
                lineHeight: 1.3,
              }}
            >
              {tenant.name}
            </p>
          )}
          <p
            style={{
              margin: "5px 0 0",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#888",
            }}
          >
            PayShap Proof of Payment
          </p>
        </div>

        {/* body */}
        <div style={{ padding: "24px 28px 32px" }}>

          {/* LOADING */}
          {stage === "loading" && (
            <p style={{ fontSize: 14, color: "#888", textAlign: "center", margin: 0 }}>
              Loading your booking...
            </p>
          )}

          {/* ERROR */}
          {stage === "error" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 32, margin: "0 0 10px" }}>&#x26A0;&#xFE0F;</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#000", margin: "0 0 8px" }}>
                Could not load booking
              </p>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 }}>
                {errorMsg}
              </p>
            </div>
          )}

          {/* ALREADY CONFIRMED */}
          {stage === "already_paid" && booking && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 36, margin: "0 0 10px" }}>&#10003;</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#000", margin: "0 0 8px" }}>
                Your booking is confirmed
              </p>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 20px" }}>
                {fmt(booking.booking_date)} at {fmtTime(booking.start_time)}
              </p>
              <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>
                No further action is needed.
              </p>
            </div>
          )}

          {/* ALREADY SUBMITTED */}
          {stage === "submitted" && booking && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 36, margin: "0 0 10px" }}>&#128338;</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#000", margin: "0 0 8px" }}>
                Proof submitted — awaiting confirmation
              </p>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 18px" }}>
                {booking.client_name.split(" ")[0]}, your proof of payment
                has been received.
                <br />
                {tenant?.name ?? "The studio"} will verify and confirm your
                booking shortly via WhatsApp or email.
              </p>
              {booking.payshap_reference && (
                <div
                  style={{
                    background: "#f7f7f7",
                    border: "1px solid #ebebeb",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#888",
                    display: "inline-block",
                  }}
                >
                  Reference recorded:{" "}
                  <strong style={{ color: "#111" }}>
                    {booking.payshap_reference}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* FORM */}
          {stage === "form" && booking && tenant && (
            <>
              {/* booking summary strip */}
              <div
                style={{
                  background: "#f7f7f7",
                  border: "1px solid #ebebeb",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 24,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#555",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: "#999" }}>Date</span>
                  <span style={{ fontWeight: 600, color: "#111" }}>
                    {fmt(booking.booking_date)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: "#999" }}>Time</span>
                  <span style={{ fontWeight: 600, color: "#111" }}>
                    {fmtTime(booking.start_time)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 6,
                    borderTop: "1px solid #e8e8e8",
                  }}
                >
                  <span style={{ color: "#999" }}>
                    {isDepositOnly ? "Deposit due now" : "Amount due"}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#000",
                      fontSize: 15,
                    }}
                  >
                    R{amountDue.toFixed(2)}
                  </span>
                </div>
                {isDepositOnly && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 2,
                    }}
                  >
                    <span style={{ color: "#999" }}>Balance on the day</span>
                    <span style={{ fontWeight: 600, color: "#555" }}>
                      R
                      {(booking.total_amount - booking.deposit_amount).toFixed(
                        2
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* PayShap number callout */}
              {(tenant.payshap_number || tenant.payshap_name) && (
                <div
                  style={{
                    background: "#fff",
                    border: "1.5px solid #000",
                    borderRadius: 10,
                    padding: "14px 18px",
                    marginBottom: 22,
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#888",
                    }}
                  >
                    Pay via PayShap to
                  </p>
                  {tenant.payshap_name && (
                    <p
                      style={{
                        margin: "0 0 2px",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#000",
                      }}
                    >
                      {tenant.payshap_name}
                    </p>
                  )}
                  {tenant.payshap_number && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#000",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {tenant.payshap_number}
                    </p>
                  )}
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    Amount: <strong style={{ color: "#000" }}>R{amountDue.toFixed(2)}</strong>
                  </p>
                </div>
              )}

              {/* form */}
              <form onSubmit={handleSubmit}>
                {/* reference */}
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="ps-ref"
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#555",
                      marginBottom: 6,
                    }}
                  >
                    Your PayShap Reference Number <span style={{ color: "#c00" }}>*</span>
                  </label>
                  <input
                    id="ps-ref"
                    type="text"
                    required
                    placeholder="e.g. PS1234567890"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 14,
                      border: "1px solid #d4d4d4",
                      borderRadius: 8,
                      outline: "none",
                      color: "#111",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#000")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#d4d4d4")
                    }
                  />
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 11,
                      color: "#aaa",
                    }}
                  >
                    Found in your banking app after the payment is sent.
                  </p>
                </div>

                {/* screenshot upload (optional) */}
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#555",
                      marginBottom: 6,
                    }}
                  >
                    Screenshot of Payment (optional)
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: "1.5px dashed #d0d0d0",
                      borderRadius: 8,
                      padding: "18px 12px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: filePreview ? "#f9f9f9" : "#fafafa",
                      transition: "border-color 180ms",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "#888")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "#d0d0d0")
                    }
                  >
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Payment screenshot preview"
                        width={200}
                        height={120}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 140,
                          objectFit: "contain",
                          borderRadius: 6,
                          margin: "0 auto",
                          display: "block",
                        }}
                      />
                    ) : (
                      <>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: 13,
                            color: "#666",
                          }}
                        >
                          &#128247; Tap to attach a screenshot
                        </p>
                        <p
                          style={{ margin: 0, fontSize: 11, color: "#bbb" }}
                        >
                          JPG, PNG or PDF
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFile}
                    style={{ display: "none" }}
                    aria-label="Upload payment screenshot"
                  />
                  {file && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setFilePreview(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: "#888",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Remove screenshot
                    </button>
                  )}
                </div>

                {/* submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    background: submitting ? "#888" : "#000",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    cursor: submitting ? "not-allowed" : "pointer",
                    transition: "background 180ms",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Proof of Payment"}
                </button>

                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 11,
                    color: "#bbb",
                    textAlign: "center",
                    lineHeight: 1.6,
                  }}
                >
                  {tenant.name} will verify your payment and confirm your
                  booking via WhatsApp or email.
                </p>
              </form>
            </>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            padding: "10px 28px 16px",
            background: "#f7f7f7",
            borderTop: "1px solid #ebebeb",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>
            &copy; {new Date().getFullYear()} {tenant?.name ?? "Studio"} &middot; Powered by{" "}
            <a
              href="https://nextslot.co.za"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#bbb" }}
            >
              NextSlot
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
