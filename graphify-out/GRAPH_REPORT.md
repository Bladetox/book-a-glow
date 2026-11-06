# Graph Report - book-a-glow  (2026-11-06)

## Corpus Check
- 390 files · ~335,117 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 6, (none) 2, .example 1)

## Summary
- 2386 nodes · 5402 edges · 190 communities (111 shown, 79 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f122237a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @tanstack/react-query
- 20260308214729_abe41b98-2217-4182-8511-10a994985858.sql
- bookings
- public.tenants
- public.booking_items
- ChecklistCelebration.tsx
- Feature Flag Admin Panels
- dependencies
- SAAuditLog.tsx
- AdminBilling.tsx
- public.slot_holds
- Build & Lint Tooling
- Pricing, Loyalty & Tenant Fixes
- App Routing
- AdminSharedUI.tsx
- Billing Provider Configuration
- Demo.tsx
- Book.tsx
- Admin Shell & Subscription Gate
- Super Admin Navigation
- Admin Dashboard View
- hooks/use-toast.ts
- Demo Dashboard Views
- tokens.ts
- usePublicBusinessConfig.ts
- Admin Bookings Management
- AdminCalendar.tsx
- package.json
- @radix-ui/react-popover
- ReviewStep.tsx
- RevenueTrendCard.tsx
- Booking Edge Functions
- useTenant
- Staff Availability Management
- SuperAdmin.tsx
- Admin Mobile Navigation
- AdminHelp.tsx
- Booking Details & Consultation Form
- cn
- Platform Monthly Billing
- BusinessHealthSection.tsx
- Super Admin Revenue
- Business Theme Provider
- App TypeScript Config
- CI Build Check
- useNextyInsights.ts
- ClientAlertsModal.tsx
- Admin Integrations
- Payment Setup Checklist
- loyaltyHelpers.ts
- Tenant Onboarding
- Edge Function Deployment
- Roles & Tenant Auth Schema
- bookingData.ts
- SAGrowth.tsx
- Booking Email Notifications
- shadcn Components Config
- profiles
- DashboardPreview.tsx
- Demo.tsx
- app_settings
- Booking Schedule & Availability
- SEO Landing Pages
- AdminMetricExplanation.tsx
- Node TypeScript Config
- SABroadcast.tsx
- AdminConsultations.tsx
- lucide-react
- Payment Lifecycle & Indexes
- Vite Build Plugins
- SEO Page Generation
- class-variance-authority
- Resources.tsx
- types.ts
- HeatmapSection.tsx
- Login & Marketing Layout
- DashboardStockAlerts.tsx
- PayShap Payment Queue
- use-admin-viewport.ts
- Tenant Health Scoring
- SAOverview.tsx
- usePublicServices.ts
- SASystemHealth.tsx
- Tenant Activation Function
- Tenant Creation Function
- Subdomain Middleware
- @hookform/resolvers@^3.10.0
- Cohort Retention Analytics
- Super Admin Tenants
- @dnd-kit/sortable
- 20260522_consultation_questions.sql
- Root TypeScript Config
- public.update_loyalty_tracker
- Integrations Guide Panel
- Plan Feature Flags
- Feature Adoption Analytics
- SATroubleshoot.tsx
- Super Admin Bookings
- sheet.tsx
- toast.tsx
- PayFast ITN Webhook
- AdminErrorBoundary
- NPM Scripts
- public.recalculate_consistency_status
- @hcaptcha/react-hcaptcha@^1.11.0
- Super Admin User Management
- @radix-ui/react-hover-card@^1.1.14
- public.get_loyalty_gap_analysis
- calendar.tsx
- next-themes@^0.3.0
- display-cards.tsx
- Call-Out Fee Waivers
- Allowed Install Scripts
- @radix-ui/react-accordion@^1.2.11
- Tenant Theme Reseeding
- 20260930100000_guest_consultations_stage1.sql
- Vercel Deployment Config
- Blocked Clients Table
- @radix-ui/react-aspect-ratio@^1.1.7
- @radix-ui/react-avatar@^1.1.10
- @radix-ui/react-scroll-area@^1.2.9
- @radix-ui/react-select@^2.2.5
- Google Calendar Backfill
- Google Calendar OAuth Callback
- iKhokha Checkout Function
- PayFast Checkout Function
- Google Calendar Event Update
- Booking Phone Normalization
- public.bookings
- @radix-ui/react-tabs@^1.1.12
- react-day-picker
- @radix-ui/react-toggle-group@^1.1.10
- react-hook-form@^7.61.1
- recharts
- Broadcast Email Function
- iKhokha Webhook Handler
- PayFast Checkout Creation
- react-resizable-panels@^2.1.9
- Blocked Email Domains
- tailwind-merge
- tailwindcss-animate@^1.0.7
- Stale Webhook Event Logging

## God Nodes (most connected - your core abstractions)
1. `react` - 132 edges
2. `lucide-react` - 109 edges
3. `useTenant()` - 98 edges
4. `supabase` - 89 edges
5. `cn()` - 51 edges
6. `framer-motion` - 49 edges
7. `@tanstack/react-query` - 35 edges
8. `MarketingRoutes()` - 31 edges
9. `AdminShell()` - 29 edges
10. `AdminBookings()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboardView()` --calls--> `DashboardStockAlerts()`  [EXTRACTED]
  src/components/admin/AdminDashboard.tsx → src/components/admin/DashboardStockAlerts.tsx
- `BookingConfirmation()` --calls--> `usePublicBusinessConfig()`  [EXTRACTED]
  src/components/BookingConfirmation.tsx → src/hooks/usePublicBusinessConfig.ts
- `SheetDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts
- `SheetFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (190 total, 79 thin omitted)

### Community 0 - "@tanstack/react-query"
Cohesion: 0.09
Nodes (45): @tanstack/react-query, AdminCommunications(), PREVIEW_DATA, AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip (+37 more)

### Community 1 - "20260308214729_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.09
Nodes (11): public.add_service_to_booking(), public.create_booking(), public.create_booking_with_consultation(), public.get_all_bookings(), public.get_client_history(), public.get_loyalty_tracker(), public.get_returning_clients_count(), public.get_revenue_history() (+3 more)

### Community 2 - "bookings"
Cohesion: 0.15
Nodes (13): public.check_availability(), public.get_available_slots(), public.check_availability(), public.get_available_slots(), public.get_month_availability(), public.get_month_availability(), public.get_month_availability(), public.check_availability() (+5 more)

### Community 3 - "public.tenants"
Cohesion: 0.13
Nodes (13): public.get_month_availability(), public.get_available_slots(), public.replace_staff_availability(), public.replace_staff_availability(), public.check_availability(), public.get_available_slots(), public.get_month_availability(), public.reschedule_booking() (+5 more)

### Community 4 - "public.booking_items"
Cohesion: 0.08
Nodes (15): public.get_service_co_booking_patterns(), idx_booking_items_booking_id, public.trigger_recalculate_consistency_from_booking_item(), trigger_consistency_status_after_booking_item_change, public.delete_service_guarded(), public.prevent_archived_service_booking(), services_tenant_archived_idx, trg_prevent_archived_service_booking (+7 more)

### Community 5 - "ChecklistCelebration.tsx"
Cohesion: 0.47
Nodes (4): ChecklistCelebration(), fireConfetti(), loadConfetti(), Props

### Community 6 - "Feature Flag Admin Panels"
Cohesion: 0.10
Nodes (37): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+29 more)

