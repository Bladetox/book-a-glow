import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const SiteTerms = () => (
  <div className="nextslot-theme dark-brand" style={{ overflowX: "hidden" }}>
    <style>{HOME_STYLES}</style>
    <SiteHeader />
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 120px" }}>

      {/* Page heading */}
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
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: C.faint, fontFamily: FONT_BODY }}>Last updated: 8 March 2026</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}55, transparent)`, marginBottom: 56 }} />

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

        <Section title="Agreement to Terms">
          By accessing or using NextSlot's website and services, you agree to be bound by these Terms of Service and all applicable South African laws and regulations, including the Consumer Protection Act 68 of 2008 ("CPA"), the Electronic Communications and Transactions Act 25 of 2002 ("ECTA"), and the Protection of Personal Information Act 4 of 2013 ("POPIA"). If you do not agree, you must discontinue use immediately.
        </Section>

        <Section title="Definitions">
          <BulletList items={[
            '"NextSlot", "we", "us" or "our" refers to NextSlot, a South African service.',
            '"User", "you" or "your" refers to any person accessing or using our services.',
            '"Service Provider" refers to barbers, beauticians, photographers, tattoo artists, and other professionals using NextSlot.',
            '"Platform" refers to our website, mobile applications, and related services.',
          ]} />
        </Section>

        <Section title="Eligibility">
          You must be at least 18 years of age to use our services. By using NextSlot, you represent and warrant that you have the legal capacity to enter into a binding agreement under South African law.
        </Section>

        <Section title="Description of Services">
          NextSlot provides an online booking and management platform for independent service providers. We act as an intermediary and do not provide the underlying services (e.g., haircuts, beauty treatments, photography). The contract for services is between you and the relevant Service Provider.
        </Section>

        <Section title="User Obligations">
          You agree to:
          <BulletList items={[
            "Provide accurate and complete information when registering or making bookings",
            "Keep your account credentials secure and confidential",
            "Not use the platform for any unlawful purpose or in violation of any South African law",
            "Not attempt to gain unauthorised access to any part of the platform",
            "Not transmit harmful code, spam, or unsolicited communications",
            "Not impersonate another person or entity",
          ]} />
        </Section>

        <Section title="Bookings and Cancellations">
          Bookings made through NextSlot are subject to the availability and terms set by individual Service Providers. Cancellation policies are determined by each Service Provider and will be displayed at the time of booking. In terms of the CPA, you may have cooling-off rights in certain circumstances.
        </Section>

        <Section title="Fees and Payment">
          All fees are displayed in South African Rand (ZAR) and include VAT where applicable, in accordance with the Value-Added Tax Act 89 of 1991. Payment terms and methods will be clearly communicated before any transaction. We reserve the right to amend our fees with reasonable notice.
        </Section>

        <Section title="Intellectual Property">
          All content on NextSlot, including text, graphics, logos, software, and designs, is the property of NextSlot or its licensors and is protected under the Copyright Act 98 of 1978 and the Trade Marks Act 194 of 1993. You may not reproduce, distribute, or create derivative works without our prior written consent.
        </Section>

        <Section title="User Content">
          Where you submit content (such as reviews or comments), you grant NextSlot a non-exclusive, royalty-free licence to use, display, and distribute such content on our platform. You warrant that you have the right to share any content you submit and that it does not infringe any third-party rights or contravene South African law.
        </Section>

        <Section title="Privacy and Personal Information">
          Your personal information is processed in accordance with our Privacy Policy and the Protection of Personal Information Act 4 of 2013. By using our services, you acknowledge that you have read and understood our Privacy Policy.
        </Section>

        <Section title="Electronic Communications">
          In terms of ECTA, this agreement constitutes a valid and enforceable electronic agreement. Any electronic communications, including emails and notifications sent through the platform, are deemed to have been received by you when they enter your information system.
        </Section>

        <Section title="Limitation of Liability">
          To the fullest extent permitted by South African law, NextSlot shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability shall not exceed the amount paid by you to NextSlot in the 12 months preceding the claim. Nothing in these terms excludes liability that cannot be excluded under the CPA or other mandatory legislation.
        </Section>

        <Section title="Disclaimer of Warranties">
          Our platform is provided "as is" and "as available". While we strive to ensure reliability, we do not warrant that the platform will be uninterrupted, error-free, or free of harmful components. This disclaimer is subject to the implied warranties that cannot be excluded under the CPA.
        </Section>

        <Section title="Indemnification">
          You agree to indemnify and hold NextSlot harmless from any claims, losses, or damages arising from your use of the platform, your violation of these terms, or your infringement of any third-party rights.
        </Section>

        <Section title="Termination">
          We reserve the right to suspend or terminate your access to NextSlot at any time, with or without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties. You may terminate your account at any time by contacting us.
        </Section>

        <Section title="Governing Law and Jurisdiction">
          These Terms of Service are governed by the laws of the Republic of South Africa. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the South African courts, specifically the courts of the Western Cape Division of the High Court, without prejudice to your rights under the CPA to refer disputes to the National Consumer Commission.
        </Section>

        <Section title="Dispute Resolution">
          In the event of a dispute, we encourage you to first contact us directly to seek resolution. If we cannot resolve the dispute informally, either party may refer the matter to a South African court of competent jurisdiction, or, where applicable, to the National Consumer Tribunal or other relevant regulatory body.
        </Section>

        <Section title="Amendments">
          We reserve the right to modify these Terms of Service at any time. Material changes will be communicated to registered users via email or a prominent notice on our platform. Your continued use of the platform after changes constitutes acceptance of the revised terms.
        </Section>

        <Section title="Severability">
          If any provision of these Terms of Service is found to be unenforceable or invalid under South African law, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
        </Section>

        <Section title="Entire Agreement">
          These Terms of Service, together with our Privacy Policy, constitute the entire agreement between you and NextSlot regarding your use of the platform and supersede all prior agreements and understandings.
        </Section>

        <Section title="Contact Us">
          If you have any questions about these Terms of Service, please contact us at:
          <br /><br />
          Email: legal@nextslot.co.za<br />Address: South Africa
        </Section>

      </div>
    </main>
    <SiteFooter />
  </div>
);

/* ── Sub-components ── */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 style={{
      fontFamily: "'Montserrat', sans-serif",
      fontSize: 18, fontWeight: 700,
      color: "#e8e8e6",
      marginBottom: 12,
    }}>
      {title}
    </h2>
    <p style={{
      fontSize: 14, color: "rgba(232,232,230,0.52)",
      lineHeight: 1.8, fontFamily: "'Inter', sans-serif",
    }}>
      {children}
    </p>
  </section>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
    {items.map((item) => (
      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          marginTop: 6, width: 5, height: 5, borderRadius: "50%",
          background: "#D4A574", flexShrink: 0, display: "inline-block",
        }} />
        <span style={{ fontSize: 14, color: "rgba(232,232,230,0.52)", lineHeight: 1.8, fontFamily: "'Inter', sans-serif" }}>
          {item}
        </span>
      </li>
    ))}
  </ul>
);

export default SiteTerms;
