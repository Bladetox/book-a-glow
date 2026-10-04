import { ArrowRight, Check } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import { C, FONT_BODY, BP } from "@/components/home/tokens";
import { useWindowWidth } from "@/components/home/useWindowWidth";

const PHOTO = "https://iili.io/Cxw0jRI.jpg";

const metrics = [
  { value: "R63,851", label: "revenue facilitated over 90 days" },
  { value: "+68%", label: "vs previous period" },
  { value: "101", label: "returning bookings, 51% of acquisition" },
  { value: "52", label: "TikTok bookings, 26% of acquisition" },
];

const journey = [
  {
    number: "01",
    label: "Before NextSlot",
    title: "The business was running through conversations.",
    body: "PhenomeBeauty was taking bookings through WhatsApp, collecting deposits by EFT and keeping track of the work through a diary and manual records.",
    points: [
      "Booking conversations lived in WhatsApp",
      "Deposits meant sending banking details and checking proof of payment",
      "Client and booking information had to be tracked manually",
      "The owner had limited visibility into what was actually driving the business",
    ],
  },
  {
    number: "02",
    label: "With NextSlot",
    title: "The booking became a system.",
    body: "Clients could book available services, pay a deposit and receive a confirmed appointment without the owner having to manage every step in a conversation.",
    points: [
      "Online booking replaced the back-and-forth for appointments",
      "Payment status stayed connected to the booking",
      "Client history and business activity became visible in one system",
      "The dashboard and Nexty turned activity into practical areas to focus on",
    ],
  },
  {
    number: "03",
    label: "What the data revealed",
    title: "The business could finally see where to focus.",
    body: "Once the activity was visible, the numbers started answering questions that had previously been based on assumptions.",
    points: [
      "Returning clients accounted for 51% of acquisition",
      "TikTok accounted for 26% of acquisition",
      "Hollywood was the highest-volume service in the period",
      "Nexty identified growth, retention and operations opportunities from the real activity",
    ],
  },
];

