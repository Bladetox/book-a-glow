/**
 * Sample data for the marketing demo's admin dashboard.
 * Shape matches useDashboardData() so the real AdminDashboardView renders it unchanged.
 * Fictional business: "Studio M" (beauty). No network, no tenant, no storage.
 */
import { addDays, format, subDays } from "date-fns";
import type { useDashboardData } from "@/hooks/useSupabaseDashboard";
import type { OverdueLoyaltyClient, InactiveClient } from "@/hooks/useClientAlerts";

type DashboardData = ReturnType<typeof useDashboardData>;

// Deterministic pseudo-random so the chart is stable between renders.
const seeded = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const buildTrend = () => {
  const today = new Date();
  return Array.from({ length: 90 }, (_, i) => {
    const date = subDays(today, 89 - i);
    const dow = date.getDay();
    const weekendBoost = dow === 6 ? 1.5 : dow === 5 ? 1.2 : dow === 0 ? 0 : 1;
    const base = 420 + seeded(i) * 520;
    const value = weekendBoost === 0 ? 0 : Math.round((base * weekendBoost) / 10) * 10;
    return { day: date.getDate(), value, date: format(date, "yyyy-MM-dd") };
  });
};

const SLOTS = ["08-10", "10-12", "12-14", "14-16", "16-18"];
const HEAT: Record<string, number[]> = {
  Mon: [1, 3, 2, 4, 2],
  Tue: [2, 4, 3, 5, 3],
  Wed: [1, 3, 4, 4, 2],
  Thu: [2, 5, 4, 6, 4],
  Fri: [3, 6, 5, 7, 5],
  Sat: [6, 8, 7, 6, 3],
  Sun: [0, 0, 0, 0, 0],
};

export const DEMO_DASHBOARD_DATA = {
  coreLoading: false,
  staffLoading: false,
  allTimeServicesLoading: false,
  revenue: { month: 18420, today: 2480, lastMonth: 16450 },
  today: { appointments: 6, remaining: 4, nextAppointment: "14:00 - Naledi M." },
  health: {
    fillRate: 0.68,
    staffLoading: false,
    avgBasket: 410,
    totalAppointments: 45,
    cancellationRate: 0,
    revenueLost: 0,
  },
  clients: { total: 42, newClients: 25, returning: 17, retentionRate: 40 },
  leadSourceBreakdown: [
    { channel: "TikTok", count: 18 },
    { channel: "Instagram", count: 12 },
    { channel: "Referral", count: 7 },
    { channel: "Google", count: 5 },
  ],
  topServices: [
    { name: "Signature Facial", count: 12, revenue: 4800 },
    { name: "Brow Shape & Tint", count: 9, revenue: 2700 },
    { name: "Gel Manicure", count: 8, revenue: 2400 },
    { name: "Lash Lift", count: 6, revenue: 2700 },
    { name: "Back & Shoulder Massage", count: 5, revenue: 1750 },
  ],
  allTimeTopServices: [
    { name: "Signature Facial", count: 64, revenue: 25600 },
    { name: "Brow Shape & Tint", count: 51, revenue: 15300 },
    { name: "Gel Manicure", count: 47, revenue: 14100 },
    { name: "Lash Lift", count: 33, revenue: 14850 },
    { name: "Back & Shoulder Massage", count: 29, revenue: 10150 },
  ],
  alerts: [],
  todayAppointments: [
    { id: "a1", time: "09:00", client: "Thandi K.", service: "Signature Facial", status: "completed", balance: 0 },
    { id: "a2", time: "10:30", client: "Aisha P.", service: "Gel Manicure", status: "completed", balance: 0 },
    { id: "a3", time: "12:00", client: "Lerato D.", service: "Brow Shape & Tint", status: "completed", balance: 0 },
    { id: "a4", time: "14:00", client: "Naledi M.", service: "Lash Lift", status: "confirmed", balance: 270 },
    { id: "a5", time: "15:30", client: "Zanele B.", service: "Signature Facial", status: "confirmed", balance: 280 },
    { id: "a6", time: "17:00", client: "Megan S.", service: "Back & Shoulder Massage", status: "pending", balance: 350 },
  ],
  stockAlerts: [{ item: "Cuticle oil", level: "low" }],
  revenueTrend: buildTrend(),
  heatmap: Object.entries(HEAT).map(([day, vals]) => ({
    day,
    slots: SLOTS.map((slot, i) => ({ slot, intensity: vals[i] })),
  })),
} as unknown as DashboardData;

export const DEMO_OVERDUE_CLIENTS: OverdueLoyaltyClient[] = [
  { id: "o1", client_name: "Naledi M.", phone: null, next_due_date: format(subDays(new Date(), 9), "yyyy-MM-dd"), days_overdue: 9 },
  { id: "o2", client_name: "Refilwe T.", phone: null, next_due_date: format(subDays(new Date(), 4), "yyyy-MM-dd"), days_overdue: 4 },
];

export const DEMO_INACTIVE_CLIENTS: InactiveClient[] = Array.from({ length: 5 }, (_, i) => ({
  client_id: `i${i}`,
  client_name: ["Palesa N.", "Kayla J.", "Ayanda S.", "Chloe V.", "Boitumelo R."][i],
  client_phone: null,
  client_email: null,
  last_booking_date: format(addDays(subDays(new Date(), 110), i * 3), "yyyy-MM-dd"),
  days_since_booking: 110 - i * 3,
}));
