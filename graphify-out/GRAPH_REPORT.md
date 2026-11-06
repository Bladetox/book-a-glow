# Graph Report - book-a-glow  (2026-11-06)

## Corpus Check
- 386 files · ~332,338 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 5, (none) 2, .example 1)

## Summary
- 2354 nodes · 5326 edges · 193 communities (114 shown, 79 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8df1ef8b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminCommunications.tsx
- 20260308214729_abe41b98-2217-4182-8511-10a994985858.sql
- bookings
- Slot Holds & Tenant Access
- Nexty Insight Analytics RPCs
- sheet.tsx
- Feature Flag Admin Panels
- dependencies
- lucide-react
- Admin Billing Plans
- homepage-journey.test.tsx
- Build & Lint Tooling
- Pricing, Loyalty & Tenant Fixes
- App Routing
- SiteFooter
- Billing Provider Configuration
- Resources.tsx
- Consistency Pricing Admin
- Admin Shell & Subscription Gate
- Super Admin Navigation
- Admin Dashboard View
- PWA Updates & Toasts
- Demo Dashboard Views
- tokens.ts
- Booking Flow Steps & Splash
- Admin Bookings Management
- Admin Calendar
- package.json
- Dialogs & Command Palette
- Booking Review & Payment
- Nexty AI Recommendations
- Booking Edge Functions
- Admin Services Management
- Staff Availability Management
- AdminLoyalty.tsx
- Admin Mobile Navigation
- Admin Booking Settings
- Booking Details & Consultation Form
- Pricing.tsx
- Platform Monthly Billing
- use-admin-viewport.ts
- Super Admin Revenue
- Business Theme Provider
- App TypeScript Config
- CI Build Check
- @tanstack/react-query
- Notifications & Client Alerts
- Admin Integrations
- Payment Setup Checklist
- DemoAdminEmbed.tsx
- Tenant Onboarding
- Edge Function Deployment
- Roles & Tenant Auth Schema
- class-variance-authority
- Admin Help Guides
- Booking Email Notifications
- shadcn Components Config
- profiles
- DashboardPreview.tsx
- AdminSpecialOccasions.tsx
- app_settings
- Booking Schedule & Availability
- SEO Landing Pages
- Loyalty Client Card
- Node TypeScript Config
- toast.tsx
- PublicTenantContext.tsx
- public.services
- Payment Lifecycle & Indexes
- Vite Build Plugins
- SEO Page Generation
- FirstBookingCelebration.tsx
- Public Services & Addons
- ConsultationFormBuilder.tsx
- Heatmap Dashboard Previews
- Login & Marketing Layout
- DashboardStockAlerts.tsx
- PayShap Payment Queue
- public.create_booking
- Tenant Health Scoring
- Business Health Metrics
- Book.tsx
- Dashboard Data Hook
- Tenant Activation Function
- Tenant Creation Function
- Subdomain Middleware
- Revenue Trend Card
- Cohort Retention Analytics
- Super Admin Tenants
- SAGrowth.tsx
- calendar.tsx
- Root TypeScript Config
- Consultations Admin View
- Integrations Guide Panel
- Plan Feature Flags
- Feature Adoption Analytics
- SATroubleshoot.tsx
- Super Admin Bookings
- cn
- date-fns
- PayFast ITN Webhook
- public.update_loyalty_tracker
- NPM Scripts
- 20260913000001_consistency_streak_functions.sql
- SASystemHealth.tsx
- Super Admin User Management
- Display Cards Component
- public.resize_slot_hold
- 20260524_sync_business_name_to_app_settings.sql
- input-otp@^1.4.2
- @radix-ui/react-context-menu@^2.2.15
- Call-Out Fee Waivers
- Allowed Install Scripts
- @radix-ui/react-popover
- Tenant Theme Reseeding
- Guest Consultations Schema
- Vercel Deployment Config
- Blocked Clients Table
- Consultation Questions Table
- Merged Client Consistency Normalization
- @radix-ui/react-select@^2.2.5
- @radix-ui/react-radio-group@^1.3.7
- Google Calendar Backfill
- Google Calendar OAuth Callback
- iKhokha Checkout Function
- PayFast Checkout Function
- Google Calendar Event Update
- Booking Phone Normalization
- public.bookings
- @radix-ui/react-scroll-area@^1.2.9
- @radix-ui/react-slot
- react-dom
- react-hook-form@^7.61.1
- recharts
- Broadcast Email Function
- iKhokha Webhook Handler
- PayFast Checkout Creation
- @supabase/supabase-js
- Blocked Email Domains
- vaul@^0.9.9
- public.get_available_slots
- public.replace_staff_availability
- public.replace_staff_availability
- StockScanModal.tsx
- Stale Webhook Event Logging

## God Nodes (most connected - your core abstractions)
1. `react` - 133 edges
2. `lucide-react` - 108 edges
3. `useTenant()` - 98 edges
4. `supabase` - 89 edges
5. `cn()` - 51 edges
6. `framer-motion` - 48 edges
7. `@tanstack/react-query` - 35 edges
8. `MarketingRoutes()` - 31 edges
9. `AdminShell()` - 29 edges
10. `AdminBookings()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboardView()` --calls--> `DashboardStockAlerts()`  [EXTRACTED]
  src/components/admin/AdminDashboard.tsx → src/components/admin/DashboardStockAlerts.tsx
- `BookingConfirmation()` --calls--> `usePublicBusinessConfig()`  [EXTRACTED]
  src/components/BookingConfirmation.tsx → src/hooks/usePublicBusinessConfig.ts
- `useTenantSubscription()` --calls--> `useTenant()`  [EXTRACTED]
  src/hooks/useSupabaseSettings.ts → src/contexts/TenantContext.tsx
- `DialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dialog.tsx → src/lib/utils.ts
- `SheetFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (193 total, 79 thin omitted)

### Community 0 - "AdminCommunications.tsx"
Cohesion: 0.20
Nodes (22): AdminCommunications(), PREVIEW_DATA, buildDefaultWhatsAppMessage(), buildWhatsAppMessage(), clean(), DEFAULT_WHATSAPP_TONE, getWhatsAppTemplateDefault(), MessageData (+14 more)

### Community 1 - "20260308214729_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.09
Nodes (11): public.add_service_to_booking(), public.calculate_booking_price(), public.create_booking_with_consultation(), public.get_all_bookings(), public.get_client_history(), public.get_loyalty_tracker(), public.get_returning_clients_count(), public.get_revenue_history() (+3 more)

### Community 2 - "bookings"
Cohesion: 0.15
Nodes (14): public.check_availability(), public.get_available_slots(), public.check_availability(), public.get_available_slots(), public.get_month_availability(), public.get_month_availability(), public.get_month_availability(), public.check_availability() (+6 more)

### Community 3 - "Slot Holds & Tenant Access"
Cohesion: 0.12
Nodes (18): public.tenants, idx_slot_holds_lookup, public.slot_holds, public.get_month_availability(), public.get_month_availability(), public.check_availability(), public.get_available_slots(), public.get_month_availability() (+10 more)

### Community 4 - "Nexty Insight Analytics RPCs"
Cohesion: 0.08
Nodes (13): public.get_service_co_booking_patterns(), loyalty_tracker_tenant_phone_unique, public.recalculate_consistency_status(), public.recalculate_consistency_status(), public.trigger_recalculate_consistency_from_booking_item(), trigger_consistency_status_after_booking_item_change, public.replace_consistency_program_services(), public.service_booking_reference_map() (+5 more)

### Community 5 - "sheet.tsx"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 6 - "Feature Flag Admin Panels"
Cohesion: 0.10
Nodes (37): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+29 more)

