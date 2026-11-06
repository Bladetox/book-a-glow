# Graph Report - book-a-glow  (2026-11-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2658 nodes · 6139 edges · 205 communities (121 shown, 84 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 127,253 input · 2,858 output

## Graph Freshness
- Built from commit: `86af255b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin Client Management Tabs
- UI Primitive Components
- Core Booking RPC Functions
- Slot Holds & Tenant Access
- Nexty Insight Analytics RPCs
- Sheet & Input Components
- Feature Flag Admin Panels
- Runtime UI Dependencies
- Admin Login & Client Blocking
- Admin Billing Plans
- Marketing Site Pages
- Build & Lint Tooling
- Pricing, Loyalty & Tenant Fixes
- App Routing
- Marketing Image Assets
- Billing Provider Configuration
- Marketing CTAs & Live Demo
- Consistency Pricing Admin
- Admin Shell & Subscription Gate
- Super Admin Navigation
- Admin Dashboard View
- PWA Updates & Toasts
- Demo Dashboard Views
- Marketing Section Components
- Booking Flow Steps & Splash
- Admin Bookings Management
- Admin Calendar
- Package Dependencies
- Dialogs & Command Palette
- Booking Review & Payment
- Nexty AI Recommendations
- Booking Edge Functions
- Admin Services Management
- Staff Availability Management
- Admin Loyalty Settings
- Admin Mobile Navigation
- Admin Booking Settings
- Booking Details & Consultation Form
- Alert Dialog & Buttons
- Platform Monthly Billing
- Admin Sidebar Navigation
- Super Admin Revenue
- Business Theme Provider
- App TypeScript Config
- CI Build Check
- Pain Point Carousel & UI
- Notifications & Client Alerts
- Admin Integrations
- Payment Setup Checklist
- Booking State & Confirmation
- Tenant Onboarding
- Edge Function Deployment
- Roles & Tenant Auth Schema
- Variant-Styled UI Components
- Admin Help Guides
- Booking Email Notifications
- shadcn Components Config
- Form Components
- Dashboard Preview & Device Frames
- Case Study & Resources
- Demo Admin Data
- Booking Schedule & Availability
- SEO Landing Pages
- Loyalty Client Card
- Node TypeScript Config
- Breadcrumb & Liquid Button
- Tenant Resolution & Bootstrap
- Carousel Component
- Payment Lifecycle & Indexes
- Vite Build Plugins
- SEO Page Generation
- Booking App Preview
- Public Services & Addons
- Loyalty Tenant Criteria
- Heatmap Dashboard Previews
- Login & Marketing Layout
- Super Admin Growth
- PayShap Payment Queue
- Consultation Form Builder
- Tenant Health Scoring
- Business Health Metrics
- Loyalty Data Helpers
- Dashboard Data Hook
- Tenant Activation Function
- Tenant Creation Function
- Subdomain Middleware
- Revenue Trend Card
- Cohort Retention Analytics
- Super Admin Tenants
- Chart Components
- Supabase Database Types
- Root TypeScript Config
- Consultations Admin View
- Integrations Guide Panel
- Plan Feature Flags
- Feature Adoption Analytics
- Super Admin Troubleshooting
- Super Admin Bookings
- Card & Signup
- Tenant Context Provider
- PayFast ITN Webhook
- Homepage Journey Navigation
- NPM Scripts
- iKhokha Payment Sheet
- Super Admin Settings
- Super Admin User Management
- Display Cards Component
- Drawer UI Component
- Navigation Menu Component
- Select UI Component
- Super Admin Audit Log
- Call-Out Fee Waivers
- Allowed Install Scripts
- Marketing Dashboard Snapshot
- Tenant Theme Reseeding
- Guest Consultations Schema
- Vercel Deployment Config
- Blocked Clients Table
- Consultation Questions Table
- Merged Client Consistency Normalization
- Tenant Not Found Page
- Admin Error Boundary
- Google Calendar Backfill
- Google Calendar OAuth Callback
- iKhokha Checkout Function
- PayFast Checkout Function
- Google Calendar Event Update
- Booking Phone Normalization
- Consistency Recalculation Triggers
- Aspect Ratio Component
- Collapsible Component
- Product Snapshot Frame
- Trust Badges
- Toast Notifications (Sonner)
- Broadcast Email Function
- iKhokha Webhook Handler
- PayFast Checkout Creation
- Booking Financial Field Protection
- Blocked Email Domains
- Call-Out Fee Waiver Hardening
- DnD Kit Utilities
- hCaptcha Integration
- OTP Input Library
- Theme Switching Library
- PDF.js Library
- Radix Alert Dialog
- Radix Checkbox
- Radix Context Menu
- Radix Progress
- Radix Separator
- Radix Toast
- Radix Toggle
- Radix Tooltip
- Resizable Panels Library
- Tailwind Merge Utility
- Tesseract OCR Library
- Stale Webhook Event Logging

## God Nodes (most connected - your core abstractions)
1. `cn()` - 234 edges
2. `react` - 172 edges
3. `lucide-react` - 135 edges
4. `useTenant()` - 100 edges
5. `supabase` - 92 edges
6. `framer-motion` - 52 edges
7. `@tanstack/react-query` - 36 edges
8. `MarketingRoutes()` - 31 edges
9. `AdminShell()` - 29 edges
10. `SiteHeader()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `AlertDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts
- `AlertTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts
- `AlertDialogDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (205 total, 84 thin omitted)

### Community 0 - "Admin Client Management Tabs"
Cohesion: 0.05
Nodes (77): vitest@^3.2.4, vitest, AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType (+69 more)

### Community 1 - "UI Primitive Components"
Cohesion: 0.06
Nodes (55): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, ContextMenuCheckboxItem, ContextMenuContent (+47 more)

### Community 2 - "Core Booking RPC Functions"
Cohesion: 0.06
Nodes (29): public.add_service_to_booking(), public.check_availability(), public.create_booking(), public.create_booking_with_consultation(), public.get_all_bookings(), public.get_app_setting(), public.get_available_slots(), public.get_client_history() (+21 more)

### Community 3 - "Slot Holds & Tenant Access"
Cohesion: 0.08
Nodes (27): public.tenants, idx_slot_holds_lookup, public.slot_holds, acquire_slot_hold(), public.sync_tenant_business_name(), trg_sync_business_name, public.get_available_slots(), public.replace_staff_availability() (+19 more)

### Community 4 - "Nexty Insight Analytics RPCs"
Cohesion: 0.06
Nodes (23): public.get_loyalty_gap_analysis(), public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_revenue_per_minute(), public.get_service_co_booking_patterns(), idx_booking_items_booking_id, loyalty_tracker_tenant_phone_unique, public.recalculate_consistency_status() (+15 more)

### Community 5 - "Sheet & Input Components"
Cohesion: 0.06
Nodes (38): Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+30 more)

### Community 6 - "Feature Flag Admin Panels"
Cohesion: 0.10
Nodes (37): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+29 more)

### Community 7 - "Runtime UI Dependencies"
Cohesion: 0.05
Nodes (41): dependencies, cmdk@^1.1.1, date-fns@^3.6.0, framer-motion@^12.35.1, lucide-react@^0.462.0, @radix-ui/react-avatar@^1.1.10, @radix-ui/react-dropdown-menu@^2.1.15, @radix-ui/react-popover@^1.1.14 (+33 more)

### Community 8 - "Admin Login & Client Blocking"
Cohesion: 0.10
Nodes (23): lucide-react, react, BlockedClientRow, AdminLoginProps, View, BlockClientModalProps, fireConfetti(), FirstBookingCelebration() (+15 more)

### Community 9 - "Admin Billing Plans"
Cohesion: 0.08
Nodes (34): sonner, AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER (+26 more)

### Community 10 - "Marketing Site Pages"
Cohesion: 0.11
Nodes (29): DemoDeviceIframe(), NATIVE_WIDTH, MarketingLayout(), SiteFooter(), SiteHeader(), About(), Article, articles (+21 more)

### Community 11 - "Build & Lint Tooling"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 12 - "Pricing, Loyalty & Tenant Fixes"
Cohesion: 0.08
Nodes (19): public.calculate_booking_price(), public.current_tenant_id(), public.is_admin(), public.update_loyalty_tracker(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation() (+11 more)

### Community 13 - "App Routing"
Cohesion: 0.11
Nodes (34): About, Admin, AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics, BusinessGrowth (+26 more)

### Community 14 - "Marketing Image Assets"
Cohesion: 0.11
Nodes (17): CarouselDots(), CaseStudySection(), CTASection(), FeaturesSection(), GROUPS, HeroSection(), HomePricingPreview(), PLANS (+9 more)

### Community 15 - "Billing Provider Configuration"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 16 - "Marketing CTAs & Live Demo"
Cohesion: 0.09
Nodes (25): react-router-dom, Orb(), PrimaryCTA(), LiveDemoSection(), THEME_SWATCHES, PageContent, PageData, Section (+17 more)

### Community 17 - "Consistency Pricing Admin"
Cohesion: 0.09
Nodes (28): AdminBlockedClients(), AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow (+20 more)

### Community 18 - "Admin Shell & Subscription Gate"
Cohesion: 0.11
Nodes (32): AdminDashboard(), AdminLogin(), getTenantSlugFromUrl(), ArrearsBanner(), TrialExpiredPaywall(), Tenant, TenantSubscription, useFeatureFlags() (+24 more)

### Community 19 - "Super Admin Navigation"
Cohesion: 0.09
Nodes (29): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SABroadcast, SAFeatureFlags (+21 more)

### Community 20 - "Admin Dashboard View"
Cohesion: 0.09
Nodes (30): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+22 more)

### Community 21 - "PWA Updates & Toasts"
Cohesion: 0.11
Nodes (26): PwaUpdater(), Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+18 more)

### Community 22 - "Demo Dashboard Views"
Cohesion: 0.12
Nodes (29): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+21 more)

### Community 23 - "Marketing Section Components"
Cohesion: 0.16
Nodes (18): ComparisonSection(), ROWS, Eyebrow(), FloatCardData, InsightCard(), NextyAISection(), ProactiveAlertsSection(), CustomTooltip() (+10 more)

### Community 24 - "Booking Flow Steps & Splash"
Cohesion: 0.16
Nodes (21): framer-motion, ServicesStep(), ServicesStepProps, SplashScreen(), SplashScreenProps, StepIndicator(), StepIndicatorProps, steps (+13 more)

### Community 25 - "Admin Bookings Management"
Cohesion: 0.12
Nodes (27): AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps (+19 more)

### Community 26 - "Admin Calendar"
Cohesion: 0.16
Nodes (28): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+20 more)

### Community 27 - "Package Dependencies"
Cohesion: 0.07
Nodes (28): clsx@^2.1.1, @dnd-kit/core@^6.3.1, @dnd-kit/sortable@^8.0.0, embla-carousel-react@^8.6.0, @hookform/resolvers@^3.10.0, @radix-ui/react-accordion@^1.2.11, @radix-ui/react-hover-card@^1.1.14, @radix-ui/react-menubar@^1.1.15 (+20 more)

### Community 28 - "Dialogs & Command Palette"
Cohesion: 0.11
Nodes (23): @radix-ui/react-dialog@^1.1.14, @radix-ui/react-dialog, AdminMetricExplanation(), AdminMetricExplanationLine, AdminMetricExplanationProps, AdminIconButton, Command, CommandDialog() (+15 more)

### Community 29 - "Booking Review & Payment"
Cohesion: 0.10
Nodes (18): @tanstack/react-query, friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), SubmitPhase, PublicTenantContext (+10 more)

### Community 30 - "Nexty AI Recommendations"
Cohesion: 0.12
Nodes (24): InsightIcon(), NextyLoyaltyPanel(), AdminNextyOrb(), AdminNextyOrbProps, AdminRecommendations(), getFilterKey(), InsightFilterKey, InsightIcon() (+16 more)

### Community 31 - "Booking Edge Functions"
Cohesion: 0.07
Nodes (12): corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders (+4 more)

### Community 32 - "Admin Services Management"
Cohesion: 0.17
Nodes (24): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+16 more)

### Community 33 - "Staff Availability Management"
Cohesion: 0.15
Nodes (23): AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AVAILABILITY_SELECT, AvailabilitySlot, DailyOverrides (+15 more)

### Community 34 - "Admin Loyalty Settings"
Cohesion: 0.14
Nodes (22): AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), LOYALTY_INSIGHT_IDS, PRIORITY_STYLES, SettingCard(), SettingCardProps (+14 more)

### Community 35 - "Admin Mobile Navigation"
Cohesion: 0.12
Nodes (18): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, MarketingMobileDashboardSnapshot(), Metric(), NavItem(), AvailabilityIcon() (+10 more)

### Community 36 - "Admin Booking Settings"
Cohesion: 0.13
Nodes (22): AdminSettings(), Collapsible(), DEPOSIT_PRESETS, isAcquisitionChannel(), LEAD_TIME_PRESETS, MAX_DAYS_PRESETS, MIN_NOTICE_PRESETS, OVERRUN_PRESETS (+14 more)

### Community 37 - "Booking Details & Consultation Form"
Cohesion: 0.14
Nodes (21): ConsultationQRenderer(), ConsultationQRendererProps, DetailsStep(), phoneCodes, PlaceSuggestion, validators, ConsultationQRenderer(), ConsultationQRendererProps (+13 more)

### Community 38 - "Alert Dialog & Buttons"
Cohesion: 0.12
Nodes (20): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+12 more)

### Community 39 - "Platform Monthly Billing"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 40 - "Admin Sidebar Navigation"
Cohesion: 0.14
Nodes (15): AdminSidebar(), AdminSidebarProps, AdminSidebarView(), AdminSidebarViewProps, groupIconMap, iconMap, NAV, NavItem (+7 more)

### Community 41 - "Super Admin Revenue"
Cohesion: 0.20
Nodes (20): CopyLinkButton(), CreateInvoiceModal(), CustomTooltip(), daysUntil(), fmtDate(), GlassCard(), MarkPaidModal(), MONTHS (+12 more)

### Community 42 - "Business Theme Provider"
Cohesion: 0.19
Nodes (18): ADMIN_PATH_PREFIXES, BusinessThemeContext, BusinessThemeContextValue, BusinessThemeProvider(), isAdminPath(), BusinessTheme, BusinessThemeColors, businessThemes (+10 more)

### Community 43 - "App TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 44 - "CI Build Check"
Cohesion: 0.10
Nodes (20): name, runs-on, steps, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, jobs, build, name (+12 more)

### Community 45 - "Pain Point Carousel & UI"
Cohesion: 0.10
Nodes (12): PainPointCarousel(), PROBLEMS, wrap(), Checkbox, HoverCardContent, Progress, ScrollArea, ScrollBar (+4 more)

### Community 46 - "Notifications & Client Alerts"
Cohesion: 0.16
Nodes (15): date-fns, AdminDashboardViewProps, ClientAlertsModalProps, FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, ClientAlerts (+7 more)

### Community 47 - "Admin Integrations"
Cohesion: 0.22
Nodes (19): AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps, isConfigured() (+11 more)

### Community 48 - "Payment Setup Checklist"
Cohesion: 0.17
Nodes (14): Props, SetupChecklistPaymentGate(), TenantPaymentFields, useTenantPaymentFields(), useUpsertAppSetting(), getPlanLabel(), getPlanPaymentFocus(), hasCompletedPaymentSetup() (+6 more)

### Community 49 - "Booking State & Confirmation"
Cohesion: 0.12
Nodes (15): DetailsStepProps, BookingConfirmation(), BookingConfirmationProps, DetailsStepProps, ReviewStepProps, BookingState, Category, ConsultationAnswerValue (+7 more)

### Community 50 - "Tenant Onboarding"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 51 - "Edge Function Deployment"
Cohesion: 0.11
Nodes (17): runs-on, steps, SUPABASE_ACCESS_TOKEN, jobs, deploy, name, on, push (+9 more)

### Community 52 - "Roles & Tenant Auth Schema"
Cohesion: 0.13
Nodes (7): public.get_user_tenant_id(), public.has_role(), public.user_roles, public.is_tenant_admin(), public.calculate_booking_price(), public.is_admin(), public.sa_delete_tenant()

### Community 53 - "Variant-Styled UI Components"
Cohesion: 0.15
Nodes (14): class-variance-authority@^0.7.1, class-variance-authority, Alert, AlertDescription, AlertTitle, alertVariants, Badge(), BadgeProps (+6 more)

### Community 54 - "Admin Help Guides"
Cohesion: 0.25
Nodes (14): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+6 more)

### Community 55 - "Booking Email Notifications"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 56 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 57 - "Form Components"
Cohesion: 0.18
Nodes (14): @radix-ui/react-label@^2.1.7, @radix-ui/react-label, FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext (+6 more)

### Community 58 - "Dashboard Preview & Device Frames"
Cohesion: 0.16
Nodes (13): DashboardPreview(), DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices, DeviceFrameProps (+5 more)

### Community 59 - "Case Study & Resources"
Cohesion: 0.16
Nodes (14): MK, SECTION, timeline, Article, articles, categories, Category, CategoryChip() (+6 more)

### Community 60 - "Demo Admin Data"
Cohesion: 0.17
Nodes (14): AdminMobileNav(), buildTrend(), DashboardData, DEMO_DASHBOARD_DATA, DEMO_INACTIVE_CLIENTS, DEMO_OVERDUE_CLIENTS, HEAT, seeded() (+6 more)

### Community 61 - "Booking Schedule & Availability"
Cohesion: 0.25
Nodes (14): getStaffId(), ScheduleStep(), ScheduleStepProps, usePublicTenant(), getStaffId(), MonthDateAvailability, resolveStaffId(), todayLocalStr() (+6 more)

### Community 62 - "SEO Landing Pages"
Cohesion: 0.18
Nodes (9): SeoLandingPage(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth(), BusinessManagementSoftware(), ClientManagement(), MobileServiceBusinesses(), OnlineBookingSoftware() (+1 more)

### Community 63 - "Loyalty Client Card"
Cohesion: 0.19
Nodes (14): AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials(), InlineBirthdayEditor(), InlineClientEditor(), InlineNotesEditor(), InlineStatusEditor() (+6 more)

### Community 64 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 65 - "Breadcrumb & Liquid Button"
Cohesion: 0.14
Nodes (13): @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator() (+5 more)

### Community 66 - "Tenant Resolution & Bootstrap"
Cohesion: 0.17
Nodes (12): App(), ScrollToTop(), applyTenantBranding(), PublicTenantProvider(), getTenantSlug(), isCustomDomainHost(), LOVABLE_DOMAINS, MAIN_DOMAINS (+4 more)

### Community 67 - "Carousel Component"
Cohesion: 0.19
Nodes (14): Button, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+6 more)

### Community 68 - "Payment Lifecycle & Indexes"
Cohesion: 0.14
Nodes (9): idx_bookings_tenant_date_time, idx_bookings_tenant_status, idx_payments_booking_id, idx_payments_tenant_id, public.reject_payshap_booking(), public.release_failed_gateway_booking(), public.cancel_expired_pending_bookings(), payments_ikhokha_transaction_id_uidx (+1 more)

### Community 69 - "Vite Build Plugins"
Cohesion: 0.15
Nodes (10): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, lovable-tagger, vite, vite-plugin-pwa (+2 more)

### Community 70 - "SEO Page Generation"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 71 - "Booking App Preview"
Cohesion: 0.16
Nodes (12): BookingAppPreview(), Category, isDemoAvailable(), S, Screen, Service, STEP_LABELS, STEP_SCREENS (+4 more)

### Community 72 - "Public Services & Addons"
Cohesion: 0.23
Nodes (9): AddonPopupProps, StickyBottomBar(), StickyBottomBarProps, categoryLabel(), PublicService, ServiceCategory, usePublicCategories(), isIOS() (+1 more)

### Community 73 - "Loyalty Tenant Criteria"
Cohesion: 0.22
Nodes (10): resolveKey(), fmtCategory(), LoyaltyTenantCriteria(), Props, EffectiveStatus, EnrichmentEntry, EnrichmentMap, EnrollCandidate (+2 more)

### Community 74 - "Heatmap Dashboard Previews"
Cohesion: 0.26
Nodes (11): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+3 more)

### Community 75 - "Login & Marketing Layout"
Cohesion: 0.22
Nodes (10): HOME_STYLES, MarketingLayoutProps, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), completePendingOnboarding(), inputStyle, labelStyle (+2 more)

### Community 76 - "Super Admin Growth"
Cohesion: 0.21
Nodes (13): SAGrowth, BookingRaw, BookingStat, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard(), median() (+5 more)

### Community 77 - "PayShap Payment Queue"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 78 - "Consultation Form Builder"
Cohesion: 0.23
Nodes (12): SavedBadge(), blankDraft(), BUSINESS_TYPE_LABELS, BUSINESS_TYPES, ConsultationFormBuilder(), ConsultationQuestionRow, DraftQuestion, isQuestionType() (+4 more)

### Community 79 - "Tenant Health Scoring"
Cohesion: 0.22
Nodes (12): SATenantHealth, BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel (+4 more)

### Community 80 - "Business Health Metrics"
Cohesion: 0.21
Nodes (11): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+3 more)

### Community 81 - "Loyalty Data Helpers"
Cohesion: 0.29
Nodes (10): BulkBarProps, effectiveStatus(), excelToDate(), excelToISO(), exportCSV(), isBirthdaySoon(), isoToDisplay(), normaliseStatus() (+2 more)

### Community 82 - "Dashboard Data Hook"
Cohesion: 0.26
Nodes (11): buildHeatSlots(), buildTopServices(), CLIENT_TYPE_LABELS, DOW_TO_IDX, fetchAllPages(), HEAT_DAYS, isClientTypeLabel(), resolveAvailabilityForRange() (+3 more)

### Community 83 - "Tenant Activation Function"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 84 - "Tenant Creation Function"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 85 - "Subdomain Middleware"
Cohesion: 0.33
Nodes (9): config, esc(), fetchTenant(), MAIN_DOMAINS, middleware(), nextResponse(), patchMetaName(), patchMetaProp() (+1 more)

### Community 86 - "Revenue Trend Card"
Cohesion: 0.25
Nodes (10): EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS, Props, RevenueTrendCard(), RevenueTrendEntry, Skeleton() (+2 more)

### Community 87 - "Cohort Retention Analytics"
Cohesion: 0.25
Nodes (9): SACohortRetention, addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow (+1 more)

### Community 88 - "Super Admin Tenants"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 89 - "Chart Components"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 90 - "Supabase Database Types"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 91 - "Root TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 92 - "Consultations Admin View"
Cohesion: 0.44
Nodes (9): AdminConsultations(), answeredItems(), changeEntries(), exportCSV(), filters, fmtTime(), formatAnswer(), getLeadSourceConfig() (+1 more)

### Community 93 - "Integrations Guide Panel"
Cohesion: 0.47
Nodes (9): Callout(), FieldRef(), GoogleCalGuide(), GuidePanelProps, IntegrationsGuidePanel(), SectionHeader(), SmtpGuide(), Step() (+1 more)

### Community 94 - "Plan Feature Flags"
Cohesion: 0.20
Nodes (7): ALL_FLAGS, FeatureStatus, flagKeys, PLAN_GROUPS, PlanFeature, PlanGroup, PLATFORM_TENANT_ID

### Community 95 - "Feature Adoption Analytics"
Cohesion: 0.24
Nodes (9): SAFeatureAdoption, adoptionColor(), avg(), BookingStat, FEATURE_LABELS, FeatureSummary, FeatureUsageRow, SAFeatureAdoption() (+1 more)

### Community 96 - "Super Admin Troubleshooting"
Cohesion: 0.22
Nodes (9): SATroubleshoot, Booking, DiagIssue, FixLog, GlassCard(), OwnerProfile, SATroubleshoot(), STATUS_COLORS (+1 more)

### Community 97 - "Super Admin Bookings"
Cohesion: 0.25
Nodes (7): SABookings, DATE_RANGES, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 98 - "Card & Signup"
Cohesion: 0.50
Nodes (7): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Signup()

### Community 99 - "Tenant Context Provider"
Cohesion: 0.25
Nodes (7): LOADING_CTX, resolveSubdomainTenantId(), TenantContext, TenantContextValue, TenantProvider(), TenantProviderProps, TenantRenderProps

### Community 100 - "PayFast ITN Webhook"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 101 - "Homepage Journey Navigation"
Cohesion: 0.29
Nodes (5): @testing-library/react@^16.0.0, @testing-library/react, HomeJourneyNav(), HomeJourneyNavProps, ITEMS

### Community 102 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 103 - "iKhokha Payment Sheet"
Cohesion: 0.29
Nodes (6): friendlyIkhokhaError(), IkhokhaCheckoutResponse, IkhokhaPaymentSheet(), IkhokhaPaymentSheetProps, IkhokhaPaymentType, SheetPhase

### Community 104 - "Super Admin Settings"
Cohesion: 0.32
Nodes (7): SASettings, ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader()

### Community 105 - "Super Admin User Management"
Cohesion: 0.32
Nodes (7): SAUsers, EditRoleModal(), GlassCard(), Profile, ROLES, SAUsers(), TenantMap

### Community 106 - "Display Cards Component"
Cohesion: 0.36
Nodes (6): defaultCards, DisplayCardsDemo(), DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 107 - "Drawer UI Component"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 108 - "Navigation Menu Component"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 109 - "Select UI Component"
Cohesion: 0.32
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 110 - "Super Admin Audit Log"
Cohesion: 0.33
Nodes (6): SAAuditLog, ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog()

### Community 111 - "Call-Out Fee Waivers"
Cohesion: 0.33
Nodes (4): public.booking_callout_fee_waivers, public.waive_call_out_fee(), nextslot_private.restore_call_out_fee_atomic(), public.booking_callout_fee_restorations

### Community 112 - "Allowed Install Scripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js@3.50.0, esbuild@0.21.5, esbuild@0.25.0, @swc/core@1.13.2, tesseract.js@5.1.1

### Community 113 - "Marketing Dashboard Snapshot"
Cohesion: 0.47
Nodes (5): MarketingDashboardSnapshot(), MiniMetric(), MockBusinessLogo(), mockServices, nav

### Community 114 - "Tenant Theme Reseeding"
Cohesion: 0.33
Nodes (5): corsHeaders, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 115 - "Guest Consultations Schema"
Cohesion: 0.47
Nodes (4): idx_guest_consultations_tenant, public.guest_consultations, public.guest_name_aliases, public.guest_person_key()

### Community 116 - "Vercel Deployment Config"
Cohesion: 0.33
Nodes (5): cleanUrls, headers, redirects, rewrites, $schema

### Community 118 - "Blocked Clients Table"
Cohesion: 0.70
Nodes (4): blocked_clients_email_idx, blocked_clients_phone_idx, blocked_clients_tenant_idx, public.blocked_clients

### Community 119 - "Consultation Questions Table"
Cohesion: 0.70
Nodes (4): idx_consultation_questions_tenant_id, public.consultation_questions, public.set_consultation_questions_updated_at(), trg_consultation_questions_updated_at

### Community 125 - "iKhokha Checkout Function"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 129 - "Consistency Recalculation Triggers"
Cohesion: 0.83
Nodes (3): public.trigger_recalculate_consistency(), trigger_consistency_status_after_insert, trigger_consistency_status_after_relevant_update

## Knowledge Gaps
- **84 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Admin Login & Client Blocking` to `Admin Client Management Tabs`, `UI Primitive Components`, `Sheet & Input Components`, `Feature Flag Admin Panels`, `Runtime UI Dependencies`, `Admin Billing Plans`, `Marketing Site Pages`, `App Routing`, `Marketing Image Assets`, `Billing Provider Configuration`, `Marketing CTAs & Live Demo`, `Consistency Pricing Admin`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `PWA Updates & Toasts`, `Demo Dashboard Views`, `Marketing Section Components`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Admin Calendar`, `Package Dependencies`, `Dialogs & Command Palette`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `Admin Loyalty Settings`, `Admin Mobile Navigation`, `Admin Booking Settings`, `Booking Details & Consultation Form`, `Alert Dialog & Buttons`, `Admin Sidebar Navigation`, `Super Admin Revenue`, `Business Theme Provider`, `Pain Point Carousel & UI`, `Notifications & Client Alerts`, `Admin Integrations`, `Payment Setup Checklist`, `Booking State & Confirmation`, `Tenant Onboarding`, `Variant-Styled UI Components`, `Admin Help Guides`, `Form Components`, `Dashboard Preview & Device Frames`, `Case Study & Resources`, `Demo Admin Data`, `Booking Schedule & Availability`, `Loyalty Client Card`, `Breadcrumb & Liquid Button`, `Carousel Component`, `Booking App Preview`, `Public Services & Addons`, `Loyalty Tenant Criteria`, `Login & Marketing Layout`, `Super Admin Growth`, `PayShap Payment Queue`, `Consultation Form Builder`, `Tenant Health Scoring`, `Dashboard Data Hook`, `Revenue Trend Card`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Chart Components`, `Consultations Admin View`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `Super Admin Troubleshooting`, `Super Admin Bookings`, `Card & Signup`, `Tenant Context Provider`, `Homepage Journey Navigation`, `iKhokha Payment Sheet`, `Super Admin Settings`, `Super Admin User Management`, `Drawer UI Component`, `Navigation Menu Component`, `Select UI Component`, `Super Admin Audit Log`, `Product Snapshot Frame`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Should `Admin Client Management Tabs` be split into smaller, more focused modules?**
  _Cohesion score 0.05143570536828964 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Admin Login & Client Blocking` to `Admin Client Management Tabs`, `UI Primitive Components`, `Trust Badges`, `Feature Flag Admin Panels`, `Runtime UI Dependencies`, `Sheet & Input Components`, `Admin Billing Plans`, `Marketing Site Pages`, `Billing Provider Configuration`, `Marketing CTAs & Live Demo`, `Consistency Pricing Admin`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `PWA Updates & Toasts`, `Demo Dashboard Views`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Admin Calendar`, `Package Dependencies`, `Dialogs & Command Palette`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `Admin Loyalty Settings`, `Admin Mobile Navigation`, `Admin Booking Settings`, `Booking Details & Consultation Form`, `Alert Dialog & Buttons`, `Admin Sidebar Navigation`, `Super Admin Revenue`, `Pain Point Carousel & UI`, `Notifications & Client Alerts`, `Admin Integrations`, `Payment Setup Checklist`, `Booking State & Confirmation`, `Tenant Onboarding`, `Admin Help Guides`, `Dashboard Preview & Device Frames`, `Case Study & Resources`, `Demo Admin Data`, `Booking Schedule & Availability`, `Loyalty Client Card`, `Breadcrumb & Liquid Button`, `Carousel Component`, `Booking App Preview`, `Public Services & Addons`, `Loyalty Tenant Criteria`, `Login & Marketing Layout`, `Super Admin Growth`, `PayShap Payment Queue`, `Consultation Form Builder`, `Tenant Health Scoring`, `Business Health Metrics`, `Revenue Trend Card`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Consultations Admin View`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `Super Admin Troubleshooting`, `Super Admin Bookings`, `Homepage Journey Navigation`, `iKhokha Payment Sheet`, `Super Admin Settings`, `Super Admin User Management`, `Display Cards Component`, `Navigation Menu Component`, `Select UI Component`, `Super Admin Audit Log`, `Marketing Dashboard Snapshot`, `Tenant Not Found Page`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Should `UI Primitive Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05625 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `Admin Login & Client Blocking` to `Admin Client Management Tabs`, `Feature Flag Admin Panels`, `Admin Billing Plans`, `App Routing`, `Billing Provider Configuration`, `Marketing CTAs & Live Demo`, `Consistency Pricing Admin`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Admin Calendar`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `Admin Loyalty Settings`, `Admin Booking Settings`, `Booking Details & Consultation Form`, `Super Admin Revenue`, `Business Theme Provider`, `Notifications & Client Alerts`, `Admin Integrations`, `Payment Setup Checklist`, `Booking State & Confirmation`, `Tenant Onboarding`, `Booking Schedule & Availability`, `Loyalty Client Card`, `Public Services & Addons`, `Loyalty Tenant Criteria`, `Login & Marketing Layout`, `Super Admin Growth`, `PayShap Payment Queue`, `Consultation Form Builder`, `Tenant Health Scoring`, `Dashboard Data Hook`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Consultations Admin View`, `Feature Adoption Analytics`, `Super Admin Troubleshooting`, `Super Admin Bookings`, `Tenant Context Provider`, `iKhokha Payment Sheet`, `Super Admin Settings`, `Super Admin User Management`, `Super Admin Audit Log`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Core Booking RPC Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.055191256830601096 - nodes in this community are weakly interconnected._
- **Should `Slot Holds & Tenant Access` be split into smaller, more focused modules?**
  _Cohesion score 0.07656341320864991 - nodes in this community are weakly interconnected._