# Graph Report - book-a-glow  (2026-11-07)

## Corpus Check
- 569 files · ~383,256 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 6, (none) 2, .example 1)

## Summary
- 2915 nodes · 6018 edges · 320 communities (131 shown, 189 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20d89f36`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminSharedUI.tsx
- 20260308214728_abe41b98-2217-4182-8511-10a994985858.sql
- staff_availability
- public.reschedule_booking
- public.bookings
- @tanstack/react-query
- Feature Flag Admin Panels
- package.json
- SAAuditLog.tsx
- AdminBilling.tsx
- public.bookings
- Build & Lint Tooling
- profiles
- App Routing
- supabase
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
- dependencies
- bookings
- ReviewStep.tsx
- RevenueTrendCard.tsx
- Booking Edge Functions
- AdminSettings.tsx
- Staff Availability Management
- public.profiles
- BrandIcons.tsx
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
- public.tenants
- bookingData.ts
- LoyaltyClientCard.tsx
- Booking Email Notifications
- shadcn Components Config
- DashboardPreview.tsx
- Demo.tsx
- app_settings
- Booking Schedule & Availability
- 20260309185554_security_indexes_vault.sql
- AdminMetricExplanation.tsx
- Node TypeScript Config
- lucide-react
- AdminConsultations.tsx
- client.ts
- Payment Lifecycle & Indexes
- Vite Build Plugins
- SEO Page Generation
- react
- Resources.tsx
- types.ts
- HeatmapSection.tsx
- Login & Marketing Layout
- Pricing.tsx
- PayShap Payment Queue
- payments
- Tenant Health Scoring
- AdminServices.tsx
- usePublicServices.ts
- SASystemHealth.tsx
- Tenant Activation Function
- Tenant Creation Function
- Subdomain Middleware
- @hookform/resolvers@^3.10.0
- Cohort Retention Analytics
- Super Admin Tenants
- useSupabaseDashboard.ts
- AdminSidebar.tsx
- Root TypeScript Config
- loyalty_tracker
- Integrations Guide Panel
- Plan Feature Flags
- Feature Adoption Analytics
- SATroubleshoot.tsx
- Super Admin Bookings
- sheet.tsx
- toast.tsx
- PayFast ITN Webhook
- TenantContext.tsx
- NPM Scripts
- AdminRecommendations.tsx
- DemoAdminEmbed.tsx
- Super Admin User Management
- functions/_shared/security.ts
- calendar.tsx
- 20260524123735_platform_billing_tables.sql
- display-cards.tsx
- 20260307083447_009_add_tenant_id_to_missing_tables.sql
- Allowed Install Scripts
- @radix-ui/react-accordion@^1.2.11
- AdminSpecialOccasions.tsx
- ConsultationFormBuilder.tsx
- Vercel Deployment Config
- send-billing-receipt/index.ts
- get-or-create-client/_shared/security.ts
- initiate-deposit-checkout/_shared/security.ts
- @radix-ui/react-avatar@^1.1.10
- yoco-balance/_shared/security.ts
- @radix-ui/react-select@^2.2.5
- Google Calendar Backfill
- iKhokha Checkout Function
- PayFast Checkout Function
- Google Calendar Event Update
- public.recalculate_consistency_status
- public.services
- @radix-ui/react-tabs@^1.1.12
- react-day-picker
- @radix-ui/react-toggle-group@^1.1.10
- react-hook-form@^7.61.1
- vitest
- Broadcast Email Function
- iKhokha Webhook Handler
- useClientAlerts.ts
- react-resizable-panels@^2.1.9
- notifications
- 20260524135812_platform_billing_followup_fixes.sql
- AdminConsistencyPricing.tsx
- create-calendar-event/index.ts
- platform-billing-checkout/index.ts
- billing_queue
- 20260929231952_guest_consultations_stage1.sql
- platform-billing-webhook/index.ts
- public.blocked_clients
- 20260703195943_ensure_tenant_owner_role_and_tenant_row.sql
- platform-monthly-billing-test/index.ts
- send-email/index.ts
- 20260913033541_recalculate_consistency_on_booking_changes.sql
- platform-payment-webhook/index.ts
- register-yoco-webhook/index.ts
- reply-to-review/index.ts
- 20260308213829_9e3548a1-f70e-40eb-a3cb-654a31ff8c43.sql
- 20260817095419_blocked_email_domains.sql
- embla-carousel-react@^8.6.0
- @radix-ui/react-collapsible@^1.1.11
- @radix-ui/react-context-menu@^2.2.15
- Stale Webhook Event Logging
- vite-env.d.ts
- @radix-ui/react-navigation-menu@^1.2.13
- @radix-ui/react-slider@^1.3.5
- vaul@^0.9.9
- zod@^3.25.76
- 20261107034436_internal_cron_secrets.sql

## God Nodes (most connected - your core abstractions)
1. `react` - 132 edges
2. `lucide-react` - 109 edges
3. `useTenant()` - 98 edges
4. `supabase` - 89 edges
5. `bookings` - 66 edges
6. `cn()` - 51 edges
7. `framer-motion` - 49 edges
8. `profiles` - 35 edges
9. `@tanstack/react-query` - 35 edges
10. `MarketingRoutes()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `useTenantSubscription()` --calls--> `useTenant()`  [EXTRACTED]
  src/hooks/useSupabaseSettings.ts → src/contexts/TenantContext.tsx
- `idx_profiles_tenant` --indexes--> `profiles`  [EXTRACTED]
  supabase/migrations/010_multi_tenant_security.sql → supabase/migrations/001_create_users_and_profiles.sql
- `public.current_tenant_id()` --reads_from--> `profiles`  [EXTRACTED]
  supabase/migrations/20260308214728_abe41b98-2217-4182-8511-10a994985858.sql → supabase/migrations/001_create_users_and_profiles.sql
- `public.is_admin()` --reads_from--> `profiles`  [EXTRACTED]
  supabase/migrations/20260308214728_abe41b98-2217-4182-8511-10a994985858.sql → supabase/migrations/001_create_users_and_profiles.sql
- `public.update_loyalty_tracker()` --reads_from--> `profiles`  [EXTRACTED]
  supabase/migrations/20260308214728_abe41b98-2217-4182-8511-10a994985858.sql → supabase/migrations/001_create_users_and_profiles.sql

## Import Cycles
- None detected.

## Communities (320 total, 189 thin omitted)

### Community 0 - "AdminSharedUI.tsx"
Cohesion: 0.15
Nodes (25): AdminCommunications(), PREVIEW_DATA, AdminIconButtonProps, AdminPageHeader(), SavedBadge(), buildDefaultWhatsAppMessage(), buildWhatsAppMessage(), clean() (+17 more)

### Community 1 - "20260308214728_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.08
Nodes (14): booking_items, idx_booking_items_booking, idx_booking_items_service, public.add_service_to_booking(), public.create_booking(), public.current_tenant_id(), public.get_all_bookings(), public.get_client_history() (+6 more)

### Community 2 - "staff_availability"
Cohesion: 0.09
Nodes (24): idx_staff_availability_date, idx_staff_availability_day, idx_staff_availability_staff, staff_availability, update_staff_availability_updated_at, public.check_availability(), public.get_available_slots(), public.check_availability() (+16 more)

### Community 3 - "public.reschedule_booking"
Cohesion: 0.13
Nodes (5): public.check_availability(), public.reschedule_booking(), public.reschedule_booking(), public.get_available_slots(), public.reschedule_booking()

### Community 4 - "public.bookings"
Cohesion: 0.06
Nodes (16): public.recalculate_consistency_status(), public.trigger_recalculate_consistency_from_booking_item(), trigger_consistency_status_after_booking_item_change, public.service_booking_reference_map(), public.service_booking_reference_map(), public.normalize_consistency_booking_client(), trg_normalize_consistency_booking_client, public.booking_callout_fee_waivers (+8 more)

### Community 5 - "@tanstack/react-query"
Cohesion: 0.15
Nodes (15): @tanstack/react-query, ChecklistCelebration(), fireConfetti(), loadConfetti(), Props, GATE_ITEMS, GateItem, GateRow() (+7 more)

### Community 6 - "Feature Flag Admin Panels"
Cohesion: 0.10
Nodes (37): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+29 more)