### Community 7 - "dependencies"
Cohesion: 0.04
Nodes (48): dependencies, class-variance-authority@^0.7.1, cmdk@^1.1.1, @dnd-kit/sortable@^8.0.0, @dnd-kit/utilities@^3.2.2, embla-carousel-react@^8.6.0, framer-motion@^12.35.1, @hcaptcha/react-hcaptcha@^1.11.0 (+40 more)

### Community 8 - "lucide-react"
Cohesion: 0.06
Nodes (36): lucide-react, AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View, Props, tiers, SuperAdminLogin() (+28 more)

### Community 9 - "Admin Billing Plans"
Cohesion: 0.11
Nodes (26): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+18 more)

### Community 10 - "homepage-journey.test.tsx"
Cohesion: 0.29
Nodes (5): @testing-library/react@^16.0.0, @testing-library/react, HomeJourneyNav(), HomeJourneyNavProps, ITEMS

### Community 11 - "Build & Lint Tooling"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 12 - "Pricing, Loyalty & Tenant Fixes"
Cohesion: 0.21
Nodes (8): consistency_guest_status, consistency_program_services, consistency_programs, public.calculate_booking_price(), public.create_booking_with_consultation(), public.get_booking_consistency_quote(), public.create_booking_with_consultation(), public.create_booking_with_consultation()

