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
    title: "Keep the activity around your business connected.",
    description:
      "Bookings, payments, clients and day-to-day business information stay in one system.",
    features: [
      {
        name: "Bookings & Calendar",
        description:
          "Let clients book online from the services and availability you set. Manage appointments, reschedule bookings and view payment status, with Google Calendar sync available.",
      },
      {
        name: "Payments & Deposits",
        description:
          "Accept payments through supported South African gateways including PayShap, Yoco, iKhokha and PayFast. Collect deposits, track outstanding balances and keep payment status connected to each booking.",
      },
      {
        name: "Clients & Consultations",
        description:
          "Keep client details, booking history, notes, consultation information and relevant records together. Consultation forms can collect intake, health and consent information.",
      },
      {
        name: "Availability",
        description:
          "Set recurring working hours, make date-specific changes and block dates when you are unavailable. Clients only see times that fall within the availability you set.",
      },
      {
        name: "Stock & Inventory",
        description:
          "Track products, quantities and reorder levels. Import stock by CSV, update quantities and receive low-stock alerts in the dashboard.",
      },
    ],
  },
  {
    number: "02",
    stage: "Understand",
    title: "See what is actually happening in your business.",
    description:
      "The activity you record becomes a clearer picture of revenue, demand, clients, services and business health.",
    features: [
      {
        name: "Business Dashboard",
        description:
          "See revenue, bookings, business health, demand patterns, top services, client activity, acquisition channels and operational information in one place.",
      },
      {
        name: "Business Analytics",
        description:
          "Understand service performance, booking activity, acquisition channels, client behaviour and how your time and capacity are being used.",
      },
      {
        name: "Client & Loyalty Activity",
        description:
          "See returning clients, booking patterns and loyalty activity so you can understand who is coming back and where retention opportunities may exist.",
      },
    ],
  },
  {
    number: "03",
    stage: "Decide",
    title: "Turn what you see into your next move.",
    description:
      "NextSlot surfaces information and patterns from your business so you can decide where to focus.",
    features: [
      {
        name: "Nexty Insights",
        description:
          "Nexty analyses your booking and business activity to surface patterns, risks and opportunities across Growth, Retention and Operations.",
      },
      {
        name: "Retention Opportunities",
        description:
          "Identify clients who may be due to return, overdue or not yet being tracked in your loyalty programme, then decide who you want to follow up with.",
      },
      {
        name: "Business Opportunities",
        description:
          "See gaps in demand, service performance, revenue efficiency and client behaviour so you can decide where your attention is most useful.",
      },
      {
        name: "You stay in control",
        description:
          "NextSlot surfaces the information. You decide what matters and what to do next.",
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
            NextSlot keeps the activity around your business connected, turns it
            into information you can understand, and helps you decide where to
            focus next.
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
