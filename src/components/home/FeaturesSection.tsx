import React, { useState, useEffect, useRef } from "react";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { Eyebrow } from "./Eyebrow";

const FEATURES = [
  { name: "Smart Calendar" },
  { name: "Payments" },
  { name: "Client Management" },
  { name: "Dashboard" },
  { name: "Nexty" },
  { name: "Availability" },
  { name: "Loyalty Program" },
  { name: "Stock & Inventory" },
  { name: "Consultations" },
];

const PANELS: React.ReactNode[] = [
  /* 0 – Smart Calendar */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
      <span style={{ fontSize: 11, color: C.faint }}>Live booking</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Smart Calendar</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Day, week, and month views. Payment status visible at a glance. Reschedule in two taps. Your whole day, on one screen, no inbox required.</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { time: "09:00", name: "Amara Dube",    service: "Brazilian Blowout · 2h", status: "Paid",    sc: C.em },
        { time: "11:30", name: "Keitumetse M.", service: "Cut & Colour · 1.5h",    status: "Deposit", sc: C.gold },
        { time: "14:00", name: "Nandi Khumalo", service: "Knotless Braids · 3h",   status: "Pending", sc: C.amber },
      ].map((b, i) => (
        <div key={i} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.faint, marginBottom: 3 }}>{b.time}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{b.name}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
            <span style={{ fontSize: 12, color: C.muted }}>{b.service}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: b.sc }}>{b.status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>,

  /* 1 – Payments */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>SA PAYMENTS</span>
      <span style={{ fontSize: 11, color: C.faint }}>Payment gateway</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Payments + Deposits</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Yoco payments, partial deposits, outstanding balances, all per booking, all live. No proof of payment. No banking details in the chat. No chasing.</p>
    <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.faint }}>Today's payments</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.gold }}>R 3 240</span>
      </div>
      {[
        { name: "Amara Dube",    amount: "R 850 paid",      color: C.em },
        { name: "Keitumetse M.", amount: "R 200 deposit",   color: C.gold },
        { name: "Nandi Khumalo", amount: "R 1 200 pending", color: C.amber },
      ].map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "5px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
          <span>{p.name}</span>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.amount}</span>
        </div>
      ))}
    </div>
  </div>,

  /* 2 – Client Management */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
      <span style={{ fontSize: 11, color: C.faint }}>Full history</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Client Management</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Full visit history, consultation forms, special occasions, blocked clients, birthday alerts. Every client detail in one place. No more digging through WhatsApp to remember what they had last time.</p>
    <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.goldDim, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#080808" }}>A</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Amara Dube</div>
          <div style={{ fontSize: 11, color: C.faint }}>Client since Jan 2024 · 24 visits</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: "rgba(212,165,116,0.12)", color: C.gold, padding: "3px 8px", borderRadius: 6 }}>VIP</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[{ label: "Visits", value: "24" }, { label: "Spent", value: "R 8 640" }, { label: "Rating", value: "4.9★" }].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.faint }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>,

  /* 3 – Dashboard */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
      <span style={{ fontSize: 11, color: C.faint }}>Your layout</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Customisable Dashboard</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Show or hide any section. Revenue graph, heatmap, stock alerts, client insights. One dashboard, built around how you actually run your day, saved per device.</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { label: "Revenue graph",  on: true },
        { label: "Heatmap",        on: true },
        { label: "Nexty insights", on: true },
        { label: "Stock alerts",   on: false },
      ].map((t, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, color: C.muted }}>{t.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.on ? C.em : C.faint }}>{t.on ? "On" : "Off"}</span>
        </div>
      ))}
    </div>
  </div>,

  /* 4 – Nexty */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>NEXTY</span>
      <span style={{ fontSize: 11, color: C.faint }}>Always watching</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Nexty Insights</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Critical, Growth, Retention, and Operations insights ranked by rand impact. Nexty watches your business while you work. She surfaces the problem before you feel it.</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { dot: C.red,  text: "Critical: 3 clients lapsed 14+ days. R1,200 at risk" },
        { dot: C.em,   text: "Growth: Tuesday 10–12pm converts 2.4× better. Add premium tier" },
        { dot: C.blue, text: "Retention: 48hr reminder clients return 3× more often" },
      ].map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.muted }}>{r.text}</span>
        </div>
      ))}
    </div>
  </div>,

  /* 5 – Availability */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
      <span style={{ fontSize: 11, color: C.faint }}>Online bookings</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Availability Control</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Weekly recurring schedule, daily overrides, block days for holidays or personal time. You decide when you work. Clients book inside those windows. Nothing outside them.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 10 }}>
      {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d, i) => (
        <div key={i} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: i === 6 ? "rgba(255,87,87,0.08)" : C.s2, border: `1px solid ${i === 6 ? "rgba(255,87,87,0.2)" : C.border}`, fontSize: 11, fontWeight: 600, color: i === 6 ? C.red : C.muted }}>{d}</div>
      ))}
    </div>
    <div style={{ fontSize: 11, color: C.faint }}>Sunday blocked · 34 open slots this week</div>
  </div>,

  /* 6 – Loyalty */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>NEXTY-POWERED</span>
      <span style={{ fontSize: 11, color: C.faint }}>Nexty-suggested</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Loyalty Program</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Nexty tells you who to enrol before you even ask. Configurable criteria, bulk actions, overdue alerts. Stop guessing who your best clients are. The data already knows.</p>
    <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>Nexty recommends enrolling</div>
    {[
      { initial: "K", name: "Keitumetse M.", sub: "8 visits · R 3 200 spent" },
      { initial: "N", name: "Nandi Khumalo",  sub: "6 visits · R 2 800 spent" },
    ].map((r, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.s3, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: C.muted }}>{r.initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
          <div style={{ fontSize: 11, color: C.faint }}>{r.sub}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.gold, cursor: "pointer" }}>Enrol &rarr;</span>
      </div>
    ))}
  </div>,

  /* 7 – Stock */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
      <span style={{ fontSize: 11, color: C.faint }}>Real-time alerts</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Stock &amp; Inventory</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Track products, reorder levels, and consumption per service. Alerts live on your dashboard. A stock-out cancelling a booking is the most avoidable way to lose money.</p>
    {[
      { name: "Keratin Treatment 500ml", stock: "2 units left · Reorder at 3", status: "Low stock", sc: C.red },
      { name: "Olaplex No. 3 100ml",     stock: "12 units · Reorder at 4",     status: "In stock",  sc: C.em },
      { name: "Braid Spray 250ml",        stock: "7 units · Reorder at 3",      status: "In stock",  sc: C.em },
    ].map((p, i) => (
      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
          <div style={{ fontSize: 11, color: C.faint }}>{p.stock}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: p.sc }}>{p.status}</span>
      </div>
    ))}
  </div>,

  /* 8 – Consultations */
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>FULL FEATURE</span>
      <span style={{ fontSize: 11, color: C.faint }}>POPIA compliant</span>
    </div>
    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Consultation Forms</h3>
    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>Custom intake forms per service, health screening, consent records, all attached to the client profile. If something goes wrong, the record is there. If nothing goes wrong, you look like a professional either way.</p>
    <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 10 }}>Chemical Relaxer · Health Screen</div>
      {[
        { q: "Scalp sensitivity?", a: "No" },
        { q: "Previous relaxer?",  a: "Yes, 8 weeks" },
        { q: "Consent signed?",    a: "✓ Signed" },
      ].map((row, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "5px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
          <span>{row.q}</span>
          <span style={{ color: C.text, fontWeight: 500 }}>{row.a}</span>
        </div>
      ))}
    </div>
  </div>,
];