### Community 13 - "App Routing"
Cohesion: 0.09
Nodes (37): About, Admin, AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics, BusinessGrowth (+29 more)

### Community 14 - "SiteFooter"
Cohesion: 0.17
Nodes (15): HOME_STYLES, MARKETING_BG, useMarketingShell(), MarketingLayout(), MarketingLayoutProps, SiteFooter(), NotFound(), bodyText (+7 more)

### Community 15 - "Billing Provider Configuration"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 16 - "Resources.tsx"
Cohesion: 0.11
Nodes (30): react-router-dom, PrimaryCTA(), MK, SECTION, BookingAppPreview(), DemoDeviceIframe(), NATIVE_WIDTH, DeviceFrameProps (+22 more)

### Community 17 - "Consistency Pricing Admin"
Cohesion: 0.09
Nodes (32): sonner, AdminBlockedClients(), BlockedClientRow, AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow (+24 more)

### Community 18 - "Admin Shell & Subscription Gate"
Cohesion: 0.10
Nodes (32): AdminDashboard(), AdminMobileNav(), ArrearsBanner(), TrialExpiredPaywall(), Tenant, TenantSubscription, useAdminViewport(), useFeatureFlags() (+24 more)

### Community 19 - "Super Admin Navigation"
Cohesion: 0.13
Nodes (26): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+18 more)

### Community 20 - "Admin Dashboard View"
Cohesion: 0.12
Nodes (23): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+15 more)

### Community 21 - "PWA Updates & Toasts"
Cohesion: 0.14
Nodes (18): PwaUpdater(), ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+10 more)

### Community 22 - "Demo Dashboard Views"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 23 - "tokens.ts"
Cohesion: 0.10
Nodes (25): CarouselDots(), CaseStudySection(), CTASection(), Eyebrow(), FeaturesSection(), GROUPS, HeroSection(), HomePricingPreview() (+17 more)

### Community 24 - "Booking Flow Steps & Splash"
Cohesion: 0.19
Nodes (13): framer-motion, SplashScreen(), SplashScreenProps, ThemeToggle(), useBusinessTheme(), useBrandFont(), defaultReferralOptions, defaults (+5 more)

### Community 25 - "Admin Bookings Management"
Cohesion: 0.11
Nodes (32): AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps (+24 more)

### Community 26 - "Admin Calendar"
Cohesion: 0.16
Nodes (28): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+20 more)

### Community 27 - "package.json"
Cohesion: 0.06
Nodes (34): clsx@^2.1.1, @dnd-kit/core@^6.3.1, @radix-ui/react-alert-dialog@^1.1.14, @radix-ui/react-aspect-ratio@^1.1.7, @radix-ui/react-avatar@^1.1.10, @radix-ui/react-dialog@^1.1.14, @radix-ui/react-label@^2.1.7, @radix-ui/react-separator@^1.1.7 (+26 more)

### Community 28 - "Dialogs & Command Palette"
Cohesion: 0.21
Nodes (12): AdminMetricExplanation(), AdminMetricExplanationLine, AdminMetricExplanationProps, AdminIconButton, MetricExpandOverlay(), DialogContent, DialogContentProps, DialogDescription (+4 more)

### Community 29 - "Booking Review & Payment"
Cohesion: 0.10
Nodes (17): friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase, ConsistencyQuote (+9 more)

