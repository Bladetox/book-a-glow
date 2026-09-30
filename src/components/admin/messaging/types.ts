export type ClientRowForPromo = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastBooking: string | null;
  bookingCount: number;
  spend: number;
  bookings: any[];
};
