import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLogin from "@/components/superadmin/SuperAdminLogin";
import SuperAdminShell from "@/components/superadmin/SuperAdminShell";

const SuperAdmin = () => {
  const [authState, setAuthState] = useState<"loading" | "unauthenticated" | "authenticated">("loading");

  const checkSuperAdminSession = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) { setAuthState("unauthenticated"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (roles) {
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
        await supabase.auth.signOut();
      }
    } catch {
      setAuthState("unauthenticated");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setAuthState("unauthenticated");
      else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") checkSuperAdminSession();
    });
    checkSuperAdminSession();
    return () => subscription.unsubscribe();
  }, []);

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <SuperAdminLogin onLogin={checkSuperAdminSession} />;
  }

  return (
    <SuperAdminShell
      onSignOut={async () => {
        await supabase.auth.signOut();
        setAuthState("unauthenticated");
      }}
    />
  );
};

export default SuperAdmin;
