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