### Community 7 - "package.json"
Cohesion: 0.06
Nodes (30): clsx@^2.1.1, @dnd-kit/sortable@^8.0.0, @dnd-kit/utilities@^3.2.2, next-themes@^0.3.0, pdfjs-dist@^4.4.168, @radix-ui/react-dropdown-menu@^2.1.15, @radix-ui/react-hover-card@^1.1.14, @radix-ui/react-label@^2.1.7 (+22 more)

### Community 8 - "SAAuditLog.tsx"
Cohesion: 0.40
Nodes (5): ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog()

### Community 9 - "AdminBilling.tsx"
Cohesion: 0.11
Nodes (27): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+19 more)

### Community 10 - "public.bookings"
Cohesion: 0.07
Nodes (30): public.acquire_slot_hold(), public.get_loyalty_gap_analysis(), public.get_nexty_business_context(), public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_rebooking_rate_analysis(), public.get_revenue_per_minute(), public.get_new_vs_returning_clients() (+22 more)

### Community 11 - "Build & Lint Tooling"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 12 - "profiles"
Cohesion: 0.05
Nodes (28): idx_profiles_email, idx_profiles_role, profiles, update_profiles_updated_at, update_updated_at_column(), idx_services_active, idx_services_category, services (+20 more)

### Community 13 - "App Routing"
Cohesion: 0.06
Nodes (50): Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics, BusinessGrowth (+42 more)

