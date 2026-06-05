import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const bodyText: React.CSSProperties = {
  fontSize: 14,
  color: C.muted,
  lineHeight: 1.8,
  fontFamily: FONT_BODY,
};

const Privacy = () => (
  <div className="nextslot-theme dark-brand" style={{ overflowX: "hidden" }}>
    <style>{HOME_STYLES}</style>
    <SiteHeader />
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 120px" }}>

      <div style={{ marginBottom: 56 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
          textTransform: "uppercase", color: C.gold,
          marginBottom: 16, fontFamily: FONT_BODY,
        } as React.CSSProperties}>
          Legal
        </p>
        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(32px, 4vw, 52px)",
          fontWeight: 700, color: C.text,
          lineHeight: 1.08, marginBottom: 12,
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: C.faint, fontFamily: FONT_BODY }}>Last updated: 8 March 2026</p>
      </div>

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}55, transparent)`, marginBottom: 56 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

        <Section title="Introduction">
          <p style={bodyText}>NextSlot ("we", "us", or "our") is committed to protecting your personal information in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA") and all other applicable South African legislation. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website and services.</p>
        </Section>

        <Section title="Responsible Party">
          <p style={bodyText}>In terms of POPIA, NextSlot is the responsible party for the processing of your personal information. Our Information Officer can be contacted at:</p>
          <p style={{ ...bodyText, marginTop: 12 }}>Email: privacy@nextslot.co.za<br />Address: South Africa</p>
        </Section>

        <Section title="Personal Information We Collect">
          <p style={bodyText}>We collect personal information as defined in POPIA, which may include:</p>
          <BulletList items={[
            "Full name and surname",
            "Email address and contact number",
            "Physical or postal address",
            "Booking history and service preferences",
            "Payment information (processed securely via third-party providers)",
            "Device and browser information collected automatically",
            "IP address and location data",
          ]} />
        </Section>

        <Section title="Purpose and Lawful Basis for Processing">
          <p style={bodyText}>In accordance with Section 9 of POPIA, we process your personal information for the following lawful purposes:</p>
          <BulletList items={[
            "To provide and manage our booking services (contractual necessity)",
            "To communicate with you about your bookings and account (legitimate interest)",
            "To send marketing communications where you have given consent",
            "To comply with legal obligations under South African law",
            "To improve and personalise our services (legitimate interest)",
            "To prevent fraud and ensure the security of our platform",
          ]} />
        </Section>

        <Section title="Consent">
          <p style={bodyText}>Where we rely on your consent to process personal information, you have the right to withdraw that consent at any time. Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal.</p>
        </Section>

        <Section title="Sharing of Personal Information">
          <p style={bodyText}>We may share your personal information with:</p>
          <BulletList items={[
            "Service Providers who need it to fulfil your bookings",
            "Payment processors and financial institutions",
            "Technology and hosting service providers",
            "Law enforcement or regulatory authorities where required by South African law",
          ]} />
          <p style={{ ...bodyText, marginTop: 12 }}>We do not sell your personal information to third parties.</p>
        </Section>

        <Section title="Transborder Flows">
          <p style={bodyText}>Where personal information is transferred outside South Africa, we ensure that the recipient country or organisation provides an adequate level of protection as required by Section 72 of POPIA, or that appropriate safeguards are in place.</p>
        </Section>

        <Section title="Retention of Personal Information">
          <p style={bodyText}>We retain your personal information for as long as necessary to fulfil the purposes for which it was collected, or as required by South African law. When information is no longer required, it is securely deleted or anonymised in accordance with POPIA.</p>
        </Section>

        <Section title="Security Measures">
          <p style={bodyText}>We implement appropriate technical and organisational security measures to protect your personal information against unauthorised access, loss, or destruction, as required by Section 19 of POPIA. However, no method of transmission over the internet is completely secure.</p>
        </Section>

        <Section title="Your Rights Under POPIA">
          <p style={bodyText}>As a data subject under POPIA, you have the right to:</p>
          <BulletList items={[
            "Request access to your personal information (Section 23)",
            "Request correction or deletion of your personal information (Section 24)",
            "Object to the processing of your personal information (Section 11(3))",
            "Submit a complaint to the Information Regulator",
            "Institute civil proceedings for damages",
          ]} />
        </Section>

        <Section title="Cookies and Tracking">
          <p style={bodyText}>We use cookies and similar tracking technologies to improve your experience on our platform. You can control cookie settings through your browser. Essential cookies required for the platform to function cannot be disabled. By continuing to use our platform, you consent to our use of cookies as described in this policy.</p>
        </Section>

        <Section title="Direct Marketing">
          <p style={bodyText}>In terms of Section 69 of POPIA, we will only send you direct marketing communications where you have given your consent or where we have an existing relationship with you and you have not opted out. You may opt out of marketing communications at any time by clicking the unsubscribe link in our emails or contacting us directly.</p>
        </Section>

        <Section title="Information Regulator">
          <p style={bodyText}>If you believe we have not complied with POPIA, you have the right to lodge a complaint with the Information Regulator of South Africa:</p>
          <p style={{ ...bodyText, marginTop: 12 }}>Website: www.inforegulator.org.za<br />Email: inforeg@justice.gov.za</p>
        </Section>

        <Section title="Changes to This Policy">
          <p style={bodyText}>We may update this Privacy Policy from time to time to reflect changes in our practices or South African legislation. Material changes will be communicated via email or a prominent notice on our platform. We encourage you to review this policy periodically.</p>
        </Section>

        <Section title="Contact Us">
          <p style={bodyText}>For any privacy-related queries or to exercise your rights under POPIA, please contact our Information Officer:</p>
          <p style={{ ...bodyText, marginTop: 12 }}>Email: privacy@nextslot.co.za<br />Address: South Africa</p>
        </Section>

      </div>
    </main>
    <SiteFooter />
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 style={{
      fontFamily: FONT_DISPLAY,
      fontSize: 18, fontWeight: 700,
      color: C.text,
      marginBottom: 12,
    }}>
      {title}
    </h2>
    <div>{children}</div>
  </section>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
    {items.map((item) => (
      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          marginTop: 6, width: 5, height: 5, borderRadius: "50%",
          background: C.gold, flexShrink: 0, display: "inline-block",
        }} />
        <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, fontFamily: FONT_BODY }}>
          {item}
        </span>
      </li>
    ))}
  </ul>
);

export default Privacy;