### Community 30 - "Nexty AI Recommendations"
Cohesion: 0.12
Nodes (24): InsightIcon(), NextyLoyaltyPanel(), AdminNextyOrb(), AdminNextyOrbProps, AdminRecommendations(), getFilterKey(), InsightFilterKey, InsightIcon() (+16 more)

### Community 31 - "Booking Edge Functions"
Cohesion: 0.07
Nodes (12): corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders (+4 more)

### Community 32 - "Admin Services Management"
Cohesion: 0.19
Nodes (21): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+13 more)

### Community 33 - "Staff Availability Management"
Cohesion: 0.15
Nodes (23): AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AVAILABILITY_SELECT, AvailabilitySlot, DailyOverrides (+15 more)

### Community 34 - "AdminLoyalty.tsx"
Cohesion: 0.09
Nodes (39): AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), LOYALTY_INSIGHT_IDS, PRIORITY_STYLES, SettingCard(), SettingCardProps (+31 more)

### Community 35 - "Admin Mobile Navigation"
Cohesion: 0.10
Nodes (23): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, AdminSidebarView(), groupIconMap, iconMap, NAV (+15 more)

### Community 36 - "Admin Booking Settings"
Cohesion: 0.14
Nodes (21): AdminSettings(), Collapsible(), DEPOSIT_PRESETS, isAcquisitionChannel(), LEAD_TIME_PRESETS, MAX_DAYS_PRESETS, MIN_NOTICE_PRESETS, OVERRUN_PRESETS (+13 more)

### Community 37 - "Booking Details & Consultation Form"
Cohesion: 0.11
Nodes (23): BookingConfirmation(), BookingConfirmationProps, ConsultationQRendererProps, DetailsStepProps, phoneCodes, PlaceSuggestion, validators, BookingState (+15 more)

### Community 38 - "Pricing.tsx"
Cohesion: 0.14
Nodes (15): CellValue(), comparisonSections, faqs, FeatureRow, FeatureSection, planKeyMap, planLabelMap, planRank (+7 more)

### Community 39 - "Platform Monthly Billing"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 40 - "use-admin-viewport.ts"
Cohesion: 0.33
Nodes (5): AdminSidebarProps, AdminSidebarViewProps, ADMIN_VIEWPORT_BREAKPOINTS, AdminViewport, getAdminViewport()

### Community 41 - "Super Admin Revenue"
Cohesion: 0.20
Nodes (20): CopyLinkButton(), CreateInvoiceModal(), CustomTooltip(), daysUntil(), fmtDate(), GlassCard(), MarkPaidModal(), MONTHS (+12 more)

### Community 42 - "Business Theme Provider"
Cohesion: 0.10
Nodes (29): Category, isDemoAvailable(), S, Screen, Service, STEP_LABELS, STEP_SCREENS, TENANT_BY_ID (+21 more)

### Community 43 - "App TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 44 - "CI Build Check"
Cohesion: 0.10
Nodes (20): name, runs-on, steps, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, jobs, build, name (+12 more)

### Community 45 - "@tanstack/react-query"
Cohesion: 0.15
Nodes (22): @tanstack/react-query, AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType, ProactiveAlertBanner() (+14 more)

### Community 46 - "Notifications & Client Alerts"
Cohesion: 0.14
Nodes (14): FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, LOADING_CTX, resolveSubdomainTenantId(), TenantContext, TenantContextValue (+6 more)

### Community 47 - "Admin Integrations"
Cohesion: 0.20
Nodes (21): AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps, isConfigured() (+13 more)

### Community 48 - "Payment Setup Checklist"
Cohesion: 0.10
Nodes (26): ChecklistCelebration(), fireConfetti(), loadConfetti(), Props, GATE_ITEMS, GateItem, GateRow(), GateRowProps (+18 more)

### Community 49 - "DemoAdminEmbed.tsx"
Cohesion: 0.17
Nodes (13): buildTrend(), DashboardData, DEMO_DASHBOARD_DATA, DEMO_INACTIVE_CLIENTS, DEMO_OVERDUE_CLIENTS, HEAT, seeded(), SLOTS (+5 more)