### Community 14 - "supabase"
Cohesion: 0.10
Nodes (29): sonner, AdminBlockedClients(), BlockedClientRow, EmptyState(), SectionLabel(), ActionType, AdminStock(), FormField() (+21 more)

### Community 15 - "Billing Provider Configuration"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 16 - "Demo.tsx"
Cohesion: 0.12
Nodes (24): About, CaseStudy, HOME_STYLES, Orb(), SECTION, MARKETING_BG, useMarketingShell(), MarketingLayout() (+16 more)

### Community 17 - "Book.tsx"
Cohesion: 0.17
Nodes (15): ConsultationQRenderer(), DetailsStep(), ScheduleStepProps, StepIndicator(), StepIndicatorProps, steps, getSessionToken(), SlotHoldState (+7 more)

### Community 18 - "Admin Shell & Subscription Gate"
Cohesion: 0.10
Nodes (29): AdminDashboard(), ArrearsBanner(), Tenant, TenantSubscription, useFeatureFlags(), Admin(), AdminAvailability, AdminBookings (+21 more)

### Community 19 - "Super Admin Navigation"
Cohesion: 0.13
Nodes (26): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+18 more)

### Community 20 - "Admin Dashboard View"
Cohesion: 0.09
Nodes (30): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+22 more)

### Community 21 - "hooks/use-toast.ts"
Cohesion: 0.14
Nodes (18): PwaUpdater(), ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+10 more)

### Community 22 - "Demo Dashboard Views"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 23 - "tokens.ts"
Cohesion: 0.09
Nodes (26): CarouselDots(), CaseStudySection(), CTASection(), Eyebrow(), FeaturesSection(), GROUPS, HeroSection(), HomePricingPreview() (+18 more)

### Community 24 - "usePublicBusinessConfig.ts"
Cohesion: 0.21
Nodes (11): SplashScreen(), SplashScreenProps, ThemeToggle(), useBusinessTheme(), useBrandFont(), defaults, PublicBusinessConfig, usePublicBusinessConfig() (+3 more)

### Community 25 - "Admin Bookings Management"
Cohesion: 0.12
Nodes (31): AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps (+23 more)

### Community 26 - "AdminCalendar.tsx"
Cohesion: 0.16
Nodes (28): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+20 more)

### Community 27 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, class-variance-authority@^0.7.1, cmdk@^1.1.1, date-fns@^3.6.0, @dnd-kit/core@^6.3.1, framer-motion@^12.35.1, @hcaptcha/react-hcaptcha@^1.11.0, input-otp@^1.4.2 (+35 more)

### Community 28 - "bookings"
Cohesion: 0.06
Nodes (33): bookings, idx_bookings_client, idx_bookings_created, idx_bookings_date, idx_bookings_staff, idx_bookings_status, update_bookings_updated_at, public.update_booking_status() (+25 more)

### Community 29 - "ReviewStep.tsx"
Cohesion: 0.10
Nodes (17): friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase, ConsistencyQuote (+9 more)

### Community 30 - "RevenueTrendCard.tsx"
Cohesion: 0.25
Nodes (10): EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS, Props, RevenueTrendCard(), RevenueTrendEntry, Skeleton() (+2 more)

### Community 31 - "Booking Edge Functions"
Cohesion: 0.05
Nodes (17): corsHeaders, corsHeaders, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS (+9 more)

### Community 32 - "AdminSettings.tsx"
Cohesion: 0.14
Nodes (21): AdminSettings(), Collapsible(), DEPOSIT_PRESETS, isAcquisitionChannel(), LEAD_TIME_PRESETS, MAX_DAYS_PRESETS, MIN_NOTICE_PRESETS, OVERRUN_PRESETS (+13 more)

### Community 33 - "Staff Availability Management"
Cohesion: 0.15
Nodes (23): AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AVAILABILITY_SELECT, AvailabilitySlot, DailyOverrides (+15 more)

