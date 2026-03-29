import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SlotHoldState {
  holdId: string | null;
  expiresAt: Date | null;
  secondsLeft: number;
  isHolding: boolean;
  error: string | null;
}

const SESSION_TOKEN_KEY = 'bag_session_token';

function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function useSlotHold() {
  const [state, setState] = useState<SlotHoldState>({
    holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false, error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionToken = useRef(getSessionToken());

  const clearCountdown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startCountdown = (expiresAt: Date) => {
    clearCountdown();
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setState(prev => ({ ...prev, secondsLeft: left }));
      if (left === 0) clearCountdown();
    }, 1000);
  };

  const acquireHold = useCallback(async (params: {
    tenantId: string;
    staffId: string;
    bookingDate: string;   // 'YYYY-MM-DD'
    startTime: string;     // 'HH:MM:SS'
    durationMins: number;
  }) => {
    setState(prev => ({ ...prev, isHolding: true, error: null }));
    const { data, error } = await supabase.rpc('acquire_slot_hold', {
      p_tenant_id:     params.tenantId,
      p_staff_id:      params.staffId,
      p_booking_date:  params.bookingDate,
      p_start_time:    params.startTime,
      p_duration_mins: params.durationMins,
      p_session_token: sessionToken.current,
    } as any);

    if (error || !(data as any)?.[0]?.success) {
      const msg = (data as any)?.[0]?.message ?? error?.message ?? 'Could not hold slot';
      setState({ holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false, error: msg });
      return { success: false as const, message: msg };
    }

    const row = (data as any)[0];
    const expiresAt = new Date(row.expires_at);
    setState({ holdId: row.hold_id, expiresAt, secondsLeft: 600, isHolding: false, error: null });
    startCountdown(expiresAt);
    return { success: true as const, holdId: row.hold_id as string };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releaseHold = useCallback(async () => {
    if (!state.holdId) return;
    clearCountdown();
    await supabase.rpc('release_slot_hold', {
      p_hold_id:       state.holdId,
      p_session_token: sessionToken.current,
    } as any);
    setState({ holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false, error: null });
  }, [state.holdId]);

  // Release hold on unmount
  useEffect(() => () => { releaseHold(); clearCountdown(); }, []);

  return { ...state, sessionToken: sessionToken.current, acquireHold, releaseHold };
}
