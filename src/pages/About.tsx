import waIcon from "@/assets/whatsapp.png";
import { Orb } from "@/components/home/Orb";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { C, FONT_BODY, FONT_DISPLAY, BP, MK, SECTION } from "@/components/home/tokens";
import { useWindowWidth } from "@/components/home/useWindowWidth";
import serviceProvidersImage from "@/assets/service-providers.png";
import beauticianImage from "@/assets/beautician.jpg";

const LIGHT_BG = C.bg;

const About = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  const eyebrow = (text: string) => <p style={MK.eyebrow}>{text}</p>;
  const body = (text: string) => <p style={MK.body}>{text}</p>;
  const sectionPad = isMobile ? SECTION.mobile : SECTION.desktop;
  const surface = { ...MK.card, borderRadius: 12 } as const;

  return (
    <MarketingLayout>
      <SiteHeader />
      <main>

        {/* 01 · ORIGIN */}
        <section style={{
          position: "relative",
          overflow: "hidden",
          padding: isMobile ? SECTION.heroMobile : "120px 24px 68px",
          background: LIGHT_BG,
        }}>
          <div style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
            gap: isMobile ? 40 : 72,
            alignItems: "center",
          }}>
            <div>
              {eyebrow("About NextSlot")}
              <h1 style={{ ...MK.h1, maxWidth: 600 }}>
                Built from real challenges.
                <br />
                <span style={MK.accent}>Not a boardroom.</span>
              </h1>
              {body("You run your business on WhatsApp, memory, a diary, and an app that can't take payments. When nothing connects, you never quite see what's happening. NextSlot brings it together. You see the whole picture. You grow.")}
              <div style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: C.text,
                fontFamily: FONT_BODY,
              }}>
                <span style={{ width: 28, height: 1, background: C.gold, display: "inline-block" }} />
                Built in Cape Town, South Africa.
              </div>
            </div>
        
            <div style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 16 : 0,
            }}>
              {/* Image */}
              <div style={{
                position: "relative",
                minHeight: isMobile ? 280 : 420,
                borderRadius: 12,
                overflow: "hidden",
                background: C.s1,
                border: `1px solid ${C.border2}`,
                boxShadow: "0 8px 30px rgba(66,48,27,0.08)",
              }}>
                <img
                  src={serviceProvidersImage}
                  alt="Independent service businesses"
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: isMobile ? 280 : 420,
                    objectFit: "cover",
                    display: "block",
                    opacity: 0.86,
                  }}
                />
              </div>
        
              {/* Approach card — flows below the image on mobile, overlays on desktop */}
              <div style={isMobile ? {
                position: "relative",
                width: "100%",
                padding: "20px 22px",
                borderRadius: 12,
                background: "rgba(245,240,231,0.98)",
                border: `1px solid ${C.border2}`,
                boxShadow: "0 4px 20px rgba(66,48,27,0.06)",
              } : {
                position: "absolute",
                right: 20,
                bottom: 20,
                width: 190,
                padding: "18px 20px",
                borderRadius: 12,
                background: "rgba(245,240,231,0.96)",
                border: `1px solid ${C.border2}`,
                boxShadow: "0 4px 20px rgba(66,48,27,0.04)",
              }}>
                <p style={{
                  fontSize: 10,
                  color: C.gold,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: FONT_BODY,
                  marginBottom: 8,
                }}>
                  The NextSlot approach
                </p>
                <p style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: isMobile ? 22 : 20,
                  color: C.text,
                  lineHeight: 1.2,
                }}>
                  Record.<br />Understand.<br />Grow.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 02 · THE PROBLEM */}
        <section style={{
          padding: sectionPad,
          background: LIGHT_BG,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
            gap: isMobile ? 40 : 72,
            alignItems: "center",
          }}>
            <div>
              {eyebrow("The problem")}
              <h2 style={{ ...MK.h2, maxWidth: 600 }}>
                The problem wasn't <span style={MK.accent}>bookings</span>.
                <br />
                It was <span style={MK.accent}>everything around them</span>.
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 }}>
                {[
                  "A booking could arrive through WhatsApp.",
                  "A payment could happen through EFT.",
                  "A client could return three weeks later.",
                  "A cancellation could leave an empty slot.",
                ].map((line) => (
                  <p key={line} style={{ fontSize: 15, color: C.text, lineHeight: 1.55, fontFamily: FONT_BODY }}>
                    {line}
                  </p>
                ))}
              </div>
              {body("The information was there, but it lived in different places. NextSlot brings it all together, so you can spend less time piecing things together and more time doing what you do best.")}
            </div>

            <div style={{
              position: "relative",
              borderRadius: 12,
              padding: isMobile ? 20 : 28,
              background: C.s1,
              border: `1px solid ${C.border2}`,
              boxShadow: "0 4px 20px rgba(66,48,27,0.04)",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}>
                {[
                  { label: "New booking", icon: "＋" },
                  { label: "Payment received", icon: "✓" },
                  { label: "Client returned", icon: "↻" },
                  { label: "Cancellation", icon: "×" },
                ].map((item) => (
                  <div key={item.label} style={{
                    padding: "16px 14px",
                    borderRadius: 12,
                    background: C.s2,
                    border: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(184,139,82,0.12)",
                      color: C.gold,
                      fontSize: 15,
                      flexShrink: 0,
                    }}>{item.icon}</span>
                    <span style={{ fontSize: 12, color: C.text, fontFamily: FONT_BODY }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{
                padding: "18px",
                borderRadius: 12,
                background: C.s2,
                border: `1px solid ${C.border2}`,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: FONT_BODY, marginBottom: 7 }}>
                  Before
                </p>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text, lineHeight: 1.2 }}>
                  Information everywhere.
                </p>
                <p style={{ fontSize: 12, color: C.text, fontFamily: FONT_BODY, marginTop: 7 }}>
                  WhatsApp · EFT · spreadsheets · memory
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 03 · THE IDEA */}
        <section style={{
          padding: sectionPad,
          background: C.s1,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
            gap: isMobile ? 40 : 72,
            alignItems: "center",
          }}>
            <div style={{
              minHeight: isMobile ? 260 : 360,
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
              background: C.s2,
              border: `1px solid ${C.border2}`,
              boxShadow: "0 4px 20px rgba(66,48,27,0.04)",
            }}>
              <img
                src={beauticianImage}
                alt="Independent service professional"
                style={{ width: "100%", height: "100%", minHeight: isMobile ? 260 : 360, objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute",
                left: 20,
                bottom: 20,
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(245,240,231,0.97)",
                border: `1px solid ${C.border2}`,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT_BODY, marginBottom: 6 }}>
                  The idea
                </p>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text }}>
                  Simple. Useful. Practical.
                </p>
              </div>
            </div>

            <div>
              {eyebrow("The idea")}
              <h2 style={{ ...MK.h2, maxWidth: 600 }}>
                <span style={MK.accent}>Technology</span> that feels like <span style={MK.accent}>part of your business</span>.
              </h2>
              {body("NextSlot is designed to work quietly in the background, bringing bookings, payments, clients and activity into one place. Not overly complex. Not disconnected. Just useful, thoughtful technology that helps businesses move forward.")}
              <blockquote style={{
                marginTop: 24,
                borderLeft: `2px solid ${C.gold}`,
                paddingLeft: 18,
              }}>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, fontFamily: FONT_BODY, fontWeight: 600 }}>
                  Built for independent service businesses.
                </p>
              </blockquote>
              <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 18 }}>
                {["Barbers", "Beauty professionals", "Photographers", "Tattoo artists", "Mobile stylists", "Therapists"].map((item) => (
                  <span key={item} style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 04 · RECORD / UNDERSTAND / GROW */}
        <section style={{
          padding: sectionPad,
          background: LIGHT_BG,
          borderTop: `1px solid ${C.border}`,
          overflow: "hidden",
        }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            {eyebrow("The NextSlot approach")}
            <div className="about-approach">
              <div className="about-approach__copy">
                <h2 style={{ ...MK.h2, maxWidth: 600 }}>
                  Record. <span style={MK.accent}>Understand</span>. Grow.
                </h2>
                <div className="about-approach__steps">
                  {[
                    ["01","Record","Your bookings, payments, clients and daily activity become part of one system."],
                    ["02","Understand","That activity becomes useful information, helping you see patterns and opportunities."],
                    ["03","Grow","NextSlot surfaces opportunities in your business. You decide what to do with them."],
                  ].map(([number,title,copy]) => (
                    <div key={title} className="about-approach__step">
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(184,139,82,0.14)",
                        color: C.gold,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FONT_BODY,
                        marginBottom: 16,
                      }}>{number}</div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FONT_BODY, marginBottom: 9 }}>{title}</p>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.65, fontFamily: FONT_BODY }}>{copy}</p>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 22, fontSize: 13, color: C.text, fontFamily: FONT_BODY, lineHeight: 1.6 }}>
                  The goal isn't to give you more things to manage. It's to help you see your business more clearly.
                </p>
              </div>

              <div className="about-approach__card" style={{
                position: "relative",
                minHeight: 320,
                borderRadius: 12,
                background: C.s1,
                border: `1px solid ${C.border2}`,
                boxShadow: "0 4px 20px rgba(66,48,27,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                <Orb scale={0.9} />
                <div style={{
                  position: "absolute",
                  bottom: 18,
                  left: 18,
                  right: 18,
                  padding: "13px 15px",
                  borderRadius: 12,
                  background: "rgba(245,240,231,0.97)",
                  border: `1px solid ${C.border2}`,
                  zIndex: 20,
                }}>
                  <p style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT_BODY, marginBottom: 4 }}>
                    Nexty · Business Growth Advisor
                  </p>
                  <p style={{ fontSize: 12, color: C.text, fontFamily: FONT_BODY, lineHeight: 1.5 }}>
                    Practical advice. Not guesswork. Actual insights based on your business's day-to-day activity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 05 · PROOF + CTA */}
        <section style={{
          padding: sectionPad,
          background: C.s1,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
              gap: isMobile ? 40 : 72,
              alignItems: "center",
              marginBottom: 56,
            }}>
              <div>
                {eyebrow("The first business")}
                <h2 style={{ ...MK.h2, maxWidth: 600 }}>
                  It started with PhenomeBeauty.
                </h2>
                {body("NextSlot was designed and shaped around challenges of PhenomeBeauty, a mobile beauty business in Cape Town.")}
                <p style={{ marginTop: 16, fontSize: 15, color: C.muted, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                  What started as a need to manage bookings became a way to understand what was happening across the business and identify opportunities that were difficult to see before.
                </p>
                <blockquote style={{
                  marginTop: 24,
                  borderLeft: `2px solid ${C.gold}`,
                  paddingLeft: 18,
                }}>
                  <p style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text, lineHeight: 1.35 }}>
                    “For the first time, the business felt like it was running itself.”
                  </p>
                  <p style={{ marginTop: 8, fontSize: 12, color: C.muted, fontFamily: FONT_BODY }}>
                    Shu-meez · PhenomeBeauty
                  </p>
                </blockquote>
                <div style={{ marginTop: 24 }}>
                  <PrimaryCTA to="/case-study/phenomebeauty">
                    Read the case study
                  </PrimaryCTA>
                </div>
              </div>

              <div style={{
                borderRadius: 12,
                padding: isMobile ? 22 : 30,
                background: C.s2,
                border: `1px solid ${C.border2}`,
                boxShadow: "0 4px 20px rgba(66,48,27,0.04)",
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: 12,
                  marginBottom: 20,
                }}>
                  {[
                    ["90 days","R63,851"],
                    ["Growth","68%"],
                    ["Best day","R3,983"],
                    ["Top service","Hollywood"],
                  ].map(([label,value]) => (
                    <div key={label} style={{
                      padding: "18px 16px",
                      borderRadius: 12,
                      background: C.s1,
                      border: `1px solid ${C.border}`,
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: FONT_BODY, marginBottom: 6 }}>{label}</p>
                      <p style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text }}>{value}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, fontFamily: FONT_BODY }}>
                  NextSlot facilitated bookings and business growth resulting in R63,851 over 90 days.
                </p>
              </div>
            </div>

            <div style={{
              borderRadius: 12,
              padding: isMobile ? "36px 24px" : "48px 56px",
              background: C.bg,
              border: `1px solid ${C.border2}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 28,
              flexWrap: "wrap",
            }}>
              <div style={{ maxWidth: 650 }}>
                {eyebrow("Ready to grow?")}
                <h2 style={{ ...MK.h2, maxWidth: 600 }}>
                  Your business is already telling you something.
                </h2>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, fontFamily: FONT_BODY }}>
                  NextSlot helps you see it. Record your bookings. Understand your business. Find the opportunities that are already there.
                </p>
              </div>
              <div className="marketing-cta-row">
                <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
                <a
                  href="https://wa.me/27686806115"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with us on WhatsApp"
                  className="marketing-cta marketing-cta--secondary"
                >
                  <img src={waIcon} alt="" width={20} height={20} className="marketing-cta__icon" />
                  Talk to us
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </MarketingLayout>
  );
};

export default About;