### Community 34 - "public.profiles"
Cohesion: 0.07
Nodes (19): public.handle_new_user(), idx_booking_items_booking_id, idx_booking_items_tenant_id, idx_profiles_role, idx_profiles_tenant_id, public.get_attach_rate(), get_loyalty_gap_analysis(), get_new_vs_returning_clients() (+11 more)

### Community 35 - "BrandIcons.tsx"
Cohesion: 0.13
Nodes (14): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, AvailabilityIcon(), BookingsIcon(), ClientManagementIcon(), DashboardIcon(), defaults (+6 more)

### Community 36 - "AdminHelp.tsx"
Cohesion: 0.24
Nodes (16): framer-motion, AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide() (+8 more)

### Community 37 - "Booking Details & Consultation Form"
Cohesion: 0.19
Nodes (13): ConsultationQRendererProps, phoneCodes, PlaceSuggestion, validators, ConsultationAnswerValue, BusinessType, ConsultationQuestionDefinition, DEFAULT_SECTION_LABEL (+5 more)

### Community 38 - "cn"
Cohesion: 0.20
Nodes (15): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DialogContent, DialogContentProps (+7 more)

### Community 39 - "Platform Monthly Billing"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 40 - "BusinessHealthSection.tsx"
Cohesion: 0.24
Nodes (10): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+2 more)

### Community 41 - "Super Admin Revenue"
Cohesion: 0.09
Nodes (36): recharts@^2.15.4, recharts, BookingRaw, BookingStat, ChartTooltipProps, CustomTooltip(), daysUntil(), fmtCurrency() (+28 more)

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
Cohesion: 0.09
Nodes (31): AttachRateRow, BasketTrendRow, ChannelRoiRow, DAY_NAMES, dayBefore(), formatRand(), formatRpm(), hourLabel() (+23 more)

### Community 46 - "ClientAlertsModal.tsx"
Cohesion: 0.15
Nodes (22): AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType, ProactiveAlertBanner(), Tab (+14 more)

### Community 47 - "Admin Integrations"
Cohesion: 0.20
Nodes (21): AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps, isConfigured() (+13 more)

### Community 48 - "Payment Setup Checklist"
Cohesion: 0.17
Nodes (14): Props, SetupChecklistPaymentGate(), TenantPaymentFields, useTenantPaymentFields(), useUpsertAppSetting(), getPlanLabel(), getPlanPaymentFocus(), hasCompletedPaymentSetup() (+6 more)

### Community 49 - "loyaltyHelpers.ts"
Cohesion: 0.09
Nodes (42): date-fns, AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), LOYALTY_INSIGHT_IDS, PRIORITY_STYLES, SettingCard() (+34 more)

### Community 50 - "Tenant Onboarding"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 51 - "Edge Function Deployment"
Cohesion: 0.11
Nodes (17): runs-on, steps, SUPABASE_ACCESS_TOKEN, jobs, deploy, name, on, push (+9 more)

### Community 52 - "public.tenants"
Cohesion: 0.07
Nodes (23): on_auth_user_created, public.handle_new_user(), public.get_user_tenant_id(), public.has_role(), public.tenants, public.user_roles, public.is_tenant_admin(), idx_mrr_snapshots_month (+15 more)

### Community 53 - "bookingData.ts"
Cohesion: 0.21
Nodes (10): BookingConfirmation(), BookingConfirmationProps, DetailsStepProps, BookingState, Category, ConsultationQuestionSnapshot, initialBookingState, safetyQuestions (+2 more)

### Community 54 - "LoyaltyClientCard.tsx"
Cohesion: 0.13
Nodes (23): BulkBarProps, FallbackModal(), LoyaltyBulkBar(), useSequentialWaSend(), AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials() (+15 more)

### Community 55 - "Booking Email Notifications"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 56 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 58 - "DashboardPreview.tsx"
Cohesion: 0.25
Nodes (6): DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices

### Community 59 - "Demo.tsx"
Cohesion: 0.23
Nodes (11): Demo, MK, DemoDeviceIframe(), NATIVE_WIDTH, DeviceFrameProps, LaptopFrame(), MobileFrame(), DashboardCustomisationCallout() (+3 more)

### Community 60 - "app_settings"
Cohesion: 0.13
Nodes (13): public.get_app_setting(), public.get_month_availability(), public.calculate_booking_price(), public.is_admin(), trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger (+5 more)

