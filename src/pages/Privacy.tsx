import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const sections = [
  {
    title: "Introduction",
    body: `NextSlot ("we", "us", or "our") is committed to protecting your personal information in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA") and all other applicable South African legislation. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website and services.`,
  },
  {
    title: "Responsible Party",
    body: `In terms of POPIA, NextSlot is the responsible party for the processing of your personal information. Our Information Officer can be contacted at:\n\nEmail: privacy@nextslot.co.za\nAddress: South Africa`,
  },
  {
    title: "Personal Information We Collect",
    intro: "We collect personal information as defined in POPIA, which may include:",
    list: [
      "Full name and surname",
      "Email address and contact number",
      "Physical or postal address",
      "Booking history and service preferences",
      "Payment information (processed securely via third-party providers)",
      "Device and browser information collected automatically",
      "IP address and location data",
    ],
  },
  {
    title: "Purpose and Lawful Basis for Processing",
    intro: "In accordance with Section 9 of POPIA, we process your personal information for the following lawful purposes:",
    list: [
      "To provide and manage our booking services (contractual necessity)",
      "To communicate with you about your bookings and account (legitimate interest)",
      "To send marketing communications where you have given consent",
      "To comply with legal obligations under South African law",
      "To improve and personalise our services (legitimate interest)",
      "To prevent fraud and ensure the security of our platform",
    ],
  },
  {
    title: "Consent",
    body: "Where we rely on your consent to process personal information, you have the right to withdraw that consent at any time. Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal.",
  },
  {
    title: "Sharing of Personal Information",
    intro: "We may share your personal information with:",
    list: [
      "Service Providers who need it to fulfil your bookings",
      "Payment processors and financial institutions",
      "Technology and hosting service providers",
      "Law enforcement or regulatory authorities where required by South African law",
    ],
    footer: "We do not sell your personal information to third parties.",
  },
  {
    title: "Transborder Flows",
    body: "Where personal information is transferred outside South Africa, we ensure that the recipient country or organisation provides an adequate level of protection as required by Section 72 of POPIA, or that appropriate safeguards are in place.",
  },
  {
    title: "Retention of Personal Information",
    body: "We retain your personal information for as long as necessary to fulfil the purposes for which it was collected, or as required by South African law. When information is no longer required, it is securely deleted or anonymised in accordance with POPIA.",
  },
  {
    title: "Security Measures",
    body: "We implement appropriate technical and organisational security measures to protect your personal information against unauthorised access, loss, or destruction, as required by Section 19 of POPIA. However, no method of transmission over the internet is completely secure.",
  },
  {
    title: "Your Rights Under POPIA",
    intro: "As a data subject under POPIA, you have the right to:",
    list: [
      "Request access to your personal information (Section 23)",
      "Request correction or deletion of your personal information (Section 24)",
      "Object to the processing of your personal information (Section 11(3))",
      "Submit a complaint to the Information Regulator",
      "Institute civil proceedings for damages",
    ],
  },
  {
    title: "Cookies and Tracking",
    body: "We use cookies and similar tracking technologies to improve your experience on our platform. You can control cookie settings through your browser. Essential cookies required for the platform to function cannot be disabled. By continuing to use our platform, you consent to our use of cookies as described in this policy.",
  },
  {
    title: "Direct Marketing",
    body: "In terms of Section 69 of POPIA, we will only send you direct marketing communications where you have given your consent or where we have an existing relationship with you and you have not opted out. You may opt out of marketing communications at any time by clicking the unsubscribe link in our emails or contacting us directly.",
  },
  {
    title: "Information Regulator",
    body: "If you believe we have not complied with POPIA, you have the right to lodge a complaint with the Information Regulator of South Africa:\n\nWebsite: www.inforegulator.org.za\nEmail: inforeg@justice.gov.za",
  },
  {
    title: "Changes to This Policy",
    body: "We may update this Privacy Policy from time to time to reflect changes in our practices or South African legislation. Material changes will be communicated via email or a prominent notice on our platform. We encourage you to review this policy periodically.",
  },
  {
    title: "Contact Us",
    body: "For any privacy-related queries or to exercise your rights under POPIA, please contact our Information Officer:\n\nEmail: privacy@nextslot.co.za\nAddress: South Africa",
  },
];

const Privacy = () => (
  <div
    className="nextslot-theme dark-brand min-h-screen"
    style={{ background: C.bg, color: C.text, fontFamily: FONT_BODY }}
  >
    <style>{HOME_STYLES}</style>
    <SiteHeader />
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "72px 24px 120px" }}>

      {/* Hero */}
      <div style={{ marginBottom: 64 }}>
        <p
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: C.gold,
            marginBottom: 16, fontFamily: FONT_BODY,
          }}
        >
          Legal
        </p>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 700, color: C.text,
            lineHeight: 1.08, marginBottom: 16,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: C.muted, fontFamily: FONT_BODY }}>
          Last updated: 8 March 2026
        </p>
        <div
          style={{
            marginTop: 32, height: 1,
            background: `linear-gradient(90deg, ${C.gold}66, transparent)`,
          }}
        />
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {sections.map((s) => (
          <section key={s.title}>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 18, fontWeight: 700,
                color: C.text, marginBottom: 12,
              }}
            >
              {s.title}
            </h2>
            {s.intro && (
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, marginBottom: 12, fontFamily: FONT_BODY }}>
                {s.intro}
              </p>
            )}
            {s.list && (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, marginBottom: s.footer ? 16 : 0 }}>
                {s.list.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span
                      style={{
                        marginTop: 7, width: 5, height: 5,
                        borderRadius: "50%", flexShrink: 0,
                        background: C.gold, opacity: 0.7,
                      }}
                    />
                    <span style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, fontFamily: FONT_BODY }}>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.body && (
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, whiteSpace: "pre-line", fontFamily: FONT_BODY }}>
                {s.body}
              </p>
            )}
            {s.footer && (
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                {s.footer}
              </p>
            )}
            <div style={{ marginTop: 48, height: 1, background: C.border }} />
          </section>
        ))}
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default Privacy;
