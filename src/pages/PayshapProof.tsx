import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Stage = "loading" | "form" | "submitted" | "not-found" | "already-submitted";

interface BookingInfo {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  client_name: string | null;
  client_email: string | null;
  service_names: string[];
  booking_date: string;
  start_time: string;
  status: string;
  deposit_amount: number | null;
  total_amount: number | null;
  balance_due: number | null;
  deposit_paid: boolean | null;
  full_payment_received: boolean | null;
  payshap_reference: string | null;
}

export default function PayshapProof() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [stage, setStage] = useState<Stage>("loading");
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [reference, setReference] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── load booking ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) { setStage("not-found"); return; }

    supabase
      .from("bookings")
      .select(`
        id,
        guest_name,
        guest_email,
        client_name,
        client_email,
        booking_date,
        start_time,
        status,
        deposit_amount,
        total_amount,
        balance_due,
        deposit_paid,
        full_payment_received,
        payshap_reference,
        booking_services ( services ( name ) )
      `)
      .eq("id", bookingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStage("not-found"); return; }

        // Guard: already submitted via either status value
        if (
          data.status === "payment_claimed" ||
          data.status === "payshap_proof_submitted" ||
          data.status === "confirmed"
        ) {
          setStage("already-submitted");
          return;
        }

        const serviceNames = (data.booking_services ?? []).flatMap((bs: any) =>
          bs.services?.name ? [bs.services.name] : []
        );

        setBooking({
          id: data.id,
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          client_name: data.client_name,
          client_email: data.client_email,
          booking_date: data.booking_date,
          start_time: data.start_time,
          status: data.status,
          deposit_amount: data.deposit_amount,
          total_amount: data.total_amount,
          balance_due: data.balance_due,
          deposit_paid: data.deposit_paid,
          full_payment_received: data.full_payment_received,
          payshap_reference: data.payshap_reference,
          service_names: serviceNames,
        });
        setStage("form");
      });
  }, [bookingId]);

  // ── submit ────────────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!booking) return;
      if (!reference.trim()) {
        alert("Please enter your PayShap reference number.");
        return;
      }
      const parsedAmount = parseFloat(amountPaid);
      if (!amountPaid || isNaN(parsedAmount) || parsedAmount <= 0) {
        alert("Please enter the amount you paid.");
        return;
      }
      setSubmitting(true);
    
      try {
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({
            payshap_reference: reference.trim(),
            payshap_amount_claimed: parsedAmount,
            status: "payment_claimed",
            payshap_claimed_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

      if (updateErr) throw updateErr;

      // Trigger notification email to tenant + acknowledgement to client.
      await supabase.functions.invoke("send-booking-email", {
        body: { booking_id: booking.id, email_type: "payshap_proof_submitted" },
      });

      setStage("submitted");
    } catch (err) {
      console.error("PayshapProof submit error:", err);
      alert("Something went wrong. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  const displayName = booking?.guest_name || booking?.client_name || "there";
  const currency = "R";

  const containerStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#f7f6f2",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 20,
    padding: "2rem 1.5rem",
    maxWidth: 440,
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  };

  if (stage === "loading") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: "#888", textAlign: "center" }}>Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (stage === "not-found") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Booking not found</h1>
          <p style={{ color: "#888", fontSize: 14 }}>This link may have expired or the booking does not exist.</p>
        </div>
      </div>
    );
  }

  if (stage === "already-submitted") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Already received</h1>
          <p style={{ color: "#888", fontSize: 14 }}>We have already received your payment reference. We will be in touch to confirm your booking.</p>
        </div>
      </div>
    );
  }

  if (stage === "submitted") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#e6f4ea", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <span style={{ fontSize: 28 }}>&#10003;</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Reference submitted</h1>
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>
              Thanks, {displayName}! We have received your PayShap reference and will verify your payment shortly.
              You will receive a confirmation email once your booking is confirmed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // stage === "form"
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Confirm your PayShap payment</h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Hi {displayName}, please enter the reference number you used when making your PayShap payment.
        </p>

        {/* booking summary */}
        <div style={{
          background: "#f9f9f9",
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 20,
          fontSize: 13,
          color: "#444",
          lineHeight: 1.7,
        }}>
          {booking?.service_names.length ? (
            <p><strong>Services:</strong> {booking.service_names.join(", ")}</p>
          ) : null}
          {booking?.booking_date && (
            <p><strong>Date:</strong> {new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</p>
          )}
          {booking?.start_time && (
            <p><strong>Time:</strong> {booking.start_time.slice(0, 5)}</p>
          )}
          {booking?.deposit_paid && !booking?.full_payment_received && booking?.balance_due != null && (
            <p><strong>Balance due on the day:</strong> {currency}{booking.balance_due.toLocaleString()}</p>
          )}
          {booking?.full_payment_received && (
            <p><strong>Payment:</strong> Paid in full</p>
          )}
          {!booking?.deposit_paid && !booking?.full_payment_received && booking?.deposit_amount != null && (
            <p><strong>Deposit to confirm:</strong> {currency}{booking.deposit_amount.toLocaleString()}</p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* reference input */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="reference"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#555",
                marginBottom: 6,
              }}
            >
              PayShap Reference
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Jane Smith"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #ddd",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#01696f")}
              onBlur={(e) => (e.target.style.borderColor = "#ddd")}
            />
            <p style={{ fontSize: 12, color: "#888", marginTop: 5 }}>
              This is the name or reference you used when sending the PayShap payment.
            </p>
          </div>

                    {/* amount paid input */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="amountPaid"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#555",
                marginBottom: 6,
              }}
            >
              Amount Paid (R)
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  color: "#888",
                  pointerEvents: "none",
                }}
              >
                R
              </span>
              <input
                id="amountPaid"
                type="number"
                min="1"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                required
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 26px",
                  borderRadius: 10,
                  border: "1.5px solid #ddd",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#01696f")}
                onBlur={(e) => (e.target.style.borderColor = "#ddd")}
              />
            </div>
            <p style={{ fontSize: 12, color: "#888", marginTop: 5 }}>
              Enter the exact amount you sent via PayShap.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={submitting || !reference.trim() || !amountPaid || parseFloat(amountPaid) <= 0}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              background: submitting || !reference.trim() || !amountPaid || parseFloat(amountPaid) <= 0 ? "#aaa" : "#01696f",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: submitting || !reference.trim() || !amountPaid || parseFloat(amountPaid) <= 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {submitting ? "Submitting..." : "I have paid via PayShap"}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "#aaa", marginTop: 20, textAlign: "center", lineHeight: 1.6 }}>
          Having trouble?{" "}
          <a href="mailto:support@nextslot.co.za" style={{ color: "#01696f" }}>
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
