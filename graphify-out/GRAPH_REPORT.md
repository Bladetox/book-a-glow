# Graph Report - book-a-glow  (2026-11-07)

## Corpus Check
- 569 files · ~384,901 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 6, (none) 2, .example 1)

## Summary
- 2902 nodes · 6009 edges · 323 communities (130 shown, 193 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23e03429`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminSharedUI.tsx
- 20260308214728_abe41b98-2217-4182-8511-10a994985858.sql
- staff_availability
- public.reschedule_booking
- public.recalculate_consistency_status
- SetupChecklist.tsx
- Feature Flag Admin Panels
- package.json
- tokens.ts
- AdminBilling.tsx
- public.bookings
- Build & Lint Tooling
- profiles
- App Routing
- AdminSharedUI.tsx
- Billing Provider Configuration
- Demo.tsx
- TenantContext.tsx
- Admin.tsx
- SuperAdminShell.tsx
- Admin Dashboard View
- hooks/use-toast.ts
- Demo Dashboard Views
- Index.tsx
- framer-motion
- Admin Bookings Management
- AdminSettings.tsx
- dependencies
- bookings
- ReviewStep.tsx
- RevenueTrendCard.tsx
- Booking Edge Functions
- useTenant
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
- SeoLandingPage.tsx
- public.tenants
- public.bookings
- LoyaltyClientCard.tsx
- Booking Email Notifications
- shadcn Components Config
- lucide-react
- AdminSpecialOccasions.tsx
- app_settings
- Booking Schedule & Availability
- 20260309185554_security_indexes_vault.sql
- ConsultationFormBuilder.tsx
- Node TypeScript Config
- AdminMetricExplanation.tsx
- AdminConsultations.tsx
- FirstBookingCelebration.tsx
- Payment Lifecycle & Indexes
- Vite Build Plugins
- SEO Page Generation
- class-variance-authority
- Pricing.tsx
- public.create_booking_with_consultation
- HeatmapSection.tsx
- Login & Marketing Layout
- public.reschedule_booking
- PayShap Payment Queue
- payments
- Tenant Health Scoring
- SAGrowth.tsx
- usePublicServices.ts
- SASystemHealth.tsx
- Tenant Activation Function
- Tenant Creation Function
- Subdomain Middleware
- LoyaltyBulkBar.tsx
- Cohort Retention Analytics
- Super Admin Tenants
- useSupabaseDashboard.ts
- popover.tsx
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
- react
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
- 20261029202959_restore_call_out_fee.sql
- public.normalize_consistency_booking_client
- usePublicBusinessConfig.ts
- Vercel Deployment Config
- send-billing-receipt/index.ts
- get-or-create-client/_shared/security.ts
- initiate-deposit-checkout/_shared/security.ts
- AdminLogin.tsx
- yoco-balance/_shared/security.ts
- DashboardStockAlerts.tsx
- gcal-backfill/index.ts
- iKhokha Checkout Function
- PayFast Checkout Function
- Google Calendar Event Update
- public.recalculate_consistency_status
- public.services
- broadcast-email/index.ts
- react-day-picker
- ikhokha-webhook/index.ts
- 20260516165820_normalise_booking_phones.sql
- vitest
- next-themes@^0.3.0
- @dnd-kit/utilities
- useClientAlerts.ts
- pdfjs-dist
- notifications
- public.tenants
- input-otp@^1.4.2
- create-calendar-event/index.ts
- platform-billing-checkout/index.ts
- billing_queue
- 20260929231952_guest_consultations_stage1.sql
- platform-billing-webhook/index.ts
- public.blocked_clients
- @radix-ui/react-alert-dialog@^1.1.14
- platform-monthly-billing-test/index.ts
- send-email/index.ts
- public.bookings
- platform-payment-webhook/index.ts
- register-yoco-webhook/index.ts
- reply-to-review/index.ts
- @radix-ui/react-avatar@^1.1.10
- 20260817095419_blocked_email_domains.sql
- embla-carousel-react@^8.6.0
- @radix-ui/react-checkbox@^1.3.2
- @radix-ui/react-hover-card@^1.1.14
- Stale Webhook Event Logging
- vite-env.d.ts
- @radix-ui/react-radio-group@^1.3.7
- @radix-ui/react-separator
- @radix-ui/react-scroll-area@^1.2.9
- @radix-ui/react-toggle-group@^1.1.10
- 20261107034436_internal_cron_secrets.sql
- public.get_available_slots
- react-hook-form@^7.61.1
- tailwindcss-animate@^1.0.7
- recharts
- zod@^3.25.76

## God Nodes (most connected - your core abstractions)
1. `react` - 132 edges
2. `lucide-react` - 109 edges
3. `useTenant()` - 98 edges
4. `supabase` - 89 edges
5. `bookings` - 66 edges
6. `cn()` - 51 edges
7. `framer-motion` - 49 edges
8. `@tanstack/react-query` - 35 edges
9. `profiles` - 35 edges
10. `MarketingRoutes()` - 31 edges

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

## Communities (323 total, 193 thin omitted)

### Community 0 - "AdminSharedUI.tsx"
Cohesion: 0.19
Nodes (23): AdminCommunications(), PREVIEW_DATA, SavedBadge(), buildDefaultWhatsAppMessage(), buildWhatsAppMessage(), clean(), DEFAULT_WHATSAPP_TONE, getWhatsAppTemplateDefault() (+15 more)

### Community 1 - "20260308214728_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.08
Nodes (14): booking_items, idx_booking_items_booking, idx_booking_items_service, public.add_service_to_booking(), public.create_booking(), public.current_tenant_id(), public.get_all_bookings(), public.get_client_history() (+6 more)

### Community 2 - "staff_availability"
Cohesion: 0.09
Nodes (23): idx_staff_availability_date, idx_staff_availability_day, idx_staff_availability_staff, staff_availability, update_staff_availability_updated_at, public.check_availability(), public.get_available_slots(), public.check_availability() (+15 more)

### Community 4 - "public.recalculate_consistency_status"
Cohesion: 0.16
Nodes (5): public.recalculate_consistency_status(), public.trigger_recalculate_consistency_from_booking_item(), trigger_consistency_status_after_booking_item_change, public.service_booking_reference_map(), public.service_booking_reference_map()

### Community 5 - "SetupChecklist.tsx"
Cohesion: 0.21
Nodes (12): ChecklistCelebration(), fireConfetti(), loadConfetti(), Props, GATE_ITEMS, GateItem, GateRow(), GateRowProps (+4 more)

### Community 6 - "Feature Flag Admin Panels"
Cohesion: 0.10
Nodes (37): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+29 more)

### Community 7 - "package.json"
Cohesion: 0.07
Nodes (28): cmdk@^1.1.1, @dnd-kit/sortable@^8.0.0, @hookform/resolvers@^3.10.0, @radix-ui/react-aspect-ratio@^1.1.7, @radix-ui/react-context-menu@^2.2.15, @radix-ui/react-label@^2.1.7, @radix-ui/react-menubar@^1.1.15, @radix-ui/react-select@^2.2.5 (+20 more)

### Community 8 - "tokens.ts"
Cohesion: 0.14
Nodes (18): ChartTooltipProps, CustomTooltip(), DATA, RevenueChart(), C, FONT_BODY, FONT_DISPLAY, RADIUS (+10 more)

### Community 9 - "AdminBilling.tsx"
Cohesion: 0.11
Nodes (27): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+19 more)

### Community 10 - "public.bookings"
Cohesion: 0.09
Nodes (19): public.get_month_availability(), public.check_availability(), public.get_available_slots(), public.replace_staff_availability(), public.replace_staff_availability(), public.save_staff_daily_override(), public.check_availability(), public.check_availability() (+11 more)

### Community 11 - "Build & Lint Tooling"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 12 - "profiles"
Cohesion: 0.05
Nodes (28): idx_profiles_email, idx_profiles_role, profiles, update_profiles_updated_at, update_updated_at_column(), idx_services_active, idx_services_category, services (+20 more)

### Community 13 - "App Routing"
Cohesion: 0.08
Nodes (44): About, Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics (+36 more)

### Community 14 - "AdminSharedUI.tsx"
Cohesion: 0.09
Nodes (30): AdminBlockedClients(), BlockedClientRow, AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow (+22 more)

### Community 15 - "Billing Provider Configuration"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 16 - "Demo.tsx"
Cohesion: 0.29
Nodes (9): DemoDeviceIframe(), NATIVE_WIDTH, DeviceFrameProps, LaptopFrame(), MobileFrame(), DashboardCustomisationCallout(), Demo(), demoContext (+1 more)

### Community 17 - "TenantContext.tsx"
Cohesion: 0.12
Nodes (16): sonner@^1.7.4, sonner, AddServiceModal(), AddServiceModalProps, BookingItem, Service, BlockClientModal(), BlockClientModalProps (+8 more)

### Community 18 - "Admin.tsx"
Cohesion: 0.06
Nodes (61): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+53 more)

### Community 19 - "SuperAdminShell.tsx"
Cohesion: 0.11
Nodes (29): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+21 more)

### Community 20 - "Admin Dashboard View"
Cohesion: 0.11
Nodes (28): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+20 more)

### Community 21 - "hooks/use-toast.ts"
Cohesion: 0.14
Nodes (18): PwaUpdater(), ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+10 more)

### Community 22 - "Demo Dashboard Views"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 23 - "Index.tsx"
Cohesion: 0.10
Nodes (19): CarouselDots(), CaseStudySection(), CTASection(), Eyebrow(), FeaturesSection(), GROUPS, HeroSection(), HomePricingPreview() (+11 more)

### Community 24 - "framer-motion"
Cohesion: 0.15
Nodes (21): framer-motion, ConsultationQRenderer(), DetailsStep(), SplashScreen(), SplashScreenProps, StepIndicator(), StepIndicatorProps, steps (+13 more)

### Community 25 - "Admin Bookings Management"
Cohesion: 0.14
Nodes (24): AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps, DetailRow(), EditField(), filters, FilterType (+16 more)

### Community 26 - "AdminSettings.tsx"
Cohesion: 0.18
Nodes (18): AdminSettings(), Collapsible(), DEPOSIT_PRESETS, isAcquisitionChannel(), LEAD_TIME_PRESETS, MAX_DAYS_PRESETS, MIN_NOTICE_PRESETS, OVERRUN_PRESETS (+10 more)

### Community 27 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, clsx@^2.1.1, date-fns@^3.6.0, @dnd-kit/core@^6.3.1, framer-motion@^12.35.1, @hcaptcha/react-hcaptcha@^1.11.0, lucide-react@^0.462.0, @radix-ui/react-accordion@^1.2.11 (+33 more)

### Community 28 - "bookings"
Cohesion: 0.07
Nodes (31): bookings, idx_bookings_client, idx_bookings_created, idx_bookings_date, idx_bookings_staff, idx_bookings_status, update_bookings_updated_at, public.update_booking_status() (+23 more)

### Community 29 - "ReviewStep.tsx"
Cohesion: 0.12
Nodes (15): friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase, ConsistencyQuote (+7 more)

### Community 30 - "RevenueTrendCard.tsx"
Cohesion: 0.25
Nodes (10): EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS, Props, RevenueTrendCard(), RevenueTrendEntry, Skeleton() (+2 more)

### Community 31 - "Booking Edge Functions"
Cohesion: 0.05
Nodes (17): corsHeaders, corsHeaders, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS (+9 more)

### Community 32 - "useTenant"
Cohesion: 0.15
Nodes (27): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+19 more)

### Community 33 - "Staff Availability Management"
Cohesion: 0.15
Nodes (23): AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AVAILABILITY_SELECT, AvailabilitySlot, DailyOverrides (+15 more)

### Community 34 - "public.profiles"
Cohesion: 0.10
Nodes (15): public.handle_new_user(), idx_booking_items_booking_id, idx_booking_items_tenant_id, idx_profiles_role, idx_profiles_tenant_id, public.get_attach_rate(), get_loyalty_gap_analysis(), public.get_loyalty_gap_analysis() (+7 more)

### Community 35 - "BrandIcons.tsx"
Cohesion: 0.09
Nodes (25): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, AdminSidebarProps, AdminSidebarView(), AdminSidebarViewProps, groupIconMap (+17 more)

### Community 36 - "AdminHelp.tsx"
Cohesion: 0.37
Nodes (12): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+4 more)

### Community 37 - "Booking Details & Consultation Form"
Cohesion: 0.11
Nodes (23): BookingConfirmation(), BookingConfirmationProps, ConsultationQRendererProps, DetailsStepProps, phoneCodes, PlaceSuggestion, validators, BookingState (+15 more)

### Community 38 - "cn"
Cohesion: 0.14
Nodes (18): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DialogContent, DialogContentProps (+10 more)

### Community 39 - "Platform Monthly Billing"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 40 - "BusinessHealthSection.tsx"
Cohesion: 0.24
Nodes (10): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+2 more)

### Community 41 - "Super Admin Revenue"
Cohesion: 0.19
Nodes (21): ChartTooltipProps, CopyLinkButton(), CreateInvoiceModal(), CustomTooltip(), daysUntil(), fmtDate(), GlassCard(), MarkPaidModal() (+13 more)

### Community 42 - "Business Theme Provider"
Cohesion: 0.10
Nodes (30): BookingAppPreview(), Category, isDemoAvailable(), S, Screen, Service, STEP_LABELS, STEP_SCREENS (+22 more)

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
Cohesion: 0.18
Nodes (13): Props, SetupChecklistPaymentGate(), TenantPaymentFields, useTenantPaymentFields(), getPlanLabel(), getPlanPaymentFocus(), hasCompletedPaymentSetup(), isLifetimeFree() (+5 more)

### Community 49 - "loyaltyHelpers.ts"
Cohesion: 0.09
Nodes (39): AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), LOYALTY_INSIGHT_IDS, PRIORITY_STYLES, SettingCard(), SettingCardProps (+31 more)

### Community 50 - "Tenant Onboarding"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 51 - "SeoLandingPage.tsx"
Cohesion: 0.14
Nodes (13): PageContent, PageData, Section, SeoLandingPage(), usePageSEO(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth() (+5 more)

### Community 52 - "public.tenants"
Cohesion: 0.10
Nodes (12): on_auth_user_created, public.handle_new_user(), idx_mrr_snapshots_month, idx_platform_events_event, idx_platform_events_recorded_at, idx_platform_events_tenant_event, public.mrr_snapshots, public.platform_events (+4 more)

### Community 53 - "public.bookings"
Cohesion: 0.18
Nodes (5): nextslot_private.waive_call_out_fee_atomic(), public.get_month_availability(), public.get_month_availability(), public.reschedule_booking(), public.get_booking_horizon_availability()

### Community 54 - "LoyaltyClientCard.tsx"
Cohesion: 0.19
Nodes (13): AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials(), InlineBirthdayEditor(), InlineClientEditor(), InlineNotesEditor(), InlineStatusEditor() (+5 more)

### Community 55 - "Booking Email Notifications"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 56 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 58 - "lucide-react"
Cohesion: 0.10
Nodes (16): lucide-react, DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices, ACTION_COLOR (+8 more)

### Community 59 - "AdminSpecialOccasions.tsx"
Cohesion: 0.23
Nodes (12): date-fns, AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort(), nextOccurrence() (+4 more)

### Community 60 - "app_settings"
Cohesion: 0.13
Nodes (13): public.get_app_setting(), public.get_month_availability(), public.calculate_booking_price(), public.is_admin(), trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger (+5 more)

### Community 61 - "Booking Schedule & Availability"
Cohesion: 0.21
Nodes (16): getStaffId(), ScheduleStep(), ScheduleStepProps, PublicTenantContext, PublicTenantData, usePublicTenant(), getStaffId(), MonthDateAvailability (+8 more)

### Community 62 - "20260309185554_security_indexes_vault.sql"
Cohesion: 0.09
Nodes (16): idx_bookings_booking_date, idx_bookings_client_id, idx_bookings_date_start, idx_bookings_staff_date, idx_bookings_status, idx_bookings_tenant_id, idx_bookings_yoco_checkout, idx_payments_booking_id (+8 more)

### Community 63 - "ConsultationFormBuilder.tsx"
Cohesion: 0.24
Nodes (11): blankDraft(), BUSINESS_TYPE_LABELS, BUSINESS_TYPES, ConsultationFormBuilder(), ConsultationQuestionRow, DraftQuestion, isQuestionType(), makeLocalKey() (+3 more)

### Community 64 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 65 - "AdminMetricExplanation.tsx"
Cohesion: 0.28
Nodes (6): AdminMetricExplanationLine, AdminMetricExplanationProps, MetricExplanationBody(), ADMIN_MOTION, adminFadeVariants(), AdminIconButton

### Community 66 - "AdminConsultations.tsx"
Cohesion: 0.23
Nodes (14): AdminConsultations(), answeredItems(), changeEntries(), ConsultationAnswerItem, ConsultationChangeEntry, ConsultationJsonFields, ConsultationRow, exportCSV() (+6 more)

### Community 67 - "FirstBookingCelebration.tsx"
Cohesion: 0.53
Nodes (4): fireConfetti(), FirstBookingCelebration(), loadConfetti(), seenKey()

### Community 68 - "Payment Lifecycle & Indexes"
Cohesion: 0.29
Nodes (3): public.cancel_expired_pending_bookings(), payments_ikhokha_transaction_id_uidx, payments_yoco_transaction_id_uidx

### Community 69 - "Vite Build Plugins"
Cohesion: 0.13
Nodes (12): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, vitest@^3.2.4, lovable-tagger, vite (+4 more)

### Community 70 - "SEO Page Generation"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 71 - "class-variance-authority"
Cohesion: 0.32
Nodes (6): class-variance-authority@^0.7.1, class-variance-authority, Label, labelVariants, Toggle, toggleVariants

### Community 72 - "Pricing.tsx"
Cohesion: 0.09
Nodes (38): react-router-dom, PrimaryCTA(), MK, SECTION, MarketingLayout(), SiteFooter(), navLinks, SiteHeader() (+30 more)

### Community 73 - "public.create_booking_with_consultation"
Cohesion: 0.25
Nodes (4): public.acquire_slot_hold(), public.create_booking_with_consultation(), public.reject_payshap_booking(), public.release_failed_gateway_booking()

### Community 74 - "HeatmapSection.tsx"
Cohesion: 0.23
Nodes (12): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+4 more)

### Community 75 - "Login & Marketing Layout"
Cohesion: 0.15
Nodes (15): HOME_STYLES, MarketingLayoutProps, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), LOVABLE_DOMAINS, MAIN_DOMAINS, SUPABASE_ANON_KEY (+7 more)

### Community 77 - "PayShap Payment Queue"
Cohesion: 0.33
Nodes (9): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+1 more)

### Community 78 - "payments"
Cohesion: 0.11
Nodes (17): idx_payments_booking, idx_payments_client, idx_payments_created, idx_payments_status, payments, update_payments_updated_at, idx_payments_gateway, get_returning_clients_count() (+9 more)

### Community 79 - "Tenant Health Scoring"
Cohesion: 0.24
Nodes (11): BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel, SATenantHealth() (+3 more)

### Community 80 - "SAGrowth.tsx"
Cohesion: 0.21
Nodes (13): BookingRaw, BookingStat, ChartTooltipProps, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard(), median() (+5 more)

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

### Community 86 - "LoyaltyBulkBar.tsx"
Cohesion: 0.30
Nodes (11): BulkBarProps, FallbackModal(), LoyaltyBulkBar(), useSequentialWaSend(), LoyaltyClientCardProps, WaButton(), buildWaMessage(), LoyaltyRow (+3 more)

### Community 87 - "Cohort Retention Analytics"
Cohesion: 0.29
Nodes (8): addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow, toYearMonth()

### Community 88 - "Super Admin Tenants"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 89 - "useSupabaseDashboard.ts"
Cohesion: 0.13
Nodes (20): AllTimeBooking, AvailabilityRow, BookingItemRow, buildHeatSlots(), buildTopServices(), CLIENT_TYPE_LABELS, ClientNameFields, DashboardBooking (+12 more)

### Community 90 - "popover.tsx"
Cohesion: 0.50
Nodes (3): @radix-ui/react-popover@^1.1.14, @radix-ui/react-popover, PopoverContent

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
Cohesion: 0.08
Nodes (29): ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader(), Booking, DiagIssue (+21 more)

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

### Community 101 - "react"
Cohesion: 0.08
Nodes (28): react, @tanstack/react-query, FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, parseInvoiceText(), pdfToImages() (+20 more)

### Community 102 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 103 - "AdminRecommendations.tsx"
Cohesion: 0.20
Nodes (15): InsightIcon(), NextyLoyaltyPanel(), useAdminReducedMotion(), AdminNextyOrb(), AdminNextyOrbProps, AdminRecommendations(), getFilterKey(), InsightFilterKey (+7 more)

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
Cohesion: 0.39
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

### Community 113 - "20261029202959_restore_call_out_fee.sql"
Cohesion: 0.33
Nodes (4): public.booking_callout_fee_waivers, public.waive_call_out_fee(), nextslot_private.restore_call_out_fee_atomic(), public.booking_callout_fee_restorations

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

### Community 120 - "AdminLogin.tsx"
Cohesion: 0.50
Nodes (4): AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View

### Community 121 - "yoco-balance/_shared/security.ts"
Cohesion: 0.25
Nodes (5): buildCorsHeaders(), esc(), getSecret(), timingSafeEqual(), verifyWebhookSignature()

### Community 122 - "DashboardStockAlerts.tsx"
Cohesion: 0.40
Nodes (4): DashboardStockAlerts(), DashboardStockAlertsProps, fadeUp, StockAlertItem

### Community 125 - "iKhokha Checkout Function"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 128 - "public.recalculate_consistency_status"
Cohesion: 0.27
Nodes (3): public.replace_consistency_program_services(), public.expire_lapsed_consistency_streaks(), public.recalculate_consistency_status()

### Community 129 - "public.services"
Cohesion: 0.21
Nodes (8): idx_saa_addon_id, idx_saa_service_id, public.service_addon_assignments, unique_service_name_category, public.delete_service_guarded(), public.prevent_archived_service_booking(), services_tenant_archived_idx, trg_prevent_archived_service_booking

### Community 134 - "vitest"
Cohesion: 0.29
Nodes (5): @testing-library/react@^16.0.0, @testing-library/react, HomeJourneyNav(), HomeJourneyNavProps, ITEMS

### Community 137 - "useClientAlerts.ts"
Cohesion: 0.31
Nodes (8): AdminDashboardViewProps, ClientAlertsModalProps, ClientAlerts, InactiveClient, OverdueLoyaltyClient, useClientAlerts(), buildClientIdentityKeys(), ClientIdentityRow

### Community 139 - "notifications"
Cohesion: 0.24
Nodes (8): booking_notification_trigger, notifications, notifications_tenant_id_created_at_idx, notify_on_booking_event(), idx_loyalty_tracker_tenant_id, idx_notifications_tenant_id, idx_payments_tenant_id, idx_profiles_tenant_id

### Community 140 - "public.tenants"
Cohesion: 0.08
Nodes (22): public.get_user_tenant_id(), public.has_role(), public.tenants, public.user_roles, public.is_tenant_admin(), idx_user_roles_tenant_role, idx_user_roles_user_tenant, public.public_tenant_view (+14 more)

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

### Community 151 - "public.bookings"
Cohesion: 0.08
Nodes (21): protect_booking_fields_trigger, public.acquire_slot_hold(), public.get_loyalty_gap_analysis(), public.get_nexty_business_context(), public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_rebooking_rate_analysis(), public.get_revenue_per_minute() (+13 more)

### Community 189 - "public.get_available_slots"
Cohesion: 0.48
Nodes (3): public.acquire_slot_hold(), public.get_available_slots(), public.resize_slot_hold()

## Knowledge Gaps
- **193 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminSharedUI.tsx`, `SetupChecklist.tsx`, `vitest`, `package.json`, `Feature Flag Admin Panels`, `AdminBilling.tsx`, `App Routing`, `AdminSharedUI.tsx`, `Billing Provider Configuration`, `Demo.tsx`, `TenantContext.tsx`, `Admin.tsx`, `SuperAdminShell.tsx`, `Admin Dashboard View`, `hooks/use-toast.ts`, `Demo Dashboard Views`, `Index.tsx`, `framer-motion`, `Admin Bookings Management`, `AdminSettings.tsx`, `dependencies`, `ReviewStep.tsx`, `RevenueTrendCard.tsx`, `useTenant`, `Staff Availability Management`, `BrandIcons.tsx`, `AdminHelp.tsx`, `Booking Details & Consultation Form`, `cn`, `Super Admin Revenue`, `Business Theme Provider`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `SeoLandingPage.tsx`, `LoyaltyClientCard.tsx`, `lucide-react`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `ConsultationFormBuilder.tsx`, `AdminConsultations.tsx`, `FirstBookingCelebration.tsx`, `class-variance-authority`, `Pricing.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `Tenant Health Scoring`, `SAGrowth.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `LoyaltyBulkBar.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `useSupabaseDashboard.ts`, `popover.tsx`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `sheet.tsx`, `toast.tsx`, `AdminRecommendations.tsx`, `DemoAdminEmbed.tsx`, `Super Admin User Management`, `calendar.tsx`, `AdminLogin.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `20260308214728_abe41b98-2217-4182-8511-10a994985858.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `AdminSharedUI.tsx`, `SetupChecklist.tsx`, `vitest`, `package.json`, `Feature Flag Admin Panels`, `AdminBilling.tsx`, `App Routing`, `AdminSharedUI.tsx`, `Billing Provider Configuration`, `Demo.tsx`, `TenantContext.tsx`, `Admin.tsx`, `SuperAdminShell.tsx`, `Admin Dashboard View`, `Demo Dashboard Views`, `framer-motion`, `Admin Bookings Management`, `AdminSettings.tsx`, `dependencies`, `ReviewStep.tsx`, `RevenueTrendCard.tsx`, `useTenant`, `Staff Availability Management`, `BrandIcons.tsx`, `AdminHelp.tsx`, `Booking Details & Consultation Form`, `cn`, `BusinessHealthSection.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `SeoLandingPage.tsx`, `LoyaltyClientCard.tsx`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `ConsultationFormBuilder.tsx`, `AdminMetricExplanation.tsx`, `AdminConsultations.tsx`, `FirstBookingCelebration.tsx`, `Pricing.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `Tenant Health Scoring`, `SAGrowth.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `LoyaltyBulkBar.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `sheet.tsx`, `toast.tsx`, `react`, `AdminRecommendations.tsx`, `DemoAdminEmbed.tsx`, `Super Admin User Management`, `calendar.tsx`, `display-cards.tsx`, `AdminLogin.tsx`, `DashboardStockAlerts.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `staff_availability` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `react` to `AdminSharedUI.tsx`, `SetupChecklist.tsx`, `Feature Flag Admin Panels`, `AdminBilling.tsx`, `useClientAlerts.ts`, `App Routing`, `AdminSharedUI.tsx`, `Billing Provider Configuration`, `TenantContext.tsx`, `Admin.tsx`, `SuperAdminShell.tsx`, `framer-motion`, `Admin Bookings Management`, `AdminSettings.tsx`, `ReviewStep.tsx`, `useTenant`, `Staff Availability Management`, `Booking Details & Consultation Form`, `Super Admin Revenue`, `Business Theme Provider`, `useNextyInsights.ts`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `LoyaltyClientCard.tsx`, `lucide-react`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `ConsultationFormBuilder.tsx`, `AdminConsultations.tsx`, `FirstBookingCelebration.tsx`, `Pricing.tsx`, `Login & Marketing Layout`, `PayShap Payment Queue`, `Tenant Health Scoring`, `SAGrowth.tsx`, `usePublicServices.ts`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `useSupabaseDashboard.ts`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `AdminRecommendations.tsx`, `Super Admin User Management`, `usePublicBusinessConfig.ts`, `AdminLogin.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Feature Flag Admin Panels` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._