### Community 50 - "Tenant Onboarding"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 51 - "Edge Function Deployment"
Cohesion: 0.11
Nodes (17): runs-on, steps, SUPABASE_ACCESS_TOKEN, jobs, deploy, name, on, push (+9 more)

### Community 52 - "Roles & Tenant Auth Schema"
Cohesion: 0.16
Nodes (5): public.get_user_tenant_id(), public.has_role(), public.user_roles, public.is_tenant_admin(), public.sa_delete_tenant()

### Community 53 - "class-variance-authority"
Cohesion: 0.67
Nodes (3): class-variance-authority, Label, labelVariants

### Community 54 - "Admin Help Guides"
Cohesion: 0.25
Nodes (14): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+6 more)

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

### Community 59 - "AdminSpecialOccasions.tsx"
Cohesion: 0.26
Nodes (11): AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort(), nextOccurrence(), OccasionCard() (+3 more)

### Community 60 - "app_settings"
Cohesion: 0.17
Nodes (6): public.get_app_setting(), public.get_month_availability(), public.calculate_booking_price(), public.is_admin(), public.calculate_booking_price(), public.reschedule_booking()

### Community 61 - "Booking Schedule & Availability"
Cohesion: 0.36
Nodes (11): getStaffId(), ScheduleStep(), usePublicTenant(), getStaffId(), MonthDateAvailability, resolveStaffId(), todayLocalStr(), useDateSlots() (+3 more)

### Community 62 - "SEO Landing Pages"
Cohesion: 0.14
Nodes (13): PageContent, PageData, Section, SeoLandingPage(), usePageSEO(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth() (+5 more)

### Community 63 - "Loyalty Client Card"
Cohesion: 0.14
Nodes (24): BulkBarProps, FallbackModal(), LoyaltyBulkBar(), useSequentialWaSend(), AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials() (+16 more)

### Community 64 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 65 - "toast.tsx"
Cohesion: 0.38
Nodes (8): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster()

### Community 66 - "PublicTenantContext.tsx"
Cohesion: 0.18
Nodes (13): App(), ScrollToTop(), applyTenantBranding(), PublicTenantContext, PublicTenantData, PublicTenantProvider(), isCustomDomainHost(), LOVABLE_DOMAINS (+5 more)

### Community 67 - "public.services"
Cohesion: 0.38
Nodes (4): public.delete_service_guarded(), public.prevent_archived_service_booking(), services_tenant_archived_idx, trg_prevent_archived_service_booking

### Community 68 - "Payment Lifecycle & Indexes"
Cohesion: 0.17
Nodes (8): idx_booking_items_booking_id, idx_bookings_tenant_date_time, idx_bookings_tenant_status, idx_payments_booking_id, idx_payments_tenant_id, public.cancel_expired_pending_bookings(), payments_ikhokha_transaction_id_uidx, payments_yoco_transaction_id_uidx

### Community 69 - "Vite Build Plugins"
Cohesion: 0.13
Nodes (12): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, vitest@^3.2.4, lovable-tagger, vite (+4 more)

### Community 70 - "SEO Page Generation"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 71 - "FirstBookingCelebration.tsx"
Cohesion: 0.53
Nodes (4): fireConfetti(), FirstBookingCelebration(), loadConfetti(), seenKey()

### Community 72 - "Public Services & Addons"
Cohesion: 0.23
Nodes (11): ServicesStep(), ServicesStepProps, StickyBottomBar(), StickyBottomBarProps, categoryLabel(), PublicService, ServiceCategory, usePublicCategories() (+3 more)

### Community 73 - "ConsultationFormBuilder.tsx"
Cohesion: 0.23
Nodes (12): SavedBadge(), blankDraft(), BUSINESS_TYPE_LABELS, BUSINESS_TYPES, ConsultationFormBuilder(), ConsultationQuestionRow, DraftQuestion, isQuestionType() (+4 more)

### Community 74 - "Heatmap Dashboard Previews"
Cohesion: 0.21
Nodes (13): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+5 more)

### Community 75 - "Login & Marketing Layout"
Cohesion: 0.33
Nodes (8): buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), completePendingOnboarding(), inputStyle, labelStyle, Login(), ViewMode