### Community 7 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, cmdk@^1.1.1, date-fns@^3.6.0, @dnd-kit/utilities@^3.2.2, embla-carousel-react@^8.6.0, framer-motion@^12.35.1, lucide-react@^0.462.0, pdfjs-dist@^4.4.168 (+33 more)

### Community 8 - "SAAuditLog.tsx"
Cohesion: 0.40
Nodes (5): ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog()

### Community 9 - "AdminBilling.tsx"
Cohesion: 0.11
Nodes (26): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+18 more)

### Community 10 - "public.slot_holds"
Cohesion: 0.12
Nodes (9): idx_slot_holds_lookup, public.slot_holds, acquire_slot_hold(), public.get_month_availability(), public.get_month_availability(), public.check_availability(), public.get_booking_horizon_availability(), public.get_booking_horizon_availability() (+1 more)

### Community 11 - "Build & Lint Tooling"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 12 - "Pricing, Loyalty & Tenant Fixes"
Cohesion: 0.18
Nodes (9): public.calculate_booking_price(), consistency_guest_status, consistency_program_services, consistency_programs, public.calculate_booking_price(), public.create_booking_with_consultation(), public.get_booking_consistency_quote(), public.create_booking_with_consultation() (+1 more)

### Community 13 - "App Routing"
Cohesion: 0.07
Nodes (43): About, Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics (+35 more)