const CaseStudy = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>
        <section style={{ position: "relative", overflow: "hidden", background: C.s1, borderBottom: "1px solid " + C.border }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 70% 60% at 70% 0%, rgba(212,165,116,0.10) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: isMobile ? "72px 24px 64px" : "112px 40px 88px",
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.15fr .85fr",
              gap: isMobile ? 40 : 72,
              alignItems: "center",
            }}
          >
            <div>
              <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, margin: "0 0 16px" }}>
                A real business using NextSlot
              </p>
              <h1 style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 38 : 60, fontWeight: 700, lineHeight: 1.03, letterSpacing: "-0.035em", color: C.text, margin: "0 0 22px" }}>
                What changed when PhenomeBeauty could finally see the business behind the bookings.
              </h1>
              <p style={{ fontFamily: FONT_BODY, fontSize: 17, lineHeight: 1.75, color: C.muted, maxWidth: 650, margin: "0 0 28px" }}>
                Shu-meez has 17 years in the beauty industry and has run PhenomeBeauty in Cape Town for 6 years. This is what happened when bookings, payments, client activity and business performance came into the same view.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: isMobile ? 250 : 310, height: isMobile ? 250 : 310 }}>
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(212,165,116,0.16) 0%, transparent 68%)",
                  }}
                />
                <img
                  src={PHOTO}
                  alt="Shu-meez, owner of PhenomeBeauty"
                  style={{
                    position: "absolute",
                    inset: isMobile ? 22 : 28,
                    width: isMobile ? 206 : 254,
                    height: isMobile ? 206 : 254,
                    borderRadius: "50%",
                    objectFit: "cover",
                    objectPosition: "center top",
                    border: "2px solid rgba(212,165,116,0.45)",
                    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: C.bg, padding: isMobile ? "40px 24px" : "52px 40px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 12 }}>
            {metrics.map((metric) => (
              <div key={metric.label} style={{ background: C.s2, border: "1px solid " + C.border2, borderRadius: 16, padding: isMobile ? "20px 16px" : "24px 20px" }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 22 : 30, fontWeight: 800, color: C.gold, margin: "0 0 8px" }}>{metric.value}</p>
                <p style={{ fontFamily: FONT_BODY, fontSize: 11, lineHeight: 1.5, color: C.muted, margin: 0 }}>{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: C.s1, borderTop: "1px solid " + C.border, borderBottom: "1px solid " + C.border }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "72px 24px" : "96px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, margin: "0 0 12px" }}>
                The shift
              </p>
              <h2 style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 30 : 44, lineHeight: 1.08, color: C.text, margin: "0 0 16px" }}>
                From booking admin to business visibility.
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.75, color: C.muted, maxWidth: 620, margin: "0 auto" }}>
                NextSlot did not create the demand. It made the activity around that demand easier to manage and easier to understand.
              </p>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              {journey.map((item) => (
                <article key={item.number} style={{ background: C.bg, border: item.number === "03" ? "1.5px solid rgba(212,165,116,0.45)" : "1px solid " + C.border, borderRadius: 18, padding: isMobile ? "24px" : "30px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "74px 1fr", gap: 18 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 700, color: C.gold }}>{item.number}</div>
                  <div>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint, margin: "0 0 8px" }}>{item.label}</p>
                    <h3 style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 21 : 25, lineHeight: 1.15, color: C.text, margin: "0 0 12px" }}>{item.title}</h3>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.75, color: C.muted, maxWidth: 700, margin: "0 0 18px" }}>{item.body}</p>
                    <div style={{ display: "grid", gap: 9 }}>
                      {item.points.map(point => (
                        <div key={point} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.55, color: C.text }}>
                          <Check size={15} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "72px 24px" : "96px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 40 }}>
            <div>
              <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, margin: "0 0 12px" }}>What the data showed</p>
              <h2 style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 28 : 38, lineHeight: 1.1, color: C.text, margin: "0 0 18px" }}>The system made patterns visible.</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.75, color: C.muted, margin: 0 }}>
                The value was not just having more records. It was being able to connect the records to decisions about acquisition, services, retention and operations.
              </p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["Returning", "101 bookings", "51% of acquisition"],
                ["TikTok", "52 bookings", "26% of acquisition"],
                ["Website", "24 bookings", "12% of acquisition"],
                ["Referral", "19 bookings", "10% of acquisition"],
              ].map(([label, value, detail]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center", padding: "15px 16px", border: "1px solid " + C.border, borderRadius: 12, background: C.s2 }}>
                  <div>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.text, margin: "0 0 3px" }}>{label}</p>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.faint, margin: 0 }}>{detail}</p>
                  </div>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 700, color: C.gold }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: C.s1, borderTop: "1px solid " + C.border, borderBottom: "1px solid " + C.border, padding: isMobile ? "72px 24px" : "88px 40px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, margin: "0 0 14px" }}>What Nexty found</p>
            <h2 style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 28 : 40, lineHeight: 1.08, color: C.text, margin: "0 0 16px" }}>The dashboard showed what happened. Nexty helped identify what to do about it.</h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.75, color: C.muted, maxWidth: 720, margin: "0 0 28px" }}>
              In this 90-day period, Nexty surfaced 7 growth insights, 2 retention insights and 2 operations insights. Across those insights, R13,038 in recoverable opportunity was identified.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
              {[
                ["7", "Growth insights"],
                ["2", "Retention insights"],
                ["2", "Operations insights"],
              ].map(([value, label]) => (
                <div key={label} style={{ background: C.bg, border: "1px solid " + C.border2, borderRadius: 14, padding: "20px" }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 26, fontWeight: 800, color: C.gold, margin: "0 0 5px" }}>{value}</p>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.muted, margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: isMobile ? "64px 24px" : "80px 40px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", background: "rgba(212,165,116,0.06)", border: "1px solid rgba(212,165,116,0.24)", borderRadius: 20, padding: isMobile ? "28px 22px" : "38px 42px" }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, margin: "0 0 18px" }}>Shu-meez on the change</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 23 : 30, lineHeight: 1.25, color: C.text, margin: "0 0 20px" }}>
              "For the first time, business felt like it was running itself."
            </p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.7, color: C.muted, margin: "0 0 18px" }}>
              NextSlot facilitated bookings and business growth resulting in R63,851 over 90 days.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={PHOTO} alt="" width={48} height={48} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", objectPosition: "center top", border: "1px solid rgba(212,165,116,0.35)" }} />
              <div>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Shu-meez</p>
                <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.faint, margin: 0 }}>Owner, PhenomeBeauty · Cape Town</p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: C.s1, borderTop: "1px solid " + C.border, padding: isMobile ? "64px 24px 80px" : "88px 40px 100px", textAlign: "center" }}>
          <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, margin: "0 0 14px" }}>The point</p>
          <h2 style={{ fontFamily: FONT_BODY, fontSize: isMobile ? 28 : 42, lineHeight: 1.08, color: C.text, margin: "0 auto 16px", maxWidth: 700 }}>
            NextSlot did not just make booking easier.
          </h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.75, color: C.muted, maxWidth: 620, margin: "0 auto 28px" }}>
            It connected the booking to the payment, the client, the operation and the numbers around the business. That is the product.
          </p>
          <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
        </section>
      </main>
      <SiteFooter />
    </MarketingLayout>
  );
};

export default CaseStudy;