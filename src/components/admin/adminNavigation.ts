/**
 * Canonical admin navigation group membership.
 * Feature access remains controlled by Admin.tsx; this file only defines
 * where permitted destinations appear in the navigation experience.
 */
export const ADMIN_NAV_GROUPS = [
  {
    label: "Dashboard",
    iconKey: "dashboard",
    targetView: "Dashboard",
    views: ["Dashboard", "Recommendations"],
    sidebarChildren: [],
  },
  {
    label: "Schedule",
    iconKey: "schedule",
    targetView: "Bookings",
    views: ["Calendar", "Bookings", "Availability"],
    sidebarChildren: ["Bookings", "Availability"],
  },
  {
    label: "Catalogue",
    iconKey: "catalogue",
    targetView: "Services",
    views: ["Services", "Stock"],
    sidebarChildren: ["Services", "Stock"],
  },
  {
    label: "Clients",
    iconKey: "clients",
    targetView: "Client Management",
    views: ["Client Management", "Consultations", "Special Occasions", "Loyalty", "Consistency Pricing"],
    sidebarChildren: ["Client Management", "Consultations", "Special Occasions", "Loyalty", "Consistency Pricing"],
  },
  {
    label: "Business",
    iconKey: "business",
    targetView: "Settings",
    views: ["Integrations", "Communications", "Settings", "Terms & Conditions", "Help"],
    sidebarChildren: ["Integrations", "Communications", "Settings", "Terms & Conditions", "Help"],
  },
] as const;