### Community 14 - "AdminSharedUI.tsx"
Cohesion: 0.08
Nodes (39): AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow, UnavailableService (+31 more)

### Community 15 - "Billing Provider Configuration"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 16 - "Demo.tsx"
Cohesion: 0.11
Nodes (33): react-router-dom, PrimaryCTA(), MarketingLayout(), SiteFooter(), navLinks, SiteHeader(), About(), CaseStudy() (+25 more)

### Community 17 - "Book.tsx"
Cohesion: 0.18
Nodes (13): ScheduleStepProps, StepIndicator(), StepIndicatorProps, steps, useBooking(), getSessionToken(), SlotHoldState, useSlotHold() (+5 more)

### Community 18 - "Admin Shell & Subscription Gate"
Cohesion: 0.09
Nodes (36): AdminDashboard(), AdminLogin(), getTenantSlugFromUrl(), AdminMobileNav(), ArrearsBanner(), Props, tiers, TrialExpiredPaywall() (+28 more)

### Community 19 - "Super Admin Navigation"
Cohesion: 0.13
Nodes (26): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+18 more)

### Community 20 - "Admin Dashboard View"
Cohesion: 0.11
Nodes (24): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+16 more)

### Community 21 - "hooks/use-toast.ts"
Cohesion: 0.14
Nodes (18): PwaUpdater(), ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+10 more)

### Community 22 - "Demo Dashboard Views"
Cohesion: 0.08
Nodes (40): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+32 more)

### Community 23 - "tokens.ts"
Cohesion: 0.08
Nodes (29): CarouselDots(), CaseStudySection(), CTASection(), Eyebrow(), FeaturesSection(), GROUPS, HeroSection(), HomePricingPreview() (+21 more)

### Community 24 - "usePublicBusinessConfig.ts"
Cohesion: 0.19
Nodes (12): SplashScreen(), SplashScreenProps, ThemeToggle(), useBusinessTheme(), useBrandFont(), defaultReferralOptions, defaults, PublicBusinessConfig (+4 more)

### Community 25 - "Admin Bookings Management"
Cohesion: 0.14
Nodes (24): AddServiceModal(), AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps, DetailRow(), EditField(), filters (+16 more)

### Community 26 - "AdminCalendar.tsx"
Cohesion: 0.16
Nodes (28): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+20 more)

### Community 27 - "package.json"
Cohesion: 0.07
Nodes (28): clsx@^2.1.1, @dnd-kit/core@^6.3.1, input-otp@^1.4.2, @radix-ui/react-alert-dialog@^1.1.14, @radix-ui/react-checkbox@^1.3.2, @radix-ui/react-collapsible@^1.1.11, @radix-ui/react-menubar@^1.1.15, @radix-ui/react-progress@^1.1.7 (+20 more)

### Community 29 - "ReviewStep.tsx"
Cohesion: 0.09
Nodes (19): RuleEditorProps, friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase (+11 more)

### Community 30 - "RevenueTrendCard.tsx"
Cohesion: 0.17
Nodes (14): ADMIN_METRIC_DEFINITIONS, ADMIN_METRIC_INFO, AdminMetricDefinition, AdminMetricInfoLine, EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS (+6 more)

### Community 31 - "Booking Edge Functions"
Cohesion: 0.07
Nodes (12): corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders (+4 more)

### Community 32 - "useTenant"
Cohesion: 0.10
Nodes (42): AdminServices(), EditingService, emptyService(), RuleEditor(), ServiceOption, ServiceReorderRow(), ServiceReorderRowProps, ServiceRowActions() (+34 more)

### Community 33 - "Staff Availability Management"
Cohesion: 0.15
Nodes (23): AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AVAILABILITY_SELECT, AvailabilitySlot, DailyOverrides (+15 more)

### Community 34 - "SuperAdmin.tsx"
Cohesion: 0.70
Nodes (3): SuperAdminLogin(), useShellBackground(), SuperAdmin()

