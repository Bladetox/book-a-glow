import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/site/SiteHeader";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const PENDING_ONBOARDING_KEY = "nextslot_pending_onboarding";

type ViewMode = "login" | "forgot";

function buildAdminUrl(tenantId: string): string {
  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (isLocalhost) {
    return `${window.location.origin}/admin?tenant=${tenantId}`;
  }

  const parts = hostname.split(".");
  const rootDomain =
    parts.length >= 3 ? parts.slice(-3).join(".") : parts.slice(-2).join(".");
  return `${window.location.protocol}//${tenantId}.${rootDomain}/admin`;
}

async function completePendingOnboarding(accessToken: string): Promise<string | null> {
  try {
    const raw = localStorage.getItem(PENDING_ONBOARDING_KEY);
    if (!raw) return null;

    const pending = JSON.parse(raw);
    if (!pending?.business_name) return null;

    const res = await fetch(
      "https://kjibbbuceipnialfgflt.supabase.co/functions/v1/create-tenant",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(pending),
      }
    );

    const json = await res.json();

    if (res.ok && json.tenant_id) {
      localStorage.removeItem(PENDING_ONBOARDING_KEY);
      return json.tenant_id as string;
    }

    // Tenant already exists (409) — still remove pending and return the id
    if (res.status === 409 && json.tenant_id) {
      localStorage.removeItem(PENDING_ONBOARDING_KEY);
      return json.tenant_id as string;
    }

    return null;
  } catch {
    return null;
  }
}

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: `1px solid ${C.border2}`,
  background: C.s1,
  color: C.text,
  fontSize: 14,
  fontFamily: FONT_BODY,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: C.muted,
  marginBottom: 6,
  fontFamily: FONT_BODY,
};

const Login = () => {
  const [view, setView] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const user = signInData?.user;
      const accessToken = signInData?.session?.access_token;

      if (!user || !accessToken) {
        setError("Authentication failed. Please try again.");
        return;
      }

      // ── Step 1: Complete any pending onboarding ──────────────────────────
      const pendingTenantId = await completePendingOnboarding(accessToken);
      if (pendingTenantId) {
        window.location.href = buildAdminUrl(pendingTenantId);
        return;
      }

      // ── Step 2: Look up tenant via user_roles ────────────────────────────
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const adminRole =
        roles?.find((r) => r.role === "owner") ??
        roles?.find((r) => r.role === "admin");

      if (adminRole?.tenant_id) {
        window.location.href = buildAdminUrl(adminRole.tenant_id);
        return;
      }

      // ── Step 3: Fallback — look up tenant via profiles ───────────────────
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.tenant_id && (profile.role === "admin" || profile.role === "owner")) {
        window.location.href = buildAdminUrl(profile.tenant_id);
        return;
      }

      // ── Step 4: No tenant found ──────────────────────────────────────────
      await supabase.auth.signOut();
      setError("No business account found for this user.");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("Password reset link sent. Check your email.");
        setView("login");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="nextslot-theme dark-brand"
      style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: FONT_BODY }}
    >
      <style>{HOME_STYLES}</style>
      <SiteHeader />
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100dvh - 65px)",
          padding: "48px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Card */}
          <div
            style={{
              background: C.s1,
              border: `1px solid ${C.border2}`,
              borderRadius: 20,
              padding: "40px 36px",
              boxShadow: "0 8px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
              <img
                src="/web-app-manifest-192x192.png"
                alt="NextSlot"
                width={36}
                height={36}
                style={{ borderRadius: 8, objectFit: "contain" }}
              />
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.text }}>
                Next<span style={{ color: C.gold }}>Slot</span>
              </span>
            </div>

            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 700,
                color: C.text,
                marginBottom: 6,
              }}
            >
              {view === "login" ? "Welcome back" : "Reset your password"}
            </h1>
            <p style={{ fontSize: 14, color: C.muted, fontFamily: FONT_BODY, marginBottom: 28 }}>
              {view === "login"
                ? "Sign in to your NextSlot dashboard."
                : "Enter your email and we'll send you a reset link."}
            </p>

            <form
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              onSubmit={view === "login" ? handleLogin : handleForgotPassword}
            >
              <div>
                <label htmlFor="login-email" style={labelStyle}>Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
                  required
                />
              </div>

              {view === "login" && (
                <div>
                  <label htmlFor="login-password" style={labelStyle}>Password</label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Enter your password"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = C.border2)}
                    required
                  />
                </div>
              )}

              {error && (
                <p style={{ fontSize: 13, color: "#ff5757", textAlign: "center", fontFamily: FONT_BODY }}>
                  {error}
                </p>
              )}
              {success && (
                <p style={{ fontSize: 13, color: C.gold, textAlign: "center", fontFamily: FONT_BODY }}>
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "13px 20px",
                  borderRadius: 10,
                  background: C.text,
                  color: C.bg,
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  marginTop: 4,
                }}
              >
                {loading && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                {view === "login" ? "Sign In" : "Send Reset Link"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setView(view === "login" ? "forgot" : "login");
                setError("");
                setSuccess("");
              }}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: C.muted,
                fontFamily: FONT_BODY,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              {view === "login" ? "Forgot password?" : "Back to sign in"}
            </button>

            {view === "login" && (
              <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 16, fontFamily: FONT_BODY }}>
                Don't have an account?{" "}
                <Link
                  to="/onboarding"
                  style={{ color: C.text, fontWeight: 600, textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.text)}
                >
                  Get started free
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