### Community 61 - "Booking Schedule & Availability"
Cohesion: 0.28
Nodes (13): getStaffId(), ScheduleStep(), PublicTenantContext, PublicTenantData, usePublicTenant(), getStaffId(), MonthDateAvailability, resolveStaffId() (+5 more)

### Community 62 - "20260309185554_security_indexes_vault.sql"
Cohesion: 0.09
Nodes (18): idx_bookings_booking_date, idx_bookings_client_id, idx_bookings_date_start, idx_bookings_staff_date, idx_bookings_status, idx_bookings_tenant_id, idx_bookings_yoco_checkout, idx_payments_booking_id (+10 more)

### Community 63 - "AdminMetricExplanation.tsx"
Cohesion: 0.24
Nodes (10): AdminMetricExplanation(), AdminMetricExplanationLine, AdminMetricExplanationProps, MetricExplanationBody(), adminFadeVariants(), AdminIconButton, MetricExpandOverlay(), ADMIN_VIEWPORT_BREAKPOINTS (+2 more)

### Community 64 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 65 - "lucide-react"
Cohesion: 0.16
Nodes (11): lucide-react, SuperAdminLogin(), Broadcast, BROADCAST_TYPES, BType, TYPE_COLOR, GlassCard(), SAOverview() (+3 more)

### Community 66 - "AdminConsultations.tsx"
Cohesion: 0.23
Nodes (14): AdminConsultations(), answeredItems(), changeEntries(), ConsultationAnswerItem, ConsultationChangeEntry, ConsultationJsonFields, ConsultationRow, exportCSV() (+6 more)

### Community 67 - "client.ts"
Cohesion: 0.14
Nodes (13): @supabase/supabase-js@^2.98.0, @supabase/supabase-js, AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View, fireConfetti(), FirstBookingCelebration() (+5 more)

### Community 68 - "Payment Lifecycle & Indexes"
Cohesion: 0.29
Nodes (3): public.cancel_expired_pending_bookings(), payments_ikhokha_transaction_id_uidx, payments_yoco_transaction_id_uidx

### Community 69 - "Vite Build Plugins"
Cohesion: 0.15
Nodes (10): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, lovable-tagger, vite, vite-plugin-pwa (+2 more)

### Community 70 - "SEO Page Generation"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 71 - "react"
Cohesion: 0.21
Nodes (8): class-variance-authority, react, Input, Label, labelVariants, Separator, Toggle, toggleVariants

### Community 72 - "Resources.tsx"
Cohesion: 0.16
Nodes (12): Resources, Article, articles, categories, Category, CategoryChip(), categoryOpacity, CoverImage() (+4 more)

### Community 73 - "types.ts"
Cohesion: 0.15
Nodes (14): GlassCard(), SAWebhookQueue(), TenantMap, WebhookEvent, CompositeTypes, Constants, Database, DatabaseWithoutInternals (+6 more)

### Community 74 - "HeatmapSection.tsx"
Cohesion: 0.23
Nodes (12): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+4 more)

### Community 75 - "Login & Marketing Layout"
Cohesion: 0.17
Nodes (14): Login, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), LOVABLE_DOMAINS, MAIN_DOMAINS, SUPABASE_ANON_KEY, SUPABASE_URL (+6 more)

### Community 76 - "Pricing.tsx"
Cohesion: 0.11
Nodes (19): react-router-dom, Pricing, ResetPassword, PrimaryCTA(), CellValue(), comparisonSections, faqs, FeatureRow (+11 more)

### Community 77 - "PayShap Payment Queue"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 78 - "payments"
Cohesion: 0.11
Nodes (17): idx_payments_booking, idx_payments_client, idx_payments_created, idx_payments_status, payments, update_payments_updated_at, idx_payments_gateway, get_returning_clients_count() (+9 more)

### Community 79 - "Tenant Health Scoring"
Cohesion: 0.24
Nodes (11): BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel, SATenantHealth() (+3 more)

### Community 80 - "AdminServices.tsx"
Cohesion: 0.19
Nodes (21): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+13 more)

### Community 81 - "usePublicServices.ts"
Cohesion: 0.23
Nodes (11): ServicesStep(), ServicesStepProps, StickyBottomBar(), StickyBottomBarProps, categoryLabel(), PublicService, ServiceCategory, usePublicCategories() (+3 more)

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

### Community 89 - "useSupabaseDashboard.ts"
Cohesion: 0.13
Nodes (20): AllTimeBooking, AvailabilityRow, BookingItemRow, buildHeatSlots(), buildTopServices(), CLIENT_TYPE_LABELS, ClientNameFields, DashboardBooking (+12 more)

