import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  read: boolean;
  created_at: string;
}

// Plays a soft two-tone chime using Web Audio API — no file needed
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (frequency: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.25, 0.3);        // A5 — first note
    playTone(1108.73, now + 0.18, 0.35, 0.2); // C#6 — second note (higher, softer)

    // Clean up context after chime finishes
    setTimeout(() => ctx.close(), 800);
  } catch {
    // AudioContext not supported or blocked — fail silently
  }
}

export function useRealtimeNotifications() {
  const { tenantId } = useTenant();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) setNotifications(data as AppNotification[]);
    setLoading(false);
    isInitialLoad.current = false;
  }, [tenantId]);

  const markAllRead = useCallback(async () => {
    if (!tenantId) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("tenant_id", tenantId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [tenantId]);

  const markOneRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`notifications:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Only chime for live arrivals, not the initial page load fetch
          if (!isInitialLoad.current) {
            playNotificationChime();
          }
          setNotifications((prev) =>
            [payload.new as AppNotification, ...prev].slice(0, 30)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return { notifications, unreadCount, loading, markAllRead, markOneRead };
}