### Community 35 - "Admin Mobile Navigation"
Cohesion: 0.08
Nodes (27): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, AdminSidebar(), AdminSidebarProps, AdminSidebarView(), AdminSidebarViewProps (+19 more)

### Community 36 - "AdminHelp.tsx"
Cohesion: 0.35
Nodes (13): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+5 more)

### Community 37 - "Booking Details & Consultation Form"
Cohesion: 0.18
Nodes (16): ConsultationQRenderer(), ConsultationQRendererProps, DetailsStep(), phoneCodes, PlaceSuggestion, validators, ConsultationAnswerValue, BusinessType (+8 more)

### Community 38 - "cn"
Cohesion: 0.15
Nodes (19): @radix-ui/react-dialog@^1.1.14, @radix-ui/react-dialog, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle (+11 more)

### Community 39 - "Platform Monthly Billing"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 40 - "BusinessHealthSection.tsx"
Cohesion: 0.21
Nodes (11): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+3 more)

### Community 41 - "Super Admin Revenue"
Cohesion: 0.20
Nodes (20): CopyLinkButton(), CreateInvoiceModal(), CustomTooltip(), daysUntil(), fmtDate(), GlassCard(), MarkPaidModal(), MONTHS (+12 more)

### Community 42 - "Business Theme Provider"
Cohesion: 0.10
Nodes (31): BookingAppPreview(), Category, isDemoAvailable(), S, Screen, Service, STEP_LABELS, STEP_SCREENS (+23 more)

### Community 43 - "App TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 44 - "CI Build Check"
Cohesion: 0.10
Nodes (20): name, runs-on, steps, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, jobs, build, name (+12 more)

### Community 45 - "useNextyInsights.ts"
Cohesion: 0.07
Nodes (43): AttachRateRow, BasketTrendRow, ChannelRoiRow, DAY_NAMES, dayBefore(), formatRand(), formatRpm(), hourLabel() (+35 more)

### Community 46 - "ClientAlertsModal.tsx"
Cohesion: 0.09
Nodes (35): date-fns, react-dom, AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType (+27 more)

### Community 47 - "Admin Integrations"
Cohesion: 0.20
Nodes (21): AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps, isConfigured() (+13 more)

### Community 48 - "Payment Setup Checklist"
Cohesion: 0.18
Nodes (13): Props, SetupChecklistPaymentGate(), TenantPaymentFields, useTenantPaymentFields(), getPlanLabel(), getPlanPaymentFocus(), hasCompletedPaymentSetup(), isLifetimeFree() (+5 more)

### Community 49 - "loyaltyHelpers.ts"
Cohesion: 0.05
Nodes (75): AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), InsightIcon(), LOYALTY_INSIGHT_IDS, NextyLoyaltyPanel(), PRIORITY_STYLES (+67 more)

### Community 50 - "Tenant Onboarding"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 51 - "Edge Function Deployment"
Cohesion: 0.11
Nodes (17): runs-on, steps, SUPABASE_ACCESS_TOKEN, jobs, deploy, name, on, push (+9 more)

### Community 52 - "Roles & Tenant Auth Schema"
Cohesion: 0.12
Nodes (10): public.get_user_tenant_id(), public.has_role(), public.tenants, public.user_roles, public.is_tenant_admin(), public.calculate_booking_price(), public.is_admin(), public.sync_tenant_business_name() (+2 more)

### Community 53 - "bookingData.ts"
Cohesion: 0.23
Nodes (9): BookingConfirmation(), BookingConfirmationProps, DetailsStepProps, BookingState, Category, ConsultationQuestionSnapshot, initialBookingState, safetyQuestions (+1 more)

### Community 54 - "SAGrowth.tsx"
Cohesion: 0.23
Nodes (12): BookingRaw, BookingStat, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard(), median(), MONTHS (+4 more)