### Community 90 - "AdminSidebar.tsx"
Cohesion: 0.14
Nodes (12): ADMIN_NAV_GROUPS, AdminSidebarProps, AdminSidebarView(), AdminSidebarViewProps, groupIconMap, iconMap, NAV, NavItem (+4 more)

### Community 91 - "Root TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 92 - "loyalty_tracker"
Cohesion: 0.09
Nodes (16): loyalty_tracker_tenant_email_unique, public.update_loyalty_tracker(), loyalty_tracker_tenant_phone_unique, public.update_loyalty_tracker(), consistency_guest_status, consistency_program_services, consistency_programs, public.recalculate_consistency_status() (+8 more)

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
Cohesion: 0.16
Nodes (15): ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader(), Booking, DiagIssue (+7 more)

### Community 97 - "Super Admin Bookings"
Cohesion: 0.25
Nodes (7): DATE_RANGES, FlaggedPayment, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 98 - "sheet.tsx"
Cohesion: 0.22
Nodes (10): @radix-ui/react-dialog@^1.1.14, @radix-ui/react-dialog, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+2 more)

### Community 99 - "toast.tsx"
Cohesion: 0.38
Nodes (8): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster()

### Community 100 - "PayFast ITN Webhook"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 101 - "TenantContext.tsx"
Cohesion: 0.14
Nodes (14): FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, LOADING_CTX, resolveSubdomainTenantId(), TenantContext, TenantContextValue (+6 more)

### Community 102 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 103 - "AdminRecommendations.tsx"
Cohesion: 0.21
Nodes (14): InsightIcon(), NextyLoyaltyPanel(), AdminNextyOrb(), AdminNextyOrbProps, AdminRecommendations(), getFilterKey(), InsightFilterKey, InsightIcon() (+6 more)

### Community 104 - "DemoAdminEmbed.tsx"
Cohesion: 0.17
Nodes (14): AdminMobileNav(), buildTrend(), DashboardData, DEMO_DASHBOARD_DATA, DEMO_INACTIVE_CLIENTS, DEMO_OVERDUE_CLIENTS, HEAT, seeded() (+6 more)

### Community 105 - "Super Admin User Management"
Cohesion: 0.38
Nodes (6): EditRoleModal(), GlassCard(), Profile, ROLES, SAUsers(), TenantMap

### Community 106 - "functions/_shared/security.ts"
Cohesion: 0.19
Nodes (5): VAULT_KEYS, buildCorsHeaders(), json(), timingSafeEqual(), verifyWebhookSignature()

### Community 108 - "calendar.tsx"
Cohesion: 0.43
Nodes (5): Button, ButtonProps, buttonVariants, Calendar(), CalendarProps

### Community 109 - "20260524123735_platform_billing_tables.sql"
Cohesion: 0.26
Nodes (10): idx_platform_invoices_due, idx_platform_invoices_status, idx_platform_invoices_tenant, idx_platform_payments_invoice, idx_platform_payments_tenant, platform_invoices, platform_payments, set_updated_at() (+2 more)

### Community 110 - "display-cards.tsx"
Cohesion: 0.50
Nodes (4): DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 111 - "20260307083447_009_add_tenant_id_to_missing_tables.sql"
Cohesion: 0.17
Nodes (7): idx_app_settings_tenant, idx_consultations_tenant, idx_loyalty_tracker_tenant, idx_reviews_cache_tenant, idx_staff_availability_tenant, idx_stock_inventory_tenant, idx_webhook_queue_tenant

### Community 112 - "Allowed Install Scripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js@3.50.0, esbuild@0.21.5, esbuild@0.25.0, @swc/core@1.13.2, tesseract.js@5.1.1

### Community 114 - "AdminSpecialOccasions.tsx"
Cohesion: 0.26
Nodes (11): AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort(), nextOccurrence(), OccasionCard() (+3 more)

### Community 115 - "ConsultationFormBuilder.tsx"
Cohesion: 0.24
Nodes (11): blankDraft(), BUSINESS_TYPE_LABELS, BUSINESS_TYPES, ConsultationFormBuilder(), ConsultationQuestionRow, DraftQuestion, isQuestionType(), makeLocalKey() (+3 more)

### Community 116 - "Vercel Deployment Config"
Cohesion: 0.33
Nodes (5): cleanUrls, headers, redirects, rewrites, $schema

### Community 117 - "send-billing-receipt/index.ts"
Cohesion: 0.14
Nodes (8): corsHeaders, buildReceiptHtml(), buildSnapshotHtml(), escHtml(), fmtRands(), formatLeadSource(), MonthlySnapshot, PLAN_LABELS

