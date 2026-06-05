import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { ArrowRight } from "lucide-react";

const CTA_BG     = "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW = "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="nextslot-theme dark-brand"
      style={{ background: C.bg, color: C.text, fontFamily: FONT_BODY, minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <style>{HOME_STYLES}</style>
      <SiteHeader />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient orb */}
        <div style={{
          position: "absolute",
          width: 560, height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,165,116,0.06) 0%, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 480 }}>
          <p style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(72px, 14vw, 120px)",
            fontWeight: 700,
            color: C.gold,
            lineHeight: 1,
            marginBottom: 8,
            opacity: 0.18,
            userSelect: "none",
          }}>
            404
          </p>

          <div style={{ marginTop: -24, marginBottom: 20 }}>
            <img
              src="/web-app-manifest-192x192.png"
              alt="NextSlot"
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              style={{
                borderRadius: 12,
                objectFit: "contain",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                display: "inline-block",
              }}
            />
          </div>

          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(22px, 3vw, 32px)",
            fontWeight: 700,
            color: C.text,
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            This page does not exist.
          </h1>

          <p style={{
            fontSize: 15,
            color: C.muted,
            lineHeight: 1.7,
            marginBottom: 36,
            fontFamily: FONT_BODY,
          }}>
            The link may have changed or the page may have been removed.
            Let us take you somewhere useful.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link
              to="/"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: CTA_BG, boxShadow: CTA_SHADOW,
                color: "#080808", fontFamily: FONT_BODY,
                fontSize: 14, fontWeight: 700,
                padding: "13px 28px", borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Go to homepage
              <ArrowRight style={{ height: 15, width: 15 }} />
            </Link>
            <Link
              to="/onboarding"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 14, fontWeight: 500, color: C.muted,
                fontFamily: FONT_BODY, textDecoration: "none",
                padding: "13px 4px",
              }}
            >
              Start for free
            </Link>
          </div>

          <p style={{ marginTop: 32, fontSize: 11, color: C.faint, letterSpacing: "0.04em", fontFamily: FONT_BODY }}>
            {location.pathname}
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default NotFound;