### Community 55 - "Booking Email Notifications"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 56 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 57 - "profiles"
Cohesion: 0.12
Nodes (9): public.current_tenant_id(), public.is_admin(), public.update_loyalty_tracker(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation() (+1 more)

### Community 58 - "DashboardPreview.tsx"
Cohesion: 0.25
Nodes (6): DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices

### Community 59 - "Demo.tsx"
Cohesion: 0.29
Nodes (9): DemoDeviceIframe(), NATIVE_WIDTH, DeviceFrameProps, LaptopFrame(), MobileFrame(), DashboardCustomisationCallout(), Demo(), demoContext (+1 more)

### Community 60 - "app_settings"
Cohesion: 0.22
Nodes (4): public.get_app_setting(), public.get_month_availability(), public.calculate_booking_price(), public.reschedule_booking()

### Community 61 - "Booking Schedule & Availability"
Cohesion: 0.25
Nodes (14): getStaffId(), ScheduleStep(), applyTenantBranding(), PublicTenantContext, PublicTenantData, usePublicTenant(), getStaffId(), MonthDateAvailability (+6 more)

### Community 62 - "SEO Landing Pages"
Cohesion: 0.14
Nodes (13): PageContent, PageData, Section, SeoLandingPage(), usePageSEO(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth() (+5 more)

### Community 63 - "AdminMetricExplanation.tsx"
Cohesion: 0.29
Nodes (7): AdminMetricExplanation(), AdminMetricExplanationLine, AdminMetricExplanationProps, MetricExplanationBody(), ADMIN_MOTION, adminFadeVariants(), AdminIconButton

### Community 64 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 65 - "SABroadcast.tsx"
Cohesion: 0.33
Nodes (4): Broadcast, BROADCAST_TYPES, BType, TYPE_COLOR

### Community 66 - "AdminConsultations.tsx"
Cohesion: 0.61
Nodes (7): AdminConsultations(), answeredItems(), changeEntries(), exportCSV(), filters, fmtTime(), formatAnswer()

### Community 67 - "lucide-react"
Cohesion: 0.08
Nodes (31): framer-motion, lucide-react, sonner, AddServiceModalProps, BookingItem, Service, AdminBlockedClients(), BlockedClientRow (+23 more)

### Community 68 - "Payment Lifecycle & Indexes"
Cohesion: 0.18
Nodes (7): idx_bookings_tenant_date_time, idx_bookings_tenant_status, idx_payments_booking_id, idx_payments_tenant_id, public.cancel_expired_pending_bookings(), payments_ikhokha_transaction_id_uidx, payments_yoco_transaction_id_uidx

### Community 69 - "Vite Build Plugins"
Cohesion: 0.15
Nodes (10): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, lovable-tagger, vite, vite-plugin-pwa (+2 more)

### Community 70 - "SEO Page Generation"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 71 - "class-variance-authority"
Cohesion: 0.32
Nodes (6): class-variance-authority@^0.7.1, class-variance-authority, Label, labelVariants, Toggle, toggleVariants

### Community 72 - "Resources.tsx"
Cohesion: 0.09
Nodes (20): @testing-library/react@^16.0.0, vitest@^3.2.4, @testing-library/react, vitest, birthdayClients, renderModal(), HomeJourneyNav(), HomeJourneyNavProps (+12 more)

### Community 73 - "types.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 74 - "HeatmapSection.tsx"
Cohesion: 0.21
Nodes (13): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+5 more)

### Community 75 - "Login & Marketing Layout"
Cohesion: 0.15
Nodes (15): HOME_STYLES, MarketingLayoutProps, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), LOVABLE_DOMAINS, MAIN_DOMAINS, SUPABASE_ANON_KEY (+7 more)

### Community 76 - "DashboardStockAlerts.tsx"
Cohesion: 0.40
Nodes (4): DashboardStockAlerts(), DashboardStockAlertsProps, fadeUp, StockAlertItem

### Community 77 - "PayShap Payment Queue"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 78 - "use-admin-viewport.ts"
Cohesion: 0.60
Nodes (3): ADMIN_VIEWPORT_BREAKPOINTS, getAdminViewport(), useAdminViewport()

### Community 79 - "Tenant Health Scoring"
Cohesion: 0.24
Nodes (11): BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel, SATenantHealth() (+3 more)

### Community 80 - "SAOverview.tsx"
Cohesion: 0.67
Nodes (3): GlassCard(), SAOverview(), Stats

### Community 81 - "usePublicServices.ts"
Cohesion: 0.23
Nodes (12): react, ServicesStep(), ServicesStepProps, StickyBottomBar(), StickyBottomBarProps, categoryLabel(), PublicService, ServiceCategory (+4 more)