### Community 118 - "get-or-create-client/_shared/security.ts"
Cohesion: 0.25
Nodes (5): buildCorsHeaders(), generateSecurePassword(), isValidEmail(), timingSafeEqual(), verifyWebhookSignature()

### Community 119 - "initiate-deposit-checkout/_shared/security.ts"
Cohesion: 0.24
Nodes (4): buildCorsHeaders(), getSecret(), timingSafeEqual(), verifyWebhookSignature()

### Community 121 - "yoco-balance/_shared/security.ts"
Cohesion: 0.25
Nodes (5): buildCorsHeaders(), esc(), getSecret(), timingSafeEqual(), verifyWebhookSignature()

### Community 125 - "iKhokha Checkout Function"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 128 - "public.recalculate_consistency_status"
Cohesion: 0.27
Nodes (3): public.replace_consistency_program_services(), public.expire_lapsed_consistency_streaks(), public.recalculate_consistency_status()

### Community 129 - "public.services"
Cohesion: 0.12
Nodes (11): idx_saa_addon_id, idx_saa_service_id, public.service_addon_assignments, unique_service_name_category, public.delete_service_guarded(), public.prevent_archived_service_booking(), services_tenant_archived_idx, public.acquire_slot_hold() (+3 more)

### Community 134 - "vitest"
Cohesion: 0.22
Nodes (7): @testing-library/react@^16.0.0, vitest@^3.2.4, @testing-library/react, vitest, HomeJourneyNav(), HomeJourneyNavProps, ITEMS

### Community 137 - "useClientAlerts.ts"
Cohesion: 0.31
Nodes (8): AdminDashboardViewProps, ClientAlertsModalProps, ClientAlerts, InactiveClient, OverdueLoyaltyClient, useClientAlerts(), buildClientIdentityKeys(), ClientIdentityRow

### Community 139 - "notifications"
Cohesion: 0.24
Nodes (8): booking_notification_trigger, notifications, notifications_tenant_id_created_at_idx, notify_on_booking_event(), idx_loyalty_tracker_tenant_id, idx_notifications_tenant_id, idx_payments_tenant_id, idx_profiles_tenant_id

### Community 140 - "20260524135812_platform_billing_followup_fixes.sql"
Cohesion: 0.24
Nodes (5): public.apply_platform_billing_lifecycle(), public.is_super_admin(), public.sa_platform_billing_overview, platform_invoices_due_status_idx, platform_invoices_tenant_billing_month_uidx

### Community 141 - "AdminConsistencyPricing.tsx"
Cohesion: 0.28
Nodes (8): AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow, UnavailableService

### Community 143 - "platform-billing-checkout/index.ts"
Cohesion: 0.40
Nodes (5): buildSignature(), corsHeaders, jsStringEscape(), PLAN_LABELS, PLAN_PRICES_CENTS

### Community 144 - "billing_queue"
Cohesion: 0.60
Nodes (5): billing_queue, billing_queue_billing_month_idx, billing_queue_created_at_idx, billing_queue_status_idx, billing_queue_tenant_id_idx

### Community 145 - "20260929231952_guest_consultations_stage1.sql"
Cohesion: 0.47
Nodes (4): idx_guest_consultations_tenant, public.guest_consultations, public.guest_name_aliases, public.guest_person_key()

### Community 147 - "public.blocked_clients"
Cohesion: 0.70
Nodes (4): blocked_clients_email_idx, blocked_clients_phone_idx, blocked_clients_tenant_id_idx, public.blocked_clients

### Community 148 - "20260703195943_ensure_tenant_owner_role_and_tenant_row.sql"
Cohesion: 0.60
Nodes (4): on_profile_tenant_set, on_tenant_created, public.handle_profile_tenant_set(), public.handle_tenant_created()

### Community 151 - "20260913033541_recalculate_consistency_on_booking_changes.sql"
Cohesion: 0.83
Nodes (3): public.trigger_recalculate_consistency(), trigger_consistency_status_after_insert, trigger_consistency_status_after_relevant_update