### Community 76 - "DashboardStockAlerts.tsx"
Cohesion: 0.40
Nodes (4): DashboardStockAlerts(), DashboardStockAlertsProps, fadeUp, StockAlertItem

### Community 77 - "PayShap Payment Queue"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 79 - "Tenant Health Scoring"
Cohesion: 0.24
Nodes (11): BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel, SATenantHealth() (+3 more)

### Community 80 - "Business Health Metrics"
Cohesion: 0.24
Nodes (10): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+2 more)

### Community 81 - "Book.tsx"
Cohesion: 0.16
Nodes (15): ConsultationQRenderer(), DetailsStep(), ScheduleStepProps, StepIndicator(), StepIndicatorProps, steps, getSessionToken(), SlotHoldState (+7 more)

### Community 82 - "Dashboard Data Hook"
Cohesion: 0.16
Nodes (18): AdminDashboardViewProps, ClientAlertsModalProps, ClientAlerts, InactiveClient, OverdueLoyaltyClient, useClientAlerts(), buildHeatSlots(), buildTopServices() (+10 more)

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
Cohesion: 0.29
Nodes (8): addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow, toYearMonth()

### Community 88 - "Super Admin Tenants"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 89 - "SAGrowth.tsx"
Cohesion: 0.23
Nodes (12): BookingRaw, BookingStat, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard(), median(), MONTHS (+4 more)

### Community 90 - "calendar.tsx"
Cohesion: 0.43
Nodes (5): Button, ButtonProps, buttonVariants, Calendar(), CalendarProps

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
Cohesion: 0.28
Nodes (8): adoptionColor(), avg(), BookingStat, FEATURE_LABELS, FeatureSummary, FeatureUsageRow, SAFeatureAdoption(), TenantRow

### Community 96 - "SATroubleshoot.tsx"
Cohesion: 0.13
Nodes (19): ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader(), Booking, DiagIssue (+11 more)

### Community 97 - "Super Admin Bookings"
Cohesion: 0.29
Nodes (6): DATE_RANGES, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 98 - "cn"
Cohesion: 0.20
Nodes (13): react, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input (+5 more)

### Community 99 - "date-fns"
Cohesion: 0.47
Nodes (5): date-fns@^3.6.0, date-fns, getDaysLeft(), TrialCountdownNudge(), getAccountState()

### Community 100 - "PayFast ITN Webhook"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 102 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 104 - "SASystemHealth.tsx"
Cohesion: 0.60
Nodes (4): Check, GlassCard(), pingTable(), SASystemHealth()

### Community 105 - "Super Admin User Management"
Cohesion: 0.38
Nodes (6): EditRoleModal(), GlassCard(), Profile, ROLES, SAUsers(), TenantMap

### Community 106 - "Display Cards Component"
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

### Community 129 - "public.bookings"
Cohesion: 0.09
Nodes (15): protect_booking_fields_trigger, acquire_slot_hold(), public.get_loyalty_gap_analysis(), public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_revenue_per_minute(), public.trigger_recalculate_consistency(), trigger_consistency_status_after_insert (+7 more)

### Community 145 - "StockScanModal.tsx"
Cohesion: 0.22
Nodes (10): pdfjs-dist@^4.4.168, tesseract.js@^5.1.1, pdfjs-dist, tesseract.js, parseInvoiceText(), pdfToImages(), Props, ScannedRow (+2 more)