### Community 82 - "SASystemHealth.tsx"
Cohesion: 0.60
Nodes (4): Check, GlassCard(), pingTable(), SASystemHealth()

### Community 83 - "Tenant Activation Function"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 84 - "Tenant Creation Function"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 85 - "Subdomain Middleware"
Cohesion: 0.33
Nodes (9): config, esc(), fetchTenant(), MAIN_DOMAINS, middleware(), nextResponse(), patchMetaName(), patchMetaProp() (+1 more)

### Community 87 - "Cohort Retention Analytics"
Cohesion: 0.29
Nodes (8): addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow, toYearMonth()

### Community 88 - "Super Admin Tenants"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 90 - "20260522_consultation_questions.sql"
Cohesion: 0.70
Nodes (4): idx_consultation_questions_tenant_id, public.consultation_questions, public.set_consultation_questions_updated_at(), trg_consultation_questions_updated_at

### Community 91 - "Root TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 92 - "public.update_loyalty_tracker"
Cohesion: 0.17
Nodes (5): public.get_loyalty_gap_analysis(), loyalty_tracker_tenant_phone_unique, public.update_loyalty_tracker(), public.normalize_consistency_booking_client(), trg_normalize_consistency_booking_client

### Community 93 - "Integrations Guide Panel"
Cohesion: 0.47
Nodes (9): Callout(), FieldRef(), GoogleCalGuide(), GuidePanelProps, IntegrationsGuidePanel(), SectionHeader(), SmtpGuide(), Step() (+1 more)

### Community 94 - "Plan Feature Flags"
Cohesion: 0.20
Nodes (7): ALL_FLAGS, FeatureStatus, flagKeys, PLAN_GROUPS, PlanFeature, PlanGroup, PLATFORM_TENANT_ID

### Community 95 - "Feature Adoption Analytics"
Cohesion: 0.28
Nodes (8): adoptionColor(), avg(), BookingStat, FEATURE_LABELS, FeatureSummary, FeatureUsageRow, SAFeatureAdoption(), TenantRow

### Community 96 - "SATroubleshoot.tsx"
Cohesion: 0.13
Nodes (19): ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader(), Booking, DiagIssue (+11 more)

### Community 97 - "Super Admin Bookings"
Cohesion: 0.29
Nodes (6): DATE_RANGES, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 98 - "sheet.tsx"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 99 - "toast.tsx"
Cohesion: 0.38
Nodes (8): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster()

### Community 100 - "PayFast ITN Webhook"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 102 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 103 - "public.recalculate_consistency_status"
Cohesion: 0.32
Nodes (3): public.recalculate_consistency_status(), trigger_consistency_status, public.recalculate_consistency_status()

### Community 105 - "Super Admin User Management"
Cohesion: 0.38
Nodes (6): EditRoleModal(), GlassCard(), Profile, ROLES, SAUsers(), TenantMap

### Community 108 - "calendar.tsx"
Cohesion: 0.43
Nodes (5): Button, ButtonProps, buttonVariants, Calendar(), CalendarProps

### Community 110 - "display-cards.tsx"
Cohesion: 0.50
Nodes (4): DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 111 - "Call-Out Fee Waivers"
Cohesion: 0.33
Nodes (4): public.booking_callout_fee_waivers, public.waive_call_out_fee(), nextslot_private.restore_call_out_fee_atomic(), public.booking_callout_fee_restorations

### Community 112 - "Allowed Install Scripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js@3.50.0, esbuild@0.21.5, esbuild@0.25.0, @swc/core@1.13.2, tesseract.js@5.1.1

### Community 114 - "Tenant Theme Reseeding"
Cohesion: 0.33
Nodes (5): corsHeaders, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 115 - "20260930100000_guest_consultations_stage1.sql"
Cohesion: 0.47
Nodes (4): idx_guest_consultations_tenant, public.guest_consultations, public.guest_name_aliases, public.guest_person_key()

### Community 116 - "Vercel Deployment Config"
Cohesion: 0.33
Nodes (5): cleanUrls, headers, redirects, rewrites, $schema

### Community 118 - "Blocked Clients Table"
Cohesion: 0.70
Nodes (4): blocked_clients_email_idx, blocked_clients_phone_idx, blocked_clients_tenant_idx, public.blocked_clients

