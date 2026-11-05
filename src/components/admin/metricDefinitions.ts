export interface AdminMetricDefinition {
  title: string;
  explain: string;
  benchmark?: string;
  calculationNote?: string;
}

export interface AdminMetricInfoLine {
  term: string;
  def: string;
}

/** Central source for metric terminology and explanations. */
export const ADMIN_METRIC_DEFINITIONS = {
  monthlyCapacityUtilisation: {
    title: "Monthly Capacity Utilisation",
    explain: "How much of the appointment time you made available has actually been booked.",
    benchmark: "Use this to understand how much of your available appointment time has been committed.",
    calculationNote: "NextSlot compares booked appointment minutes with available staff minutes across the calendar month. Future confirmed bookings and no-shows count because they reserve capacity.",
  },
  averageBookingValue: {
    title: "Average Booking Value",
    explain: "On average, how much value clients book each time they make an appointment.",
    benchmark: "Increase booking value through appropriate service combinations and add-ons.",
    calculationNote: "Based on eligible appointment booking values for this month. Cancelled and no-show appointments are excluded. This is booked value, not payments received.",
  },
  monthlyAppointmentVolume: {
    title: "Monthly Appointment Volume",
    explain: "How many eligible appointments are on your calendar this month.",
    calculationNote: "Counts appointments this month that are not cancelled or marked no-show. Appointments awaiting payment confirmation are included.",
  },
  cancellationRate: {
    title: "Cancellation Rate",
    explain: "What share of booking outcomes ended in a cancellation.",
    benchmark: "Target: below 10%. Above 20% warrants attention.",
    calculationNote: "Cancelled bookings divided by all booking outcomes. No-shows are tracked separately and are not counted as cancellations.",
  },
  clientsBookedThisMonth: {
    title: "Clients Booked This Month",
    explain: "How many different clients have at least one eligible appointment this month.",
    calculationNote: "Counts unique client identities with at least one appointment this month that is not cancelled or marked no-show. Future bookings are included.",
  },
  returningClients: {
    title: "Returning Clients",
    explain: "How many clients booking this month have already completed a previous visit.",
    benchmark: "Track the share of this month's clients who have completed a previous appointment.",
    calculationNote: "A client counts as returning after a completed appointment before their latest appointment this month.",
  },
  returningClientShare: {
    title: "Returning Client Share",
    explain: "What percentage of this month's identifiable clients have completed a visit before. This is repeat-client share, not month-over-month cohort retention.",
    calculationNote: "Calculated from identifiable clients booked this month. It is not a month-over-month cohort retention calculation.",
  },
  dailyRevenue: {
    title: "Daily Revenue",
    explain: "How much money your business has received today.",
    benchmark: "Aim: consistent with your weekday average.",
    calculationNote: "Based on completed payment receipts recorded today.",
  },
  todaysBookings: {
    title: "Today's Bookings",
    explain: "How many appointments are scheduled for today.",
    calculationNote: "Counts appointments booked for today.",
  },
  remainingAppointments: {
    title: "Remaining Appointments",
    explain: "How many of today's appointments are still to come.",
    calculationNote: "Counts appointments still ahead today.",
  },
  nextAppointment: {
    title: "Next Appointment",
    explain: "Who is due to arrive next, so you can prepare for their appointment.",
    calculationNote: "Uses the next appointment in today's schedule.",
  },
  originalClientAcquisition: {
    title: "Original Client Acquisition",
    explain: "How each client first heard about your business, based on the source recorded on their earliest booking.",
    benchmark: "Use this breakdown to understand which channels are bringing new clients into your business.",
    calculationNote: "Each client is counted once using the guest-reported source on their earliest booking. Channel percentages use clients with a valid recorded source; “Not recorded” is shown separately as a share of all clients.",
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