## Knowledge Gaps
- **79 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `cn` to `AdminCommunications.tsx`, `sheet.tsx`, `Feature Flag Admin Panels`, `dependencies`, `lucide-react`, `Admin Billing Plans`, `homepage-journey.test.tsx`, `App Routing`, `SiteFooter`, `Billing Provider Configuration`, `Resources.tsx`, `Consistency Pricing Admin`, `Admin Shell & Subscription Gate`, `StockScanModal.tsx`, `Admin Dashboard View`, `PWA Updates & Toasts`, `Demo Dashboard Views`, `tokens.ts`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Admin Calendar`, `package.json`, `Dialogs & Command Palette`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `AdminLoyalty.tsx`, `Admin Mobile Navigation`, `Admin Booking Settings`, `Booking Details & Consultation Form`, `Pricing.tsx`, `use-admin-viewport.ts`, `Super Admin Revenue`, `Business Theme Provider`, `@tanstack/react-query`, `Notifications & Client Alerts`, `Admin Integrations`, `Payment Setup Checklist`, `DemoAdminEmbed.tsx`, `Tenant Onboarding`, `class-variance-authority`, `Admin Help Guides`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `SEO Landing Pages`, `Loyalty Client Card`, `toast.tsx`, `PublicTenantContext.tsx`, `FirstBookingCelebration.tsx`, `Public Services & Addons`, `ConsultationFormBuilder.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `Tenant Health Scoring`, `Book.tsx`, `Dashboard Data Hook`, `Revenue Trend Card`, `Cohort Retention Analytics`, `Super Admin Tenants`, `SAGrowth.tsx`, `calendar.tsx`, `Consultations Admin View`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `Super Admin Navigation`, `Super Admin Bookings`, `SATroubleshoot.tsx`, `date-fns`, `SASystemHealth.tsx`, `Super Admin User Management`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Should `20260308214729_abe41b98-2217-4182-8511-10a994985858.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.09420289855072464 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `AdminCommunications.tsx`, `sheet.tsx`, `Feature Flag Admin Panels`, `dependencies`, `Admin Billing Plans`, `homepage-journey.test.tsx`, `App Routing`, `SiteFooter`, `Billing Provider Configuration`, `Resources.tsx`, `Consistency Pricing Admin`, `Admin Shell & Subscription Gate`, `StockScanModal.tsx`, `Admin Dashboard View`, `Super Admin Navigation`, `Demo Dashboard Views`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Admin Calendar`, `package.json`, `Dialogs & Command Palette`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `AdminLoyalty.tsx`, `Admin Mobile Navigation`, `Admin Booking Settings`, `Booking Details & Consultation Form`, `Pricing.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `@tanstack/react-query`, `Notifications & Client Alerts`, `Admin Integrations`, `Payment Setup Checklist`, `DemoAdminEmbed.tsx`, `Tenant Onboarding`, `Admin Help Guides`, `DashboardPreview.tsx`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `SEO Landing Pages`, `Loyalty Client Card`, `toast.tsx`, `FirstBookingCelebration.tsx`, `Public Services & Addons`, `ConsultationFormBuilder.tsx`, `Login & Marketing Layout`, `DashboardStockAlerts.tsx`, `PayShap Payment Queue`, `Tenant Health Scoring`, `Business Health Metrics`, `Revenue Trend Card`, `Cohort Retention Analytics`, `Super Admin Tenants`, `SAGrowth.tsx`, `calendar.tsx`, `Consultations Admin View`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `date-fns`, `SASystemHealth.tsx`, `Super Admin User Management`, `Display Cards Component`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Should `bookings` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `lucide-react` to `AdminCommunications.tsx`, `Feature Flag Admin Panels`, `Admin Billing Plans`, `App Routing`, `Billing Provider Configuration`, `Consistency Pricing Admin`, `StockScanModal.tsx`, `Admin Shell & Subscription Gate`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Admin Calendar`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `AdminLoyalty.tsx`, `Admin Booking Settings`, `Booking Details & Consultation Form`, `Pricing.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `@tanstack/react-query`, `Notifications & Client Alerts`, `Admin Integrations`, `Payment Setup Checklist`, `Tenant Onboarding`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `Loyalty Client Card`, `PublicTenantContext.tsx`, `FirstBookingCelebration.tsx`, `Public Services & Addons`, `ConsultationFormBuilder.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `Tenant Health Scoring`, `Book.tsx`, `Dashboard Data Hook`, `Cohort Retention Analytics`, `Super Admin Tenants`, `SAGrowth.tsx`, `Consultations Admin View`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `SASystemHealth.tsx`, `Super Admin User Management`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Slot Holds & Tenant Access` be split into smaller, more focused modules?**
  _Cohesion score 0.11829268292682926 - nodes in this community are weakly interconnected._
- **Should `Nexty Insight Analytics RPCs` be split into smaller, more focused modules?**
  _Cohesion score 0.08403361344537816 - nodes in this community are weakly interconnected._