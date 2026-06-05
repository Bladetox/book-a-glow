import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const sections = [
  {
    title: "Agreement to Terms",
    body: `By accessing or using NextSlot's website and services, you agree to be bound by these Terms of Service and all applicable South African laws and regulations, including the Consumer Protection Act 68 of 2008 ("CPA"), the Electronic Communications and Transactions Act 25 of 2002 ("ECTA"), and the Protection of Personal Information Act 4 of 2013 ("POPIA"). If you do not agree, you must discontinue use immediately.`,
  },
  {
    title: "Definitions",
    list: [
      '"NextSlot", "we", "us" or "our" refers to NextSlot, a South African service.',
      '"User", "you" or "your" refers to any person accessing or using our services.',
      '"Service Provider" refers to barbers, beauticians, photographers, tattoo artists, and other professionals using NextSlot.',
      '"Platform" refers to our website, mobile applications, and related services.',
    ],
  },
  {
    title: "Eligibility",
    body: "You must be at least 18 years of age to use our services. By using NextSlot, you represent and warrant that you have the legal capacity to enter into a binding agreement under South African law.",
  },
  {
    title: "Description of Services",
    body: "NextSlot provides an online booking and management platform for independent service providers. We act as an intermediary and do not provide the underlying services (e.g., haircuts, beauty treatments, photography). The contract for services is between you and the relevant Service Provider.",
  },
  {
    title: "User Obligations",
    intro: "You agree to:",
    list: [
      "Provide accurate and complete information when registering or making bookings",
      "Keep your account credentials secure and confidential",
      "Not use the platform for any unlawful purpose or in violation of any South African law",
      "Not attempt to gain unauthorised access to any part of the platform",
      "Not transmit harmful code, spam, or unsolicited communications",
      "Not impersonate another person or entity",
    ],
  },
  {
    title: "Bookings and Cancellations",
    body: "Bookings made through NextSlot are subject to the availability and terms set by individual Service Providers. Cancellation policies are determined by each Service Provider and will be displayed at the time of booking. In terms of the CPA, you may have cooling-off rights in certain circumstances.",
  },
  {
    title: "Fees and Payment",
    body: "All fees are displayed in South African Rand (ZAR) and include VAT where applicable, in accordance with the Value-Added Tax Act 89 of 1991. Payment terms and methods will be clearly communicated before any transaction. We reserve the right to amend our fees with reasonable notice.",
  },
  {
    title: "Intellectual Property",
    body: "All content on NextSlot, including text, graphics, logos, software, and designs, is the property of NextSlot or its licensors and is protected under the Copyright Act 98 of 1978 and the Trade Marks Act 194 of 1993. You may not reproduce, distribute, or create derivative works without our prior written consent.",
  },
  {
    title: "User Content",
    body: "Where you submit content (such as reviews or comments), you grant NextSlot a non-exclusive, royalty-free licence to use, display, and distribute such content on our platform. You warrant that you have the right to share any content you submit and that it does not infringe any third-party rights or contravene South African law.",
  },
  {
    title: "Privacy and Personal Information",
    body: "Your personal information is processed in accordance with our Privacy Policy and the Protection of Personal Information Act 4 of 2013. By using our services, you acknowledge that you have read and understood our Privacy Policy.",
  },
  {
    title: "Electronic Communications",
    body: "In terms of ECTA, this agreement constitutes a valid and enforceable electronic agreement. Any electronic communications, including emails and notifications sent through the platform, are deemed to have been received by you when they enter your information system.",
  },
  {
    title: "Limitation of Liability",
    body: "To the fullest extent permitted by South African law, NextSlot shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability shall not exceed the amount paid by you to NextSlot in the 12 months preceding the claim. Nothing in these terms excludes liability that cannot be excluded under the CPA or other mandatory legislation.",
  },
  {
    title: "Disclaimer of Warranties",
    body: `Our platform is provided "as is" and "as available". While we strive to ensure reliability, we do not warrant that the platform will be uninterrupted, error-free, or free of harmful components. This disclaimer is subject to the implied warranties that cannot be excluded under the CPA.`,
  },
  {
    title: "Indemnification",
    body: "You agree to indemnify and hold NextSlot harmless from any claims, losses, or damages arising from your use of the platform, your violation of these terms, or your infringement of any third-party rights.",
  },
  {
    title: "Termination",
    body: "We reserve the right to suspend or terminate your access to NextSlot at any time, with or without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties. You may terminate your account at any time by contacting us.",
  },
  {
    title: "Governing Law and Jurisdiction",
    body: "These Terms of Service are governed by the laws of the Republic of South Africa. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the South African courts, specifically the courts of the Western Cape Division of the High Court, without prejudice to your rights under the CPA to refer disputes to the National Consumer Commission.",
  },
  {
    title: "Dispute Resolution",
    body: "In the event of a dispute, we encourage you to first contact us directly to seek resolution. If we cannot resolve the dispute informally, either party may refer the matter to a South African court of competent jurisdiction, or, where applicable, to the National Consumer Tribunal or other relevant regulatory body.",
  },
  {
    title: "Amendments",
    body: "We reserve the right to modify these Terms of Service at any time. Material changes will be communicated to registered users via email or a prominent notice on our platform. Your continued use of the platform after changes constitutes acceptance of the revised terms.",
  },
  {
    title: "Severability",
    body: "If any provision of these Terms of Service is found to be unenforceable or invalid under South African law, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.",
  },
  {
    title: "Entire Agreement",
    body: "These Terms of Service, together with our Privacy Policy, constitute the entire agreement between you and NextSlot regarding your use of the platform and supersede all prior agreements and understandings.",
  },
  {
    title: "Contact Us",
    body: "If you have any questions about these Terms of Service, please contact us at:\n\nEmail: legal@nextslot.co.za\nAddress: South Africa",
  },
];

const SiteTerms = () => (
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
          Terms of Service
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
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
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
            <div style={{ marginTop: 48, height: 1, background: C.border }} />
          </section>
        ))}
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default SiteTerms;
