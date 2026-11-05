export interface AdminMetricDefinition {
  title: string;
  explain: string;
  benchmark?: string;
}

export interface AdminMetricInfoLine {
  term: string;
  def: string;
}

/** Central source for metric terminology and explanations. */
export const ADMIN_METRIC_DEFINITIONS = {
  monthlyCapacityUtilisation: {
    title: "Monthly Capacity Utilisation",
    explain: "Booked appointment minutes divided by available staff minutes across the full calendar month. Future confirmed bookings and no-shows count because they reserve capacity.",
    benchmark: "Use this to understand how much of your available appointment time has been committed.",
  },
  averageBookingValue: {
    title: "Average Booking Value",
    explain: "Average listed value of this month's appointments that are not cancelled or marked no-show. This is booked value, not money collected.",
    benchmark: "Increase booking value through appropriate service combinations and add-ons.",
  },
  monthlyAppointmentVolume: {
    title: "Monthly Appointment Volume",
    explain: "Appointments this month that are not cancelled or marked no-show. This includes appointments awaiting payment confirmation.",
  },
  cancellationRate: {
    title: "Cancellation Rate",
    explain: "Cancelled bookings divided by all booking outcomes. No-shows are tracked separately and are not counted as cancellations.",
    benchmark: "Target: below 10%. Above 20% warrants attention.",
  },
  clientsBookedThisMonth: {
    title: "Clients Booked This Month",
    explain: "Unique client identities with at least one appointment this month that is not cancelled or marked no-show. Includes future bookings.",
  },
  returningClients: {
    title: "Returning Clients",
    explain: "Clients who booked this month and had a completed appointment before their latest appointment this month. A client becomes returning after their first completed visit.",
    benchmark: "Track the share of this month's clients who have completed a previous appointment.",
  },
  returningClientShare: {
    title: "Returning Client Share",
    explain: "The percentage of this month's identifiable clients who had completed an appointment before their latest appointment this month. This is a repeat-client share, not a month-over-month cohort retention calculation.",
  },
  dailyRevenue: {
    title: "Daily Revenue",
    explain: "Total money received today.",
    benchmark: "Aim: consistent with your weekday average.",
  },
  todaysBookings: {
    title: "Today's Bookings",
    explain: "How many clients are booked in today.",
  },
  remainingAppointments: {
    title: "Remaining Appointments",
    explain: "Appointments still ahead today. If this drops suddenly a no-show may have occurred.",
  },
  nextAppointment: {
    title: "Next Appointment",
    explain: "Your next client. Knowing their service lets you prep and deliver a great experience.",
  },
  originalClientAcquisition: {
    title: "Original Client Acquisition",
    explain: "The guest-reported acquisition source on each client's earliest booking. Each client is counted once. Repeat bookings do not increase the count. Channel percentages use clients with a valid recorded source; Not recorded is shown separately as a share of all clients.",
    benchmark: "Use this breakdown to understand which channels are bringing new clients into your business.",
  },
} satisfies Record<string, AdminMetricDefinition>;

export const ADMIN_METRIC_INFO = {
  collectionsTrend: [
    { term: "Collections Trend", def: "Daily completed payment receipts recorded across the month." },
    { term: "Peak Days", def: "The tallest bars are the days with the highest payment collections." },
    { term: "Flat / Zero Bars", def: "No payment receipt was recorded that day. Bookings may still have occurred." },
    { term: "Period comparison", def: "The selected number of days is compared with the immediately preceding equal-length period." },
  ],
  bookingHeatmap: [
    { term: "Booking Heatmap", def: "Shows booking volume by weekday and time window for the selected month." },
    { term: "Bright Green", def: "Highest booking volume in the displayed period. This is not a capacity-utilisation percentage." },
    { term: "Faint / Empty", def: "Lower booking volume. Check available hours and staffing before choosing promotions." },
    { term: "Day Patterns", def: "Shows when bookings are concentrated, not attendance or conversion rates." },
  ],
} satisfies Record<string, AdminMetricInfoLine[]>;
