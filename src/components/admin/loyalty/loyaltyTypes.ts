// ─── Loyalty Types ───

export interface LoyaltyRow {
  id: string;
  tenant_id: string;
  client_name: string;
  phone: string | null;
  email?: string | null;
  birthday?: string | null;
  status: string | null;
  last_wax_date: string | number | null;
  next_due_date: string | number | null;
  notes: string | null;
  last_contacted_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  /** 'nexty' = enrolled from Nexty suggestion, 'manual' = added manually */
  source: 'nexty' | 'manual';
}

export interface EnrichmentMap {
  [key: string]: {
    liveLastDate: string | null;
    upcomingDate: string | null;
  };
}

export interface EnrollCandidate {
  client_name: string;
  phone: string;
  email?: string;
  bookingCount: number;
  totalSpend: number;
  lastBookingDate: string;
  nextDueDate?: string;
  daysSinceLastBooking: number;
}

export interface LoyaltySettings {
  reminder_weeks: number;
  service_label: string;
  wa_template_overdue: string;
  wa_template_time_to_book: string;
  wa_template_on_track: string;
  wa_template_birthday: string;
}
