import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SlotHoldState {
  holdId: string | null;
  expiresAt: Date | null;
  secondsLeft: number;
  isHolding: boolean;
  error: string | null;
  durationMins: number | null;
}

export interface ResizeHoldResult {
  success: boolean;
  message: string;
  durationMins?: number;
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
    holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false, error: null, durationMins: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdIdRef = useRef<string | null>(null);
  const sessionToken = useRef(getSessionToken());
  const [isResizing, setIsResizing] = useState(false);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback((expiresAt: Date, holdId: string) => {
    clearCountdown();
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
      setState(prev => ({ ...prev, secondsLeft: left }));
      if (left === 0) {
        clearCountdown();
        if (holdIdRef.current === holdId) {
          holdIdRef.current = null;
          void supabase.rpc('release_slot_hold', {
            p_hold_id: holdId,
            p_session_token: sessionToken.current,
          });
          setState({
            holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false,
            error: 'Your 10-minute slot hold expired. Please choose the time again.',
            durationMins: null,
          });
        }
      }
    }, 1000);
  }, [clearCountdown]);

  const acquireHold = useCallback(async (params: {
    tenantId: string;
    staffId: string;
    bookingDate: string;
    startTime: string;
    durationMins: number;
  }) => {
    clearCountdown();
    holdIdRef.current = null;
    setState(prev => ({
      ...prev, holdId: null, expiresAt: null, secondsLeft: 0,
      isHolding: true, error: null, durationMins: null,
    }));

    const { data, error } = await supabase.rpc('acquire_slot_hold', {
      p_tenant_id: params.tenantId,
      p_staff_id: params.staffId,
      p_booking_date: params.bookingDate,
      p_start_time: params.startTime,
      p_duration_mins: params.durationMins,
      p_session_token: sessionToken.current,
    });

    if (error || !data?.[0]?.success) {
      const msg = data?.[0]?.message ?? error?.message ?? 'Could not hold slot';
      setState({
        holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false,
        error: msg, durationMins: null,
      });
      return { success: false as const, message: msg };
    }

    const row = data[0];
    const expiresAt = new Date(row.expires_at);
    holdIdRef.current = row.hold_id;
    setState({
      holdId: row.hold_id, expiresAt, secondsLeft: 600,
      isHolding: false, error: null, durationMins: params.durationMins,
    });
    startCountdown(expiresAt, row.hold_id);
    return { success: true as const, holdId: row.hold_id as string };
  }, [clearCountdown, startCountdown]);

  const resizeHold = useCallback(async (serviceIds: string[]): Promise<ResizeHoldResult> => {
    const activeHoldId = holdIdRef.current;
    if (!activeHoldId) {
      return { success: false, message: "Your appointment hold has expired. Please choose your time again." };
    }

    setIsResizing(true);
    try {
      const { data, error } = await supabase.rpc('resize_slot_hold', {
        p_hold_id: activeHoldId,
        p_session_token: sessionToken.current,
        p_service_ids: serviceIds,
      });

      const row = data?.[0];
      if (error || !row?.success) {
        const msg = row?.message ?? error?.message ?? 'Could not update the held appointment time.';
        return { success: false, message: msg };
      }

      setState(prev => ({ ...prev, durationMins: row.duration_mins }));
      return { success: true, message: row.message, durationMins: row.duration_mins };
    } finally {
      setIsResizing(false);
    }
  }, []);

  const releaseHold = useCallback(async () => {
    const activeHoldId = holdIdRef.current;
    if (!activeHoldId) return;
    clearCountdown();
    holdIdRef.current = null;
    const { error } = await supabase.rpc('release_slot_hold', {
      p_hold_id: activeHoldId,
      p_session_token: sessionToken.current,
    });
    setState({
      holdId: null, expiresAt: null, secondsLeft: 0, isHolding: false,
      error: error ? 'Could not release the temporary slot hold. It will expire automatically.' : null,
      durationMins: null,
    });
  }, [clearCountdown]);

  useEffect(() => () => {
    clearCountdown();
    const activeHoldId = holdIdRef.current;
    if (activeHoldId) {
      void supabase.rpc('release_slot_hold', {
        p_hold_id: activeHoldId,
        p_session_token: sessionToken.current,
      });
      holdIdRef.current = null;
    }
  }, [clearCountdown]);

  return { ...state, sessionToken: sessionToken.current, isResizing, acquireHold, resizeHold, releaseHold };
}