export const FeaturesSection = () => {
  const width       = useWindowWidth();
  const isMobile    = width < BP;
  const [active, setActive] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    autoPlayRef.current = setInterval(() => setActive(p => (p + 1) % FEATURES.length), 5000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, []);

  const handleClick = (idx: number) => {
    setActive(idx);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => setActive(p => (p + 1) % FEATURES.length), 5000);
    if (isMobile && carouselRef.current) {
      const el = carouselRef.current.children[idx] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  useEffect(() => {
    if (!isMobile || !carouselRef.current) return;
    const el = carouselRef.current;
    const updateTilt = () => {
      const containerRect = el.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      Array.from(el.children).forEach((child, idx) => {
        const card = child as HTMLElement;
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const offset = cardCenterX - centerX;
        const maxOffset = containerRect.width * 0.4;
        const ratio = Math.max(-1, Math.min(1, offset / maxOffset));
        const tilt = ratio * 15;
        card.style.transform = `rotateY(${tilt}deg)`;
        card.classList.remove("edge-left", "edge-right", "active-card");
        if (Math.abs(offset) < rect.width * 0.3) {
          card.classList.add("active-card");
          card.style.transform = "rotateY(0deg)";
        } else if (offset < 0) {
          card.classList.add("edge-left");
        } else {
          card.classList.add("edge-right");
        }
      });
      const cardW = el.scrollWidth / FEATURES.length;
      const idx = Math.round(el.scrollLeft / cardW);
      setActive(Math.min(Math.max(idx, 0), FEATURES.length - 1));
    };
    el.addEventListener("scroll", updateTilt, { passive: true });
    updateTilt();
    return () => el.removeEventListener("scroll", updateTilt);
  }, [isMobile]);

  return (
    <section style={{
      position: "relative",
      background: C.s1,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      padding: isMobile ? "64px 0" : "100px 40px",
      overflow: "hidden",
    }}>
      {/* Background image */}
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
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 52, padding: isMobile ? "0 24px" : 0 }}>
          <Eyebrow text="Nine tools. One login." />
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: isMobile ? 30 : 44,
            fontWeight: 800, lineHeight: 1.1,
            color: C.text, marginBottom: 14,
          }}>
            One platform.<br />
            <span style={{ color: C.gold }}>Every tool your business needs.</span>
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            Bookings, intelligent insights, payments, inventory. Built for South African service businesses. No integrations, no patchwork, no spreadsheets running alongside it.
          </p>
        </div>

        {isMobile ? (
          <div
            ref={carouselRef}
            className="feat-carousel"
          >
            {PANELS.map((panel, i) => (
              <div
                key={i}
                onClick={() => handleClick(i)}
                style={{
                  width: Math.min(width - 72, 300),
                  background: C.s2,
                  borderRadius: 18,
                  padding: "22px 20px",
                  border: `1px solid ${active === i ? "rgba(212,165,116,0.35)" : C.border}`,
                  boxShadow: active === i ? "0 0 0 1px rgba(212,165,116,0.2), 0 16px 40px rgba(0,0,0,0.4)" : "none",
                  cursor: "pointer",
                  fontFamily: FONT_BODY,
                }}
              >
                {panel}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {FEATURES.map((f, i) => (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  style={{
                    background: active === i ? "rgba(212,165,116,0.10)" : "transparent",
                    border: `1px solid ${active === i ? "rgba(212,165,116,0.30)" : "transparent"}`,
                    borderRadius: 10,
                    padding: "11px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    fontWeight: active === i ? 700 : 400,
                    color: active === i ? C.gold : C.muted,
                    transition: "all 0.15s ease",
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <div style={{
              background: C.s2,
              borderRadius: 18,
              padding: "28px 26px",
              border: `1px solid ${C.border2}`,
              fontFamily: FONT_BODY,
              minHeight: 320,
            }}>
              {PANELS[active]}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
