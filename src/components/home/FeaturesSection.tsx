import React from "react";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

type Feature = {
  name: string;
  description: string;
};

type FeatureGroup = {
  number: string;
  stage: string;
  title: string;
  description: string;
  features: Feature[];
};

const GROUPS: FeatureGroup[] = [
  {
    number: "01",
    stage: "Record",
    title: "Capture the work as it happens.",
    description:
      "Bookings, payments, clients and daily operations stay connected.",
    features: [
      {
        name: "Bookings & Calendar",
        description: "Online booking, availability and Google Calendar sync.",
      },
      {
        name: "Payments & Deposits",
        description: "Deposits, balances and supported payment gateways.",
      },
      {
        name: "Clients & Consultations",
        description: "Client history, notes, consultations and loyalty activity.",
      },
      {
        name: "Operations",
        description: "Working hours, blocked dates, products and stock levels.",
      },
    ],
  },
  {
    number: "02",
    stage: "Understand",
    title: "See the business behind the activity.",
    description:
      "Your activity becomes a clearer picture of revenue, demand and clients.",
    features: [
      {
        name: "Business Dashboard",
        description: "Revenue, bookings, business health and demand patterns.",
      },
      {
        name: "Business Analytics",
        description: "Service performance, acquisition and client behaviour.",
      },
      {
        name: "Client & Loyalty Activity",
        description: "Returning clients, booking patterns and retention signals.",
      },
    ],
  },
  {
    number: "03",
    stage: "Decide",
    title: "Know where to focus next.",
    description:
      "NextSlot surfaces the patterns. You decide what matters to your business.",
    features: [
      {
        name: "Nexty Insights",
        description: "Growth, Retention and Operations insights from your data.",
      },
      {
        name: "Retention Opportunities",
        description: "Clients who may be due, overdue or ready to re-engage.",
      },
      {
        name: "Business Opportunities",
        description: "Gaps in demand, service performance and revenue efficiency.",
      },
    ],
  },
];

export const FeaturesSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;

  return (
    <section
      style={{
        position: "relative",
        background: C.s1,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? "64px 16px" : "100px 40px",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('https://iili.io/CF6Dsa4.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.35,
          filter: "blur(0.5px) saturate(0.7)",
          transform: "scale(1.04)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? 40 : 56,
            padding: isMobile ? "0 8px" : 0,
          }}
        >
          <Eyebrow text="How NextSlot works" />
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: isMobile ? 30 : 44,
              fontWeight: 800,
              lineHeight: 1.1,
              color: C.text,
              margin: "0 0 14px",
              letterSpacing: "-0.02em",
            }}
          >
            From every booking to a clearer business.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: C.muted,
              lineHeight: 1.7,
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            Record what happens. Understand what it means. Decide where to focus next.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: isMobile ? 16 : 20,
            alignItems: "stretch",
          }}
        >
          {GROUPS.map((group) => (
            <article
              key={group.stage}
              style={{
                background: "rgba(12,12,12,0.84)",
                border: `1px solid ${C.border2}`,
                borderRadius: 18,
                padding: isMobile ? "24px 20px" : "28px 24px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.24)",
                fontFamily: FONT_BODY,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.gold,
                    letterSpacing: "0.12em",
                  }}
                >
                  {group.number}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.gold,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {group.stage}
                </span>
              </div>

              <h3
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: isMobile ? 23 : 25,
                  fontWeight: 700,
                  lineHeight: 1.16,
                  color: C.text,
                  margin: "0 0 12px",
                  letterSpacing: "-0.015em",
                }}
              >
                {group.title}
              </h3>

              <p
                style={{
                  fontSize: 13,
                  color: C.muted,
                  lineHeight: 1.7,
                  margin: "0 0 24px",
                }}
              >
                {group.description}
              </p>

              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  marginTop: "auto",
                }}
              >
                {group.features.map((feature, index) => (
                  <div
                    key={feature.name}
                    style={{
                      padding: "17px 0",
                      borderBottom:
                        index < group.features.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.text,
                        lineHeight: 1.4,
                        margin: "0 0 6px",
                      }}
                    >
                      {feature.name}
                    </h4>
                    <p
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