## Knowledge Gaps
- **189 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminSharedUI.tsx`, `@tanstack/react-query`, `vitest`, `package.json`, `Feature Flag Admin Panels`, `AdminBilling.tsx`, `SAAuditLog.tsx`, `App Routing`, `supabase`, `AdminConsistencyPricing.tsx`, `Demo.tsx`, `Billing Provider Configuration`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `hooks/use-toast.ts`, `Demo Dashboard Views`, `tokens.ts`, `usePublicBusinessConfig.ts`, `Admin Bookings Management`, `AdminCalendar.tsx`, `dependencies`, `ReviewStep.tsx`, `RevenueTrendCard.tsx`, `AdminSettings.tsx`, `Staff Availability Management`, `BrandIcons.tsx`, `AdminHelp.tsx`, `Booking Details & Consultation Form`, `cn`, `Super Admin Revenue`, `Business Theme Provider`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `bookingData.ts`, `LoyaltyClientCard.tsx`, `Demo.tsx`, `Booking Schedule & Availability`, `AdminMetricExplanation.tsx`, `lucide-react`, `AdminConsultations.tsx`, `client.ts`, `Resources.tsx`, `types.ts`, `Login & Marketing Layout`, `Pricing.tsx`, `PayShap Payment Queue`, `Tenant Health Scoring`, `AdminServices.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `Book.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `useSupabaseDashboard.ts`, `AdminSidebar.tsx`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `sheet.tsx`, `toast.tsx`, `TenantContext.tsx`, `AdminRecommendations.tsx`, `DemoAdminEmbed.tsx`, `Super Admin User Management`, `calendar.tsx`, `AdminSpecialOccasions.tsx`, `ConsultationFormBuilder.tsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `AdminSharedUI.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14919354838709678 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `AdminSharedUI.tsx`, `@tanstack/react-query`, `vitest`, `package.json`, `Feature Flag Admin Panels`, `AdminBilling.tsx`, `SAAuditLog.tsx`, `AdminConsistencyPricing.tsx`, `supabase`, `App Routing`, `Demo.tsx`, `Billing Provider Configuration`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `Demo Dashboard Views`, `usePublicBusinessConfig.ts`, `Admin Bookings Management`, `AdminCalendar.tsx`, `dependencies`, `ReviewStep.tsx`, `RevenueTrendCard.tsx`, `AdminSettings.tsx`, `Staff Availability Management`, `AdminHelp.tsx`, `Booking Details & Consultation Form`, `cn`, `BusinessHealthSection.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `bookingData.ts`, `LoyaltyClientCard.tsx`, `DashboardPreview.tsx`, `Demo.tsx`, `Booking Schedule & Availability`, `AdminMetricExplanation.tsx`, `AdminConsultations.tsx`, `client.ts`, `Resources.tsx`, `types.ts`, `Login & Marketing Layout`, `Pricing.tsx`, `PayShap Payment Queue`, `Tenant Health Scoring`, `AdminServices.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `AdminSidebar.tsx`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `sheet.tsx`, `toast.tsx`, `TenantContext.tsx`, `AdminRecommendations.tsx`, `DemoAdminEmbed.tsx`, `Super Admin User Management`, `calendar.tsx`, `display-cards.tsx`, `AdminSpecialOccasions.tsx`, `ConsultationFormBuilder.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `20260308214728_abe41b98-2217-4182-8511-10a994985858.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `supabase` to `AdminSharedUI.tsx`, `@tanstack/react-query`, `Feature Flag Admin Panels`, `SAAuditLog.tsx`, `AdminBilling.tsx`, `useClientAlerts.ts`, `App Routing`, `AdminConsistencyPricing.tsx`, `Billing Provider Configuration`, `Book.tsx`, `Admin Shell & Subscription Gate`, `usePublicBusinessConfig.ts`, `Admin Bookings Management`, `AdminCalendar.tsx`, `ReviewStep.tsx`, `AdminSettings.tsx`, `Staff Availability Management`, `Booking Details & Consultation Form`, `Super Admin Revenue`, `Business Theme Provider`, `useNextyInsights.ts`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `LoyaltyClientCard.tsx`, `Booking Schedule & Availability`, `lucide-react`, `AdminConsultations.tsx`, `client.ts`, `types.ts`, `Login & Marketing Layout`, `Pricing.tsx`, `PayShap Payment Queue`, `Tenant Health Scoring`, `AdminServices.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `useSupabaseDashboard.ts`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `TenantContext.tsx`, `AdminRecommendations.tsx`, `Super Admin User Management`, `AdminSpecialOccasions.tsx`, `ConsultationFormBuilder.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `staff_availability` be split into smaller, more focused modules?**
  _Cohesion score 0.09047619047619047 - nodes in this community are weakly interconnected._
- **Should `public.reschedule_booking` be split into smaller, more focused modules?**
  _Cohesion score 0.12648221343873517 - nodes in this community are weakly interconnected._