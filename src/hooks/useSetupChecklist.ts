/**
 * useSetupChecklist
 *
 * Drives the post-onboarding setup checklist rendered in AdminDashboard.
 *
 * Gates:
 *   1. hasServices          – services table has at least 1 row for this tenant
 *   2. hasAvailability      – staff_availability table has at least 1 row
 *   3. hasPricedService     – at least 1 service with price > 0
 *   4. hasSharedBookingLink – app_settings key 'booking_link_shared' === 'true'
 *   5. hasAcceptedTerms     – app_settings key 'terms_accepted' === 'true'
 *
 * Dismissal:
 *   Calling dismiss() upserts app_settings key 'setup_checklist_dismissed' = 'true'.
 *   The checklist hides permanently once dismissed.
 *
 * Usage in AdminDashboard.tsx:
 *   import { useSetupChecklist } from '@/hooks/useSetupChecklist';
 *   const checklist = useSetupChecklist();
 *   // render <SetupChecklist ... /> when !checklist.isDismissed
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface SetupChecklistState {
  isLoading: boolean;
  isDismissed: boolean;
  gates: {
    hasServices: boolean;
    hasAvailability: boolean;
    hasPricedService: boolean;
    hasSharedBookingLink: boolean;
    hasAcceptedTerms: boolean;
  };
  allComplete: boolean;
  dismiss: () => void;
  markBookingLinkShared: () => void;
}

export function useSetupChecklist(): SetupChecklistState {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const QUERY_KEY = ['setup-checklist', tenantId];

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async () => {
      const [servicesRes, availRes, pricedRes, settingsRes] = await Promise.all([
        // Gate 1: any services?
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),

        // Gate 2: any availability rows?
        supabase
          .from('staff_availability')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),

        // Gate 3: any priced service?
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gt('price', 0),

        // Gates 4 & 5: booking_link_shared, terms_accepted, setup_checklist_dismissed
        supabase
          .from('app_settings')
          .select('key, value')
          .eq('tenant_id', tenantId)
          .in('key', [
            'booking_link_shared',
            'terms_accepted',
            'setup_checklist_dismissed',
          ]),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsRes.data ?? []).forEach((row) => {
        if (row.value) settingsMap[row.key] = row.value;
      });

      return {
        hasServices: (servicesRes.count ?? 0) > 0,
        hasAvailability: (availRes.count ?? 0) > 0,
        hasPricedService: (pricedRes.count ?? 0) > 0,
        hasSharedBookingLink: settingsMap['booking_link_shared'] === 'true',
        hasAcceptedTerms: settingsMap['terms_accepted'] === 'true',
        isDismissed: settingsMap['setup_checklist_dismissed'] === 'true',
      };
    },
  });

  const upsertSetting = async (key: string, value: string) => {
    await supabase
      .from('app_settings')
      .upsert({ tenant_id: tenantId, key, value }, { onConflict: 'tenant_id,key' });
    qc.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const dismissMutation = useMutation({
    mutationFn: () => upsertSetting('setup_checklist_dismissed', 'true'),
  });

  const markSharedMutation = useMutation({
    mutationFn: () => upsertSetting('booking_link_shared', 'true'),
  });

  const gates = {
    hasServices: data?.hasServices ?? false,
    hasAvailability: data?.hasAvailability ?? false,
    hasPricedService: data?.hasPricedService ?? false,
    hasSharedBookingLink: data?.hasSharedBookingLink ?? false,
    hasAcceptedTerms: data?.hasAcceptedTerms ?? false,
  };

  const allComplete = Object.values(gates).every(Boolean);

  return {
    isLoading,
    isDismissed: data?.isDismissed ?? false,
    gates,
    allComplete,
    dismiss: () => dismissMutation.mutate(),
    markBookingLinkShared: () => markSharedMutation.mutate(),
  };
}
