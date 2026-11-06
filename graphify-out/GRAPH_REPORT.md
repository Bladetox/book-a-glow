# Graph Report - book-a-glow  (2026-11-06)

## Corpus Check
- 386 files · ~331,499 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 6, (none) 2, .example 1)

## Summary
- 2356 nodes · 5344 edges · 186 communities (111 shown, 75 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c5cc943`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminCommunications.tsx
- 20260308214729_abe41b98-2217-4182-8511-10a994985858.sql
- bookings
- public.staff_availability
- Nexty Insight Analytics RPCs
- SetupChecklist.tsx
- Feature Flag Admin Panels
- dependencies
- react
- Pricing.tsx
- homepage-journey.test.tsx
- Build & Lint Tooling
- Pricing, Loyalty & Tenant Fixes
- App Routing
- public.reschedule_booking
- Billing Provider Configuration
- Pricing.tsx
- @tanstack/react-query
- Admin Shell & Subscription Gate
- Super Admin Navigation
- Admin Dashboard View
- hooks/use-toast.ts
- Demo Dashboard Views
- tokens.ts
- Booking Flow Steps & Splash
- Admin Bookings Management
- Admin Calendar
- package.json
- dialog.tsx
- Booking Review & Payment
- Nexty AI Recommendations
- Booking Edge Functions
- Admin Services Management
- Staff Availability Management
- cn
- Admin Mobile Navigation
- AdminSettings.tsx
- Booking Details & Consultation Form
- DemoAdminEmbed.tsx
- Platform Monthly Billing
- AdminHelp.tsx
- Super Admin Revenue
- Business Theme Provider
- App TypeScript Config
- CI Build Check
- useSupabaseDashboard.ts
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
- types.ts
- DashboardPreview.tsx
- AdminSpecialOccasions.tsx
- app_settings
- Booking Schedule & Availability
- SEO Landing Pages
- Loyalty Client Card
- Node TypeScript Config
- toast.tsx
- AdminConsultations.tsx
- sheet.tsx
- Payment Lifecycle & Indexes
- Vite Build Plugins
- SEO Page Generation
- class-variance-authority
- Public Services & Addons
- calendar.tsx
- Heatmap Dashboard Previews
- Login & Marketing Layout
- SAAuditLog.tsx
- PayShap Payment Queue
- SABroadcast.tsx
- Tenant Health Scoring
- Business Health Metrics
- Book.tsx
- SASystemHealth.tsx
- Tenant Activation Function
- Tenant Creation Function
- Subdomain Middleware
- Revenue Trend Card
- Cohort Retention Analytics
- Super Admin Tenants
- display-cards.tsx
- SAOverview.tsx
- Root TypeScript Config
- cmdk@^1.1.1
- Integrations Guide Panel
- Plan Feature Flags
- Feature Adoption Analytics
- SATroubleshoot.tsx
- Super Admin Bookings
- @radix-ui/react-popover
- @dnd-kit/core
- PayFast ITN Webhook
- @radix-ui/react-accordion@^1.2.11
- NPM Scripts
- public.recalculate_consistency_status
- @radix-ui/react-aspect-ratio@^1.1.7
- Super Admin User Management
- @radix-ui/react-menubar@^1.1.15
- public.slot_holds
- @radix-ui/react-navigation-menu@^1.2.13
- input-otp@^1.4.2
- @radix-ui/react-scroll-area@^1.2.9
- Call-Out Fee Waivers
- Allowed Install Scripts
- @radix-ui/react-switch@^1.2.5
- Tenant Theme Reseeding
- Guest Consultations Schema
- Vercel Deployment Config
- Blocked Clients Table
- @radix-ui/react-toggle-group@^1.1.10
- public.update_loyalty_tracker
- @radix-ui/react-label
- @radix-ui/react-radio-group@^1.3.7
- Google Calendar Backfill
- Google Calendar OAuth Callback
- iKhokha Checkout Function
- PayFast Checkout Function
- Google Calendar Event Update
- Booking Phone Normalization
- public.bookings
- recharts
- tailwindcss-animate@^1.0.7
- vaul@^0.9.9
- Broadcast Email Function
- iKhokha Webhook Handler
- PayFast Checkout Creation
- Blocked Email Domains
- pdfjs-dist
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
- `SheetFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts
- `DialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dialog.tsx → src/lib/utils.ts
- `SheetDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts
- `SheetTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (186 total, 75 thin omitted)

### Community 0 - "AdminCommunications.tsx"
Cohesion: 0.20
Nodes (22): AdminCommunications(), PREVIEW_DATA, buildDefaultWhatsAppMessage(), buildWhatsAppMessage(), clean(), DEFAULT_WHATSAPP_TONE, getWhatsAppTemplateDefault(), MessageData (+14 more)

### Community 1 - "20260308214729_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.08
Nodes (11): public.add_service_to_booking(), public.calculate_booking_price(), public.create_booking(), public.create_booking_with_consultation(), public.get_all_bookings(), public.get_client_history(), public.get_loyalty_tracker(), public.get_returning_clients_count() (+3 more)

### Community 2 - "bookings"
Cohesion: 0.15
Nodes (13): public.check_availability(), public.get_available_slots(), public.reschedule_booking(), public.check_availability(), public.get_available_slots(), public.get_month_availability(), public.get_month_availability(), public.get_month_availability() (+5 more)

### Community 3 - "public.staff_availability"
Cohesion: 0.11
Nodes (13): public.sync_tenant_business_name(), trg_sync_business_name, public.get_available_slots(), public.replace_staff_availability(), public.replace_staff_availability(), public.get_month_availability(), public.check_availability(), public.get_available_slots() (+5 more)

### Community 4 - "Nexty Insight Analytics RPCs"
Cohesion: 0.09
Nodes (10): public.delete_service_guarded(), public.prevent_archived_service_booking(), services_tenant_archived_idx, public.replace_consistency_program_services(), public.service_booking_reference_map(), public.service_booking_reference_map(), public.expire_lapsed_consistency_streaks(), public.recalculate_consistency_status() (+2 more)

### Community 5 - "SetupChecklist.tsx"
Cohesion: 0.20
Nodes (13): ChecklistCelebration(), fireConfetti(), loadConfetti(), Props, GATE_ITEMS, GateItem, GateRow(), GateRowProps (+5 more)

### Community 6 - "Feature Flag Admin Panels"
Cohesion: 0.05
Nodes (67): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+59 more)

### Community 7 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, date-fns@^3.6.0, @dnd-kit/sortable@^8.0.0, @dnd-kit/utilities@^3.2.2, embla-carousel-react@^8.6.0, framer-motion@^12.35.1, @hookform/resolvers@^3.10.0, lucide-react@^0.462.0 (+36 more)

### Community 8 - "react"
Cohesion: 0.06
Nodes (40): lucide-react, react, AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View, InsightFilterKey, PRIORITY_STYLES (+32 more)

### Community 9 - "Pricing.tsx"
Cohesion: 0.14
Nodes (15): CellValue(), comparisonSections, faqs, FeatureRow, FeatureSection, planKeyMap, planLabelMap, planRank (+7 more)

### Community 10 - "homepage-journey.test.tsx"
Cohesion: 0.22
Nodes (7): @testing-library/react@^16.0.0, vitest@^3.2.4, @testing-library/react, vitest, HomeJourneyNav(), HomeJourneyNavProps, ITEMS

### Community 11 - "Build & Lint Tooling"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 12 - "Pricing, Loyalty & Tenant Fixes"
Cohesion: 0.10
Nodes (17): public.current_tenant_id(), public.is_admin(), public.update_loyalty_tracker(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation(), public.create_booking_with_consultation() (+9 more)

### Community 13 - "App Routing"
Cohesion: 0.07
Nodes (43): About, Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics (+35 more)

### Community 14 - "public.reschedule_booking"
Cohesion: 0.26
Nodes (5): public.get_month_availability(), public.get_month_availability(), public.get_available_slots(), public.get_available_slots(), public.reschedule_booking()

### Community 15 - "Billing Provider Configuration"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 16 - "Pricing.tsx"
Cohesion: 0.09
Nodes (41): react-router-dom, PrimaryCTA(), MK, SECTION, BookingAppPreview(), DemoDeviceIframe(), NATIVE_WIDTH, DeviceFrameProps (+33 more)

### Community 17 - "@tanstack/react-query"
Cohesion: 0.08
Nodes (39): sonner, @tanstack/react-query, AdminBlockedClients(), BlockedClientRow, AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions (+31 more)

### Community 18 - "Admin Shell & Subscription Gate"
Cohesion: 0.07
Nodes (40): AvailabilityRow, CalendarBooking, CalendarView, DRAWER_SPRING, fmt, paymentLabel, AdminDashboard(), AdminMobileNav() (+32 more)

### Community 19 - "Super Admin Navigation"
Cohesion: 0.13
Nodes (26): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+18 more)

### Community 20 - "Admin Dashboard View"
Cohesion: 0.10
Nodes (27): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+19 more)

### Community 21 - "hooks/use-toast.ts"
Cohesion: 0.16
Nodes (16): PwaUpdater(), Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners (+8 more)

### Community 22 - "Demo Dashboard Views"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 23 - "tokens.ts"
Cohesion: 0.09
Nodes (27): CarouselDots(), CaseStudySection(), CTASection(), Eyebrow(), FeaturesSection(), GROUPS, HeroSection(), HomePricingPreview() (+19 more)

### Community 24 - "Booking Flow Steps & Splash"
Cohesion: 0.21
Nodes (11): SplashScreen(), SplashScreenProps, ThemeToggle(), useBusinessTheme(), useBrandFont(), defaults, PublicBusinessConfig, usePublicBusinessConfig() (+3 more)

### Community 25 - "Admin Bookings Management"
Cohesion: 0.10
Nodes (34): AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps (+26 more)

### Community 26 - "Admin Calendar"
Cohesion: 0.17
Nodes (22): addDays(), AdminCalendar(), clientEmail(), clientName(), clientPhone(), DetailDrawer(), getPaymentStatus(), isSameDay() (+14 more)

### Community 27 - "package.json"
Cohesion: 0.06
Nodes (30): clsx@^2.1.1, @hcaptcha/react-hcaptcha@^1.11.0, next-themes@^0.3.0, @radix-ui/react-avatar@^1.1.10, @radix-ui/react-collapsible@^1.1.11, @radix-ui/react-dropdown-menu@^2.1.15, @radix-ui/react-hover-card@^1.1.14, @radix-ui/react-progress@^1.1.7 (+22 more)

### Community 28 - "dialog.tsx"
Cohesion: 0.33
Nodes (6): @radix-ui/react-dialog@^1.1.14, @radix-ui/react-dialog, DialogContent, DialogContentProps, DialogFooter(), DialogOverlay

### Community 29 - "Booking Review & Payment"
Cohesion: 0.12
Nodes (15): friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase, useConsistencyQuote() (+7 more)

### Community 30 - "Nexty AI Recommendations"
Cohesion: 0.08
Nodes (37): AdminLoyaltyProps, FloatingSaveBar(), InsightIcon(), LOYALTY_INSIGHT_IDS, NextyLoyaltyPanel(), PRIORITY_STYLES, SettingCard(), SettingCardProps (+29 more)

### Community 31 - "Booking Edge Functions"
Cohesion: 0.07
Nodes (12): corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders (+4 more)

### Community 32 - "Admin Services Management"
Cohesion: 0.19
Nodes (21): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+13 more)

### Community 33 - "Staff Availability Management"
Cohesion: 0.15
Nodes (23): AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AVAILABILITY_SELECT, AvailabilitySlot, DailyOverrides (+15 more)

### Community 34 - "cn"
Cohesion: 0.26
Nodes (10): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Separator (+2 more)

### Community 35 - "Admin Mobile Navigation"
Cohesion: 0.08
Nodes (28): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, AdminSidebarProps, AdminSidebarView(), AdminSidebarViewProps, groupIconMap (+20 more)

### Community 36 - "AdminSettings.tsx"
Cohesion: 0.08
Nodes (38): AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow, UnavailableService (+30 more)

### Community 37 - "Booking Details & Consultation Form"
Cohesion: 0.19
Nodes (13): ConsultationQRendererProps, phoneCodes, PlaceSuggestion, validators, ConsultationAnswerValue, BusinessType, ConsultationQuestionDefinition, DEFAULT_SECTION_LABEL (+5 more)

### Community 38 - "DemoAdminEmbed.tsx"
Cohesion: 0.18
Nodes (12): buildTrend(), DashboardData, DEMO_DASHBOARD_DATA, DEMO_INACTIVE_CLIENTS, DEMO_OVERDUE_CLIENTS, HEAT, seeded(), SLOTS (+4 more)

### Community 39 - "Platform Monthly Billing"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 40 - "AdminHelp.tsx"
Cohesion: 0.35
Nodes (13): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+5 more)

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

### Community 45 - "useSupabaseDashboard.ts"
Cohesion: 0.16
Nodes (18): AdminDashboardViewProps, ClientAlertsModalProps, ClientAlerts, InactiveClient, OverdueLoyaltyClient, useClientAlerts(), buildHeatSlots(), buildTopServices() (+10 more)

### Community 46 - "ClientAlertsModal.tsx"
Cohesion: 0.27
Nodes (11): alertCardLayoutId(), BirthdayClient, ClientAlertsModal(), daysUntilOccasion(), EmptyState(), formatDate(), formatOccasionDate(), SPRING (+3 more)

### Community 47 - "Admin Integrations"
Cohesion: 0.12
Nodes (24): framer-motion, AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps (+16 more)

### Community 48 - "Payment Setup Checklist"
Cohesion: 0.17
Nodes (14): Props, SetupChecklistPaymentGate(), TenantPaymentFields, useTenantPaymentFields(), useUpsertAppSetting(), getPlanLabel(), getPlanPaymentFocus(), hasCompletedPaymentSetup() (+6 more)

### Community 49 - "loyaltyHelpers.ts"
Cohesion: 0.12
Nodes (27): date-fns, AdminLoyalty(), CandidatesBar(), ENROLL_STEPS, EnrollModal(), EnrollSuccessCelebration(), effectiveStatus(), excelToDate() (+19 more)

### Community 50 - "Tenant Onboarding"
Cohesion: 0.14
Nodes (18): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, buildAdminUrl(), availabilityPresets, BLANK_SERVICE, clearPendingPayload() (+10 more)

### Community 51 - "Edge Function Deployment"
Cohesion: 0.11
Nodes (17): runs-on, steps, SUPABASE_ACCESS_TOKEN, jobs, deploy, name, on, push (+9 more)

### Community 52 - "Roles & Tenant Auth Schema"
Cohesion: 0.14
Nodes (10): public.get_user_tenant_id(), public.has_role(), public.tenants, public.user_roles, public.is_tenant_admin(), idx_consultation_questions_tenant_id, public.consultation_questions, public.set_consultation_questions_updated_at() (+2 more)

### Community 53 - "bookingData.ts"
Cohesion: 0.21
Nodes (10): BookingConfirmation(), BookingConfirmationProps, DetailsStepProps, BookingState, Category, ConsultationQuestionSnapshot, initialBookingState, safetyQuestions (+2 more)

### Community 54 - "SAGrowth.tsx"
Cohesion: 0.23
Nodes (12): BookingRaw, BookingStat, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard(), median(), MONTHS (+4 more)

### Community 55 - "Booking Email Notifications"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 56 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 57 - "types.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 58 - "DashboardPreview.tsx"
Cohesion: 0.25
Nodes (6): DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices

### Community 59 - "AdminSpecialOccasions.tsx"
Cohesion: 0.16
Nodes (20): AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort(), nextOccurrence(), OccasionCard() (+12 more)

### Community 60 - "app_settings"
Cohesion: 0.17
Nodes (7): public.get_app_setting(), public.get_month_availability(), public.calculate_booking_price(), public.is_admin(), public.calculate_booking_price(), public.check_availability(), public.reschedule_booking()

### Community 61 - "Booking Schedule & Availability"
Cohesion: 0.30
Nodes (12): getStaffId(), ScheduleStep(), PublicTenantContext, PublicTenantData, usePublicTenant(), getStaffId(), MonthDateAvailability, resolveStaffId() (+4 more)

### Community 62 - "SEO Landing Pages"
Cohesion: 0.14
Nodes (13): PageContent, PageData, Section, SeoLandingPage(), usePageSEO(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth() (+5 more)

### Community 63 - "Loyalty Client Card"
Cohesion: 0.22
Nodes (13): AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials(), InlineBirthdayEditor(), InlineClientEditor(), InlineNotesEditor(), InlineStatusEditor() (+5 more)

### Community 64 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 65 - "toast.tsx"
Cohesion: 0.29
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 66 - "AdminConsultations.tsx"
Cohesion: 0.44
Nodes (9): AdminConsultations(), answeredItems(), changeEntries(), exportCSV(), filters, fmtTime(), formatAnswer(), getLeadSourceConfig() (+1 more)

### Community 67 - "sheet.tsx"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 68 - "Payment Lifecycle & Indexes"
Cohesion: 0.12
Nodes (11): idx_booking_items_booking_id, idx_bookings_tenant_date_time, idx_bookings_tenant_status, idx_payments_booking_id, idx_payments_tenant_id, public.acquire_slot_hold(), public.reject_payshap_booking(), public.release_failed_gateway_booking() (+3 more)

### Community 69 - "Vite Build Plugins"
Cohesion: 0.15
Nodes (10): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, lovable-tagger, vite, vite-plugin-pwa (+2 more)

### Community 70 - "SEO Page Generation"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 71 - "class-variance-authority"
Cohesion: 0.32
Nodes (6): class-variance-authority@^0.7.1, class-variance-authority, Label, labelVariants, Toggle, toggleVariants

### Community 72 - "Public Services & Addons"
Cohesion: 0.23
Nodes (11): ServicesStep(), ServicesStepProps, StickyBottomBar(), StickyBottomBarProps, categoryLabel(), PublicService, ServiceCategory, usePublicCategories() (+3 more)

### Community 73 - "calendar.tsx"
Cohesion: 0.43
Nodes (5): Button, ButtonProps, buttonVariants, Calendar(), CalendarProps

### Community 74 - "Heatmap Dashboard Previews"
Cohesion: 0.21
Nodes (13): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+5 more)

### Community 75 - "Login & Marketing Layout"
Cohesion: 0.13
Nodes (17): HOME_STYLES, MarketingLayoutProps, edgeFunctionHeaders(), edgeFunctionUrl(), getTenantSlug(), isCustomDomainHost(), LOVABLE_DOMAINS, MAIN_DOMAINS (+9 more)

### Community 76 - "SAAuditLog.tsx"
Cohesion: 0.40
Nodes (5): ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog()

### Community 77 - "PayShap Payment Queue"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 78 - "SABroadcast.tsx"
Cohesion: 0.33
Nodes (4): Broadcast, BROADCAST_TYPES, BType, TYPE_COLOR

### Community 79 - "Tenant Health Scoring"
Cohesion: 0.24
Nodes (11): BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel, SATenantHealth() (+3 more)

### Community 80 - "Business Health Metrics"
Cohesion: 0.21
Nodes (11): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+3 more)

### Community 81 - "Book.tsx"
Cohesion: 0.16
Nodes (15): ConsultationQRenderer(), DetailsStep(), ScheduleStepProps, StepIndicator(), StepIndicatorProps, steps, getSessionToken(), SlotHoldState (+7 more)

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

### Community 86 - "Revenue Trend Card"
Cohesion: 0.14
Nodes (17): AdminMetricExplanation(), AdminMetricExplanationLine, AdminMetricExplanationProps, AdminIconButton, EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS (+9 more)

### Community 87 - "Cohort Retention Analytics"
Cohesion: 0.29
Nodes (8): addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow, toYearMonth()

### Community 88 - "Super Admin Tenants"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 89 - "display-cards.tsx"
Cohesion: 0.50
Nodes (4): DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 90 - "SAOverview.tsx"
Cohesion: 0.67
Nodes (3): GlassCard(), SAOverview(), Stats

### Community 91 - "Root TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

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
Cohesion: 0.29
Nodes (6): DATE_RANGES, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

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

### Community 107 - "public.slot_holds"
Cohesion: 0.13
Nodes (7): idx_slot_holds_lookup, public.slot_holds, acquire_slot_hold(), public.get_month_availability(), public.get_booking_horizon_availability(), public.acquire_slot_hold(), public.resize_slot_hold()

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

### Community 120 - "public.update_loyalty_tracker"
Cohesion: 0.17
Nodes (5): public.get_loyalty_gap_analysis(), loyalty_tracker_tenant_phone_unique, public.update_loyalty_tracker(), public.normalize_consistency_booking_client(), trg_normalize_consistency_booking_client

### Community 125 - "iKhokha Checkout Function"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 129 - "public.bookings"
Cohesion: 0.11
Nodes (14): protect_booking_fields_trigger, public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_revenue_per_minute(), public.get_service_co_booking_patterns(), public.trigger_recalculate_consistency(), trigger_consistency_status_after_insert, trigger_consistency_status_after_relevant_update (+6 more)

## Knowledge Gaps
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminCommunications.tsx`, `SetupChecklist.tsx`, `Feature Flag Admin Panels`, `dependencies`, `Pricing.tsx`, `homepage-journey.test.tsx`, `App Routing`, `Billing Provider Configuration`, `Pricing.tsx`, `@tanstack/react-query`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `hooks/use-toast.ts`, `Demo Dashboard Views`, `tokens.ts`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `package.json`, `dialog.tsx`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `cn`, `Admin Mobile Navigation`, `AdminSettings.tsx`, `Booking Details & Consultation Form`, `DemoAdminEmbed.tsx`, `AdminHelp.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `useSupabaseDashboard.ts`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `bookingData.ts`, `SAGrowth.tsx`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `SEO Landing Pages`, `Loyalty Client Card`, `toast.tsx`, `AdminConsultations.tsx`, `sheet.tsx`, `class-variance-authority`, `Public Services & Addons`, `calendar.tsx`, `Login & Marketing Layout`, `SAAuditLog.tsx`, `PayShap Payment Queue`, `SABroadcast.tsx`, `Tenant Health Scoring`, `Book.tsx`, `SASystemHealth.tsx`, `Revenue Trend Card`, `Cohort Retention Analytics`, `Super Admin Tenants`, `SAOverview.tsx`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `Super Admin User Management`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Should `20260308214729_abe41b98-2217-4182-8511-10a994985858.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.082010582010582 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `AdminCommunications.tsx`, `SetupChecklist.tsx`, `Feature Flag Admin Panels`, `dependencies`, `Pricing.tsx`, `homepage-journey.test.tsx`, `App Routing`, `Billing Provider Configuration`, `Pricing.tsx`, `@tanstack/react-query`, `Admin Shell & Subscription Gate`, `Super Admin Navigation`, `Admin Dashboard View`, `Demo Dashboard Views`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `package.json`, `dialog.tsx`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `Admin Mobile Navigation`, `AdminSettings.tsx`, `Booking Details & Consultation Form`, `DemoAdminEmbed.tsx`, `AdminHelp.tsx`, `Super Admin Revenue`, `Business Theme Provider`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `bookingData.ts`, `SAGrowth.tsx`, `DashboardPreview.tsx`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `SEO Landing Pages`, `Loyalty Client Card`, `toast.tsx`, `AdminConsultations.tsx`, `sheet.tsx`, `Public Services & Addons`, `calendar.tsx`, `Login & Marketing Layout`, `SAAuditLog.tsx`, `PayShap Payment Queue`, `SABroadcast.tsx`, `Tenant Health Scoring`, `Business Health Metrics`, `SASystemHealth.tsx`, `Revenue Trend Card`, `Cohort Retention Analytics`, `Super Admin Tenants`, `display-cards.tsx`, `SAOverview.tsx`, `Integrations Guide Panel`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `Super Admin User Management`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Should `bookings` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `react` to `AdminCommunications.tsx`, `SetupChecklist.tsx`, `Feature Flag Admin Panels`, `Pricing.tsx`, `App Routing`, `Billing Provider Configuration`, `@tanstack/react-query`, `Admin Shell & Subscription Gate`, `Booking Flow Steps & Splash`, `Admin Bookings Management`, `Booking Review & Payment`, `Nexty AI Recommendations`, `Admin Services Management`, `Staff Availability Management`, `AdminSettings.tsx`, `Booking Details & Consultation Form`, `Super Admin Revenue`, `Business Theme Provider`, `useSupabaseDashboard.ts`, `ClientAlertsModal.tsx`, `Admin Integrations`, `Payment Setup Checklist`, `loyaltyHelpers.ts`, `Tenant Onboarding`, `SAGrowth.tsx`, `AdminSpecialOccasions.tsx`, `Booking Schedule & Availability`, `Loyalty Client Card`, `AdminConsultations.tsx`, `Public Services & Addons`, `Login & Marketing Layout`, `SAAuditLog.tsx`, `PayShap Payment Queue`, `SABroadcast.tsx`, `Tenant Health Scoring`, `Book.tsx`, `SASystemHealth.tsx`, `Cohort Retention Analytics`, `Super Admin Tenants`, `SAOverview.tsx`, `Feature Adoption Analytics`, `SATroubleshoot.tsx`, `Super Admin Bookings`, `Super Admin User Management`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `public.staff_availability` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._
- **Should `Nexty Insight Analytics RPCs` be split into smaller, more focused modules?**
  _Cohesion score 0.09359605911330049 - nodes in this community are weakly interconnected._