### Community 125 - "iKhokha Checkout Function"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 129 - "public.bookings"
Cohesion: 0.11
Nodes (13): protect_booking_fields_trigger, public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_revenue_per_minute(), public.trigger_recalculate_consistency(), trigger_consistency_status_after_insert, trigger_consistency_status_after_relevant_update, public.update_booking_status() (+5 more)

## Knowledge Gaps
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `usePublicServices.ts` to `@tanstack/react-query`, `ChecklistCelebration.tsx`, `Feature Flag Admin Panels`, `dependencies`, `SAAuditLog.tsx`, `AdminBilling.tsx`, `App Routing`, `AdminSharedUI.tsx`, `Billing Provider Configuration`, `Demo.tsx`, `Book.tsx`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `hooks/use-toast.ts`, `Demo Dashboard Views`, `tokens.ts`, `usePublicBusinessConfig.ts`, `Admin Bookings Management`, `AdminCalendar.tsx`, `package.json`, `ReviewStep.tsx`, `RevenueTrendCard.tsx`, `useTenant`, `Staff Availability Management`, `SuperAdmin.tsx`, `Admin Mobile Navigation`, `AdminHelp.tsx`, `Booking Details & Consultation Form`, `cn`, `Super Admin Revenue`, `Business Theme Provider`, `useNextyInsights.ts`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `bookingData.ts`, `SAGrowth.tsx`, `Demo.tsx`, `Booking Schedule & Availability`, `SEO Landing Pages`, `SABroadcast.tsx`, `AdminConsultations.tsx`, `lucide-react`, `class-variance-authority`, `Resources.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `use-admin-viewport.ts`, `Tenant Health Scoring`, `SAOverview.tsx`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `sheet.tsx`, `toast.tsx`, `Super Admin User Management`, `calendar.tsx`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Should `@tanstack/react-query` be split into smaller, more focused modules?**
  _Cohesion score 0.09125188536953242 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `@tanstack/react-query`, `ChecklistCelebration.tsx`, `Feature Flag Admin Panels`, `dependencies`, `SAAuditLog.tsx`, `AdminBilling.tsx`, `App Routing`, `AdminSharedUI.tsx`, `Billing Provider Configuration`, `Demo.tsx`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `Demo Dashboard Views`, `usePublicBusinessConfig.ts`, `Admin Bookings Management`, `AdminCalendar.tsx`, `package.json`, `ReviewStep.tsx`, `RevenueTrendCard.tsx`, `useTenant`, `Staff Availability Management`, `SuperAdmin.tsx`, `Admin Mobile Navigation`, `AdminHelp.tsx`, `Booking Details & Consultation Form`, `cn`, `BusinessHealthSection.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `bookingData.ts`, `SAGrowth.tsx`, `DashboardPreview.tsx`, `Demo.tsx`, `Booking Schedule & Availability`, `SEO Landing Pages`, `AdminMetricExplanation.tsx`, `SABroadcast.tsx`, `AdminConsultations.tsx`, `Resources.tsx`, `Login & Marketing Layout`, `DashboardStockAlerts.tsx`, `PayShap Payment Queue`, `Tenant Health Scoring`, `SAOverview.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `sheet.tsx`, `toast.tsx`, `Super Admin User Management`, `calendar.tsx`, `display-cards.tsx`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Should `20260308214729_abe41b98-2217-4182-8511-10a994985858.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `lucide-react` to `@tanstack/react-query`, `Feature Flag Admin Panels`, `SAAuditLog.tsx`, `AdminBilling.tsx`, `App Routing`, `AdminSharedUI.tsx`, `Billing Provider Configuration`, `Demo.tsx`, `Book.tsx`, `Admin Shell & Subscription Gate`, `usePublicBusinessConfig.ts`, `Admin Bookings Management`, `AdminCalendar.tsx`, `ReviewStep.tsx`, `useTenant`, `Staff Availability Management`, `SuperAdmin.tsx`, `Booking Details & Consultation Form`, `Super Admin Revenue`, `Business Theme Provider`, `useNextyInsights.ts`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `SAGrowth.tsx`, `Booking Schedule & Availability`, `SABroadcast.tsx`, `AdminConsultations.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `Tenant Health Scoring`, `SAOverview.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `Super Admin User Management`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `bookings` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._
- **Should `public.tenants` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._