# Graph Report - book-a-glow  (2026-11-14)

## Corpus Check
- 583 files · ~388,178 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 6, (none) 2, .example 1)

## Summary
- 3037 nodes · 6106 edges · 315 communities (145 shown, 170 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86dedcc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminCalendar.tsx
- AdminStock.tsx
- lucide-react
- ClientAlertsModal.tsx
- ref_https
- AdminSidebar.tsx
- feature-flags/SAFeatureFlags.tsx
- useTenant
- dependencies
- devDependencies
- App.tsx
- useTenant
- FeaturesSection.tsx
- Pricing.tsx
- useNextyInsights.ts
- Admin.tsx
- usePublicTenant
- usePayshapPayments.ts
- AdminDashboard.tsx
- package.json
- DashboardViews.tsx
- AdminSettings.tsx
- SuperAdminShell.tsx
- ReviewStep.tsx
- AdminCommunications.tsx
- AdminMetricExplanation.tsx
- AdminBilling.tsx
- tokens.ts
- Resources.tsx
- platform-monthly-billing/index.ts
- bookings
- SARevenue.tsx
- BusinessThemeProvider.tsx
- compilerOptions
- Implementation phases
- NextSlot Growth & Direction Roadmap
- steps
- useSupabaseDashboard.ts
- DetailsStep.tsx
- Phase 1: NextSlot Marketing Website Baseline Audit
- AdminIntegrations.tsx
- Onboarding.tsx
- use-admin-viewport.ts
- send-billing-receipt/index.ts
- public.bookings
- use-toast.ts
- send-booking-email/index.ts
- components.json
- Homepage Journey Interaction Map
- AdminHelp.tsx
- Book.tsx
- SeoLandingPage.tsx
- vitest
- AdminConsultations.tsx
- react
- Login.tsx
- compilerOptions
- LoyaltyBulkBar.tsx
- generate-seo-pages.mjs
- staff_availability
- public.staff_availability
- framer-motion
- AdminRecommendations.tsx
- cn
- dialog.tsx
- functions/_shared/security.ts
- Video call service — Full Build Scope & Blast-Radius Review
- toast.tsx
- SATenantHealth.tsx
- activate-tenant/index.ts
- create-tenant/index.ts
- middleware.ts
- NotificationBell.tsx
- RevenueTrendCard.tsx
- SATenants.tsx
- PUBLIC
- get-or-create-client/_shared/security.ts
- initiate-deposit-checkout/_shared/security.ts
- yoco-balance/_shared/security.ts
- compilerOptions
- Book-a-Glow: Debugging Session — 11 March 2026
- 20260308214728_abe41b98-2217-4182-8511-10a994985858.sql
- AdminAvailability.tsx
- loyalty_tracker
- public.user_roles
- planFeatureMap.ts
- SACohortRetention.tsx
- @tanstack/react-query
- SABookings.tsx
- SAFeatureAdoption.tsx
- LoyaltyClientCard.tsx
- tenants
- payfast-itn/index.ts
- Call-out fee waiver
- loyaltyHelpers.ts
- SAGrowth.tsx
- public.profiles
- Index.tsx
- scripts
- sheet.tsx
- loyaltyHelpers.ts
- utils.ts
- create-calendar-event/index.ts
- types.ts
- types.ts
- update-gcal-event/index.ts
- 4. Bug #2: protect_booking_financial_fields Trigger
- 7. Bug #5: RLS Policies Not Bound to service_role
- allowScripts
- lucide-react
- useFeatureFlags.ts
- services
- platform-billing-checkout/index.ts
- vercel.json
- Working rules for this repository
- 10. Yoco API Reference Notes
- 3. Bug #1: Yoco Webhook Signature Verification
- 5. Bug #3: queue_calendar_event Missing tenant_id
- 6. Bug #4: send-booking-email Function Missing
- 8. Bug #6: Address Autocomplete & Distance Calculation
- public.payments
- book-a-glow — NextSlot
- payments
- display-cards.tsx
- public.booking_items
- platform-billing-webhook/index.ts
- 11. Deployment Constraints
- 12. Current State
- 13. Remaining Tasks
- SetupChecklistPaymentGate.tsx
- AdminBilling.tsx
- registry.ts
- 20260524123735_platform_billing_tables.sql
- 20260703195943_ensure_tenant_owner_role_and_tenant_row.sql
- ikhokha-checkout/index.ts
- payfast-checkout/index.ts
- platform-monthly-billing-test/index.ts
- confirm-booking/index.ts
- 20260307083447_009_add_tenant_id_to_missing_tables.sql
- class-variance-authority
- @dnd-kit/utilities
- @hookform/resolvers@^3.10.0
- send-email/index.ts
- @radix-ui/react-accordion@^1.2.11
- platform-payment-webhook/index.ts
- reply-to-review/index.ts
- IntegrationsGuidePanel.tsx
- StockScanModal.tsx
- Function audit (production, 14 November 2026)
- billing_queue
- FirstBookingCelebration.tsx
- @radix-ui/react-avatar@^1.1.10
- notifications
- public.staff_availability
- DashboardPreview.tsx
- @radix-ui/react-separator
- @radix-ui/react-tabs@^1.1.12
- 20261029202959_restore_call_out_fee.sql
- @radix-ui/react-toggle
- public.get_tenant_secret
- recharts
- tailwind-merge
- @dnd-kit/sortable
- vite-env.d.ts
- public.blocked_clients
- register-yoco-webhook/index.ts
- 20260817095419_blocked_email_domains.sql
- staff_availability_unique_slot
- @radix-ui/react-collapsible@^1.1.11
- react-hook-form@^7.61.1
- pending/README.md
- 20261029195844_log_stale_balance_webhook_events.sql
- 20261107034436_internal_cron_secrets.sql
- @radix-ui/react-hover-card@^1.1.14
- @radix-ui/react-navigation-menu@^1.2.13
- react-day-picker

## God Nodes (most connected - your core abstractions)
1. `react` - 127 edges
2. `lucide-react` - 106 edges
3. `useTenant()` - 98 edges
4. `supabase` - 89 edges
5. `bookings` - 65 edges
6. `cn()` - 51 edges
7. `framer-motion` - 49 edges
8. `@tanstack/react-query` - 35 edges
9. `profiles` - 34 edges
10. `public.tenants` - 33 edges

## Surprising Connections (you probably didn't know these)
- `1. Add a homepage-only journey index` --references--> `Pricing()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/pages/Pricing.tsx
- `Secondary Cause: Hardcoded Address` --references--> `usePublicBusinessConfig()`  [INFERRED]
  docs/debugging-session-2026-03-11.md → src/hooks/usePublicBusinessConfig.ts
- `2. Real-world proof arrives late in the homepage sequence` --references--> `CaseStudySection()`  [INFERRED]
  docs/marketing-website-phase-1-audit.md → src/components/home/CaseStudySection.tsx
- `Existing implementation findings` --references--> `SiteFooter()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/site/SiteFooter.tsx
- `Existing implementation findings` --references--> `SiteHeader()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/site/SiteHeader.tsx

## Import Cycles
- None detected.

## Communities (315 total, 170 thin omitted)

### Community 0 - "AdminCalendar.tsx"
Cohesion: 0.16
Nodes (28): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+20 more)

### Community 1 - "AdminStock.tsx"
Cohesion: 0.24
Nodes (9): ActionType, AdminStock(), FormField(), RESTOCK_PILLS, StockItem, StockItemInput, StockScanModal, Tab (+1 more)

### Community 2 - "lucide-react"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 3 - "ClientAlertsModal.tsx"
Cohesion: 0.14
Nodes (23): @tanstack/react-query, AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType, ProactiveAlertBanner() (+15 more)

### Community 4 - "ref_https"
Cohesion: 0.04
Nodes (21): corsHeaders, corsHeaders, corsHeaders, TYPE_LABELS, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders (+13 more)

### Community 5 - "AdminSidebar.tsx"
Cohesion: 0.08
Nodes (28): @radix-ui/react-popover@^1.1.14, @radix-ui/react-popover, AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, AdminSidebarProps, AdminSidebarView() (+20 more)

### Community 6 - "feature-flags/SAFeatureFlags.tsx"
Cohesion: 0.20
Nodes (19): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+11 more)

### Community 7 - "useTenant"
Cohesion: 0.09
Nodes (39): sonner, AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBlockedClients(), BlockedClientRow, AdminBookings() (+31 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, date-fns@^3.6.0, @dnd-kit/core@^6.3.1, framer-motion@^12.35.1, @hcaptcha/react-hcaptcha@^1.11.0, input-otp@^1.4.2, lucide-react@^0.462.0, next-themes@^0.3.0 (+34 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (37): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+29 more)

### Community 10 - "App.tsx"
Cohesion: 0.08
Nodes (41): About, Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics (+33 more)

### Community 11 - "useTenant"
Cohesion: 0.15
Nodes (25): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+17 more)

### Community 12 - "FeaturesSection.tsx"
Cohesion: 0.21
Nodes (13): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+5 more)

### Community 13 - "Pricing.tsx"
Cohesion: 0.11
Nodes (33): react-router-dom, PrimaryCTA(), MarketingLayout(), SiteFooter(), navLinks, SiteHeader(), About(), CaseStudy() (+25 more)

### Community 14 - "useNextyInsights.ts"
Cohesion: 0.09
Nodes (31): AttachRateRow, BasketTrendRow, ChannelRoiRow, DAY_NAMES, dayBefore(), formatRand(), formatRpm(), hourLabel() (+23 more)

### Community 15 - "Admin.tsx"
Cohesion: 0.10
Nodes (28): AdminMobileNav(), ArrearsBanner(), Tenant, TenantSubscription, Admin(), AdminAvailability, AdminBookings, AdminCalendar (+20 more)

### Community 16 - "usePublicTenant"
Cohesion: 0.24
Nodes (15): getStaffId(), ScheduleStep(), ScheduleStepProps, usePublicTenant(), getStaffId(), MonthDateAvailability, resolveStaffId(), todayLocalStr() (+7 more)

### Community 17 - "usePayshapPayments.ts"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.10
Nodes (27): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+19 more)

### Community 19 - "package.json"
Cohesion: 0.06
Nodes (30): clsx@^2.1.1, cmdk@^1.1.1, embla-carousel-react@^8.6.0, @radix-ui/react-aspect-ratio@^1.1.7, @radix-ui/react-checkbox@^1.3.2, @radix-ui/react-menubar@^1.1.15, @radix-ui/react-progress@^1.1.7, @radix-ui/react-radio-group@^1.3.7 (+22 more)

### Community 20 - "DashboardViews.tsx"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 21 - "AdminSettings.tsx"
Cohesion: 0.09
Nodes (33): AdminSettings(), Collapsible(), DEPOSIT_PRESETS, isAcquisitionChannel(), LEAD_TIME_PRESETS, MAX_DAYS_PRESETS, MIN_NOTICE_PRESETS, OVERRUN_PRESETS (+25 more)

### Community 22 - "SuperAdminShell.tsx"
Cohesion: 0.13
Nodes (26): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+18 more)

### Community 23 - "ReviewStep.tsx"
Cohesion: 0.09
Nodes (19): friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase, PublicTenantContext (+11 more)

### Community 24 - "AdminCommunications.tsx"
Cohesion: 0.12
Nodes (35): AdminCommunications(), PREVIEW_DATA, AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort() (+27 more)

### Community 25 - "AdminMetricExplanation.tsx"
Cohesion: 0.21
Nodes (11): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+3 more)

### Community 26 - "AdminBilling.tsx"
Cohesion: 0.18
Nodes (15): CancelSubscriptionFlow(), DATA_RETENTION_DAYS, deletionDateLabel(), Step, buildGuestRows(), csvCell(), download(), exportGuestData() (+7 more)

### Community 27 - "tokens.ts"
Cohesion: 0.16
Nodes (14): ChartTooltipProps, CustomTooltip(), DATA, RevenueChart(), BP, C, FONT_BODY, FONT_DISPLAY (+6 more)

### Community 28 - "Resources.tsx"
Cohesion: 0.10
Nodes (17): @testing-library/react, vitest, HomeJourneyNav(), HomeJourneyNavProps, ITEMS, OnlineBookingSoftware(), Article, articles (+9 more)

### Community 29 - "platform-monthly-billing/index.ts"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 30 - "bookings"
Cohesion: 0.06
Nodes (33): bookings, idx_bookings_client, idx_bookings_created, idx_bookings_date, idx_bookings_staff, idx_bookings_status, update_bookings_updated_at, public.update_booking_status() (+25 more)

### Community 31 - "SARevenue.tsx"
Cohesion: 0.19
Nodes (21): ChartTooltipProps, CopyLinkButton(), CreateInvoiceModal(), CustomTooltip(), daysUntil(), fmtDate(), GlassCard(), MarkPaidModal() (+13 more)

### Community 32 - "BusinessThemeProvider.tsx"
Cohesion: 0.18
Nodes (19): ADMIN_PATH_PREFIXES, BusinessThemeContext, BusinessThemeContextValue, BusinessThemeProvider(), isAdminPath(), BusinessTheme, BusinessThemeColors, businessThemes (+11 more)

### Community 33 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 34 - "Implementation phases"
Cohesion: 0.10
Nodes (20): 1. Help the visitor recognise themselves, 2. Show the working model, not a feature catalogue, 3. Prove it with a real business, 4. Make the price easy to evaluate, 5. Make starting feel like the natural next step, Decision rule, Definition of done, How the whole website should guide the journey (+12 more)

### Community 35 - "NextSlot Growth & Direction Roadmap"
Cohesion: 0.10
Nodes (20): 1. Independent practitioner: run the business, 2. Independent practitioner: understand and grow, 3. Studio: operate a shared space without erasing independence, 4. Longer-term possibility: an independent opportunity network, Communication roadmap: return to this after direction is agreed, Immediate next steps, Measurement framework, NextSlot Growth & Direction Roadmap (+12 more)

### Community 36 - "steps"
Cohesion: 0.10
Nodes (20): name, runs-on, steps, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, jobs, build, name (+12 more)

### Community 37 - "useSupabaseDashboard.ts"
Cohesion: 0.13
Nodes (20): AllTimeBooking, AvailabilityRow, BookingItemRow, buildHeatSlots(), buildTopServices(), CLIENT_TYPE_LABELS, ClientNameFields, DashboardBooking (+12 more)

### Community 38 - "DetailsStep.tsx"
Cohesion: 0.11
Nodes (22): BookingConfirmationProps, ConsultationQRendererProps, DetailsStepProps, phoneCodes, PlaceSuggestion, validators, BookingState, Category (+14 more)

### Community 39 - "Phase 1: NextSlot Marketing Website Baseline Audit"
Cohesion: 0.11
Nodes (18): 1. Homepage does not answer all five questions, 2. Real-world proof arrives late in the homepage sequence, 3. Global navigation terminology differs from the agreed visitor language, 4. The five-question navigation needs a mobile-safe interaction design, 5. Audience breadth could be more explicit, 6. Pricing and trial statements should be consistent across pages, 7. Repeated final CTA patterns deserve a consistency pass, Brand and implementation guardrails (+10 more)

### Community 40 - "AdminIntegrations.tsx"
Cohesion: 0.20
Nodes (21): AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps, isConfigured() (+13 more)

### Community 41 - "Onboarding.tsx"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 42 - "use-admin-viewport.ts"
Cohesion: 0.60
Nodes (3): ADMIN_VIEWPORT_BREAKPOINTS, getAdminViewport(), useAdminViewport()

### Community 43 - "send-billing-receipt/index.ts"
Cohesion: 0.14
Nodes (8): corsHeaders, buildReceiptHtml(), buildSnapshotHtml(), escHtml(), fmtRands(), formatLeadSource(), MonthlySnapshot, PLAN_LABELS

### Community 44 - "public.bookings"
Cohesion: 0.06
Nodes (28): protect_booking_fields_trigger, public.protect_booking_financial_fields(), idx_bookings_booking_date, idx_bookings_client_id, idx_bookings_date_start, idx_bookings_staff_date, idx_bookings_status, idx_bookings_tenant_id (+20 more)

### Community 45 - "use-toast.ts"
Cohesion: 0.16
Nodes (17): ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId() (+9 more)

### Community 46 - "send-booking-email/index.ts"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 47 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 48 - "Homepage Journey Interaction Map"
Cohesion: 0.20
Nodes (9): 1. Add a homepage-only journey index, 2. Make the hero CTA initiate the journey, 4. Use the smallest layout adjustments possible, Acceptance criteria, Agreed experience, Expected file touchpoints, Homepage Journey Interaction Map, Important implementation recommendation (+1 more)

### Community 49 - "AdminHelp.tsx"
Cohesion: 0.09
Nodes (36): AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow, UnavailableService (+28 more)

### Community 50 - "Book.tsx"
Cohesion: 0.17
Nodes (17): ConsultationQRenderer(), DetailsStep(), ServicesStep(), ServicesStepProps, StepIndicator(), StepIndicatorProps, steps, categoryLabel() (+9 more)

### Community 51 - "SeoLandingPage.tsx"
Cohesion: 0.15
Nodes (12): PageContent, PageData, Section, SeoLandingPage(), usePageSEO(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth() (+4 more)

### Community 52 - "vitest"
Cohesion: 0.15
Nodes (10): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, lovable-tagger, vite, vite-plugin-pwa (+2 more)

### Community 53 - "AdminConsultations.tsx"
Cohesion: 0.23
Nodes (14): AdminConsultations(), answeredItems(), changeEntries(), ConsultationAnswerItem, ConsultationChangeEntry, ConsultationJsonFields, ConsultationRow, exportCSV() (+6 more)

### Community 54 - "react"
Cohesion: 0.31
Nodes (6): react, StickyBottomBar(), StickyBottomBarProps, PublicService, isIOS(), useViewportFix()

### Community 55 - "Login.tsx"
Cohesion: 0.15
Nodes (15): HOME_STYLES, MarketingLayoutProps, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), LOVABLE_DOMAINS, MAIN_DOMAINS, SUPABASE_ANON_KEY (+7 more)

### Community 56 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 57 - "LoyaltyBulkBar.tsx"
Cohesion: 0.31
Nodes (10): BulkBarProps, FallbackModal(), LoyaltyBulkBar(), useSequentialWaSend(), LoyaltyClientCardProps, WaButton(), buildWaMessage(), LoyaltyRow (+2 more)

### Community 58 - "generate-seo-pages.mjs"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 59 - "staff_availability"
Cohesion: 0.08
Nodes (23): idx_staff_availability_date, idx_staff_availability_day, idx_staff_availability_staff, staff_availability, update_staff_availability_updated_at, public.check_availability(), public.check_availability(), public.get_available_slots() (+15 more)

### Community 60 - "public.staff_availability"
Cohesion: 0.06
Nodes (31): idx_staff_avail_staff_date, idx_staff_avail_staff_day, public.acquire_slot_hold(), public.get_no_show_leakage(), public.sync_tenant_business_name(), trg_sync_business_name, public.check_availability(), public.get_available_slots() (+23 more)

### Community 61 - "framer-motion"
Cohesion: 0.19
Nodes (13): framer-motion, BookingConfirmation(), SplashScreen(), SplashScreenProps, ThemeToggle(), useBusinessTheme(), useBrandFont(), defaults (+5 more)

### Community 62 - "AdminRecommendations.tsx"
Cohesion: 0.21
Nodes (14): InsightIcon(), NextyLoyaltyPanel(), AdminNextyOrb(), AdminNextyOrbProps, AdminRecommendations(), getFilterKey(), InsightFilterKey, InsightIcon() (+6 more)

### Community 63 - "cn"
Cohesion: 0.24
Nodes (10): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Separator (+2 more)

### Community 64 - "dialog.tsx"
Cohesion: 0.22
Nodes (9): @radix-ui/react-dialog@^1.1.14, @radix-ui/react-dialog, DialogContent, DialogContentProps, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay (+1 more)

### Community 65 - "functions/_shared/security.ts"
Cohesion: 0.19
Nodes (5): VAULT_KEYS, buildCorsHeaders(), json(), timingSafeEqual(), verifyWebhookSignature()

### Community 66 - "Video call service — Full Build Scope & Blast-Radius Review"
Cohesion: 0.06
Nodes (33): 10. Final scope boundary, 11.2 Availability security and compatibility, 11.3 Payment — verified live calculation path, 11.4 Payment — verified UI and provider behaviour, 11.5 Payment — deployed Edge Function and webhook behaviour, 11.6 Confirmed implementation order after the trace, 11.7 Additional acceptance tests from the live trace, 11. Deeper live trace — production database and payment paths (+25 more)

### Community 67 - "toast.tsx"
Cohesion: 0.38
Nodes (8): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster()

### Community 68 - "SATenantHealth.tsx"
Cohesion: 0.24
Nodes (11): BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel, SATenantHealth() (+3 more)

### Community 69 - "activate-tenant/index.ts"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 70 - "create-tenant/index.ts"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 71 - "middleware.ts"
Cohesion: 0.33
Nodes (9): config, esc(), fetchTenant(), MAIN_DOMAINS, middleware(), nextResponse(), patchMetaName(), patchMetaProp() (+1 more)

### Community 72 - "NotificationBell.tsx"
Cohesion: 0.16
Nodes (15): AdminDashboardViewProps, ClientAlertsModalProps, FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, ClientAlerts, InactiveClient (+7 more)

### Community 73 - "RevenueTrendCard.tsx"
Cohesion: 0.25
Nodes (10): EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS, Props, RevenueTrendCard(), RevenueTrendEntry, Skeleton() (+2 more)

### Community 74 - "SATenants.tsx"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 75 - "PUBLIC"
Cohesion: 0.14
Nodes (12): idx_mrr_snapshots_month, idx_platform_events_event, idx_platform_events_recorded_at, idx_platform_events_tenant_event, public.mrr_snapshots, public.platform_events, public.record_mrr_snapshot(), idx_guest_consultations_tenant (+4 more)

### Community 76 - "get-or-create-client/_shared/security.ts"
Cohesion: 0.25
Nodes (5): buildCorsHeaders(), generateSecurePassword(), isValidEmail(), timingSafeEqual(), verifyWebhookSignature()

### Community 77 - "initiate-deposit-checkout/_shared/security.ts"
Cohesion: 0.24
Nodes (4): buildCorsHeaders(), getSecret(), timingSafeEqual(), verifyWebhookSignature()

### Community 78 - "yoco-balance/_shared/security.ts"
Cohesion: 0.25
Nodes (5): buildCorsHeaders(), esc(), getSecret(), timingSafeEqual(), verifyWebhookSignature()

### Community 79 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 80 - "Book-a-Glow: Debugging Session — 11 March 2026"
Cohesion: 0.20
Nodes (9): 1. Initial Symptoms, 2. Root Cause Analysis, 9. Supporting Infrastructure Fixes, Book-a-Glow: Debugging Session — 11 March 2026, Manually Confirmed Stuck Booking, Primary Cause: Webhook Never Successfully Processed, Secondary Cause: Hardcoded Address, Table of Contents (+1 more)

### Community 81 - "20260308214728_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.11
Nodes (10): booking_items, idx_booking_items_booking, idx_booking_items_service, public.get_app_setting(), public.get_available_slots(), public.get_client_history(), public.get_month_availability(), public.get_returning_clients_count() (+2 more)

### Community 82 - "AdminAvailability.tsx"
Cohesion: 0.15
Nodes (24): 11.1 Availability — verified live details, Availability implementation consequences, AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AvailabilitySlot (+16 more)

### Community 83 - "loyalty_tracker"
Cohesion: 0.11
Nodes (15): loyalty_tracker_tenant_email_unique, public.update_loyalty_tracker(), public.update_loyalty_tracker(), consistency_guest_status, consistency_program_services, consistency_programs, public.recalculate_consistency_status(), trigger_consistency_status (+7 more)

### Community 84 - "public.user_roles"
Cohesion: 0.06
Nodes (22): on_auth_user_created, public.handle_new_user(), public.get_user_tenant_id(), public.has_role(), public.tenants, public.user_roles, public.is_tenant_admin(), idx_user_roles_tenant_role (+14 more)

### Community 85 - "planFeatureMap.ts"
Cohesion: 0.20
Nodes (7): ALL_FLAGS, FeatureStatus, flagKeys, PLAN_GROUPS, PlanFeature, PlanGroup, PLATFORM_TENANT_ID

### Community 86 - "SACohortRetention.tsx"
Cohesion: 0.29
Nodes (8): addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow, toYearMonth()

### Community 87 - "@tanstack/react-query"
Cohesion: 0.11
Nodes (20): ChecklistCelebration(), fireConfetti(), loadConfetti(), Props, GATE_ITEMS, GateItem, GateRow(), GateRowProps (+12 more)

### Community 88 - "SABookings.tsx"
Cohesion: 0.25
Nodes (7): DATE_RANGES, FlaggedPayment, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 89 - "SAFeatureAdoption.tsx"
Cohesion: 0.28
Nodes (8): adoptionColor(), avg(), BookingStat, FEATURE_LABELS, FeatureSummary, FeatureUsageRow, SAFeatureAdoption(), TenantRow

### Community 90 - "LoyaltyClientCard.tsx"
Cohesion: 0.13
Nodes (20): AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials(), InlineBirthdayEditor(), InlineClientEditor(), InlineNotesEditor(), InlineStatusEditor() (+12 more)

### Community 91 - "tenants"
Cohesion: 0.12
Nodes (13): public.calculate_booking_price(), public.is_admin(), trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger (+5 more)

### Community 92 - "payfast-itn/index.ts"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 93 - "Call-out fee waiver"
Cohesion: 0.25
Nodes (7): Audit, Call-out fee waiver, Eligibility and safeguards, Financial behaviour, Purpose, Restoration, Security and scope

### Community 94 - "loyaltyHelpers.ts"
Cohesion: 0.13
Nodes (26): date-fns, AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), LOYALTY_INSIGHT_IDS, PRIORITY_STYLES, SettingCard() (+18 more)

### Community 95 - "SAGrowth.tsx"
Cohesion: 0.21
Nodes (13): BookingRaw, BookingStat, ChartTooltipProps, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard(), median() (+5 more)

### Community 96 - "public.profiles"
Cohesion: 0.09
Nodes (14): idx_profiles_role, idx_profiles_tenant_id, get_loyalty_gap_analysis(), public.get_loyalty_gap_analysis(), public.get_nexty_outside_candidates(), public.bookings_with_client, public.current_tenant_id(), public.is_admin() (+6 more)

### Community 97 - "Index.tsx"
Cohesion: 0.11
Nodes (18): 3. Give the five destinations stable IDs, Existing implementation findings, CarouselDots(), CaseStudySection(), CTASection(), Eyebrow(), FeaturesSection(), GROUPS (+10 more)

### Community 98 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 99 - "sheet.tsx"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 100 - "loyaltyHelpers.ts"
Cohesion: 0.42
Nodes (7): effectiveStatus(), excelToDate(), excelToISO(), exportCSV(), isBirthdaySoon(), isoToDisplay(), timeToBookDays()

### Community 101 - "utils.ts"
Cohesion: 0.39
Nodes (5): Button, ButtonProps, buttonVariants, Calendar(), CalendarProps

### Community 103 - "types.ts"
Cohesion: 0.10
Nodes (22): ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog(), AppRole, EditRoleModal(), GlassCard() (+14 more)

### Community 104 - "types.ts"
Cohesion: 0.13
Nodes (19): ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader(), Booking, DiagIssue (+11 more)

### Community 106 - "4. Bug #2: protect_booking_financial_fields Trigger"
Cohesion: 0.33
Nodes (6): 4. Bug #2: protect_booking_financial_fields Trigger, Fix Applied, Function, Notes, Problem, Trigger Name

### Community 107 - "7. Bug #5: RLS Policies Not Bound to service_role"
Cohesion: 0.33
Nodes (6): 7. Bug #5: RLS Policies Not Bound to service_role, Fix Applied — bookings table, Fix Applied — payments table, Note, Problem, Verification

### Community 108 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js@3.50.0, esbuild@0.21.5, esbuild@0.25.0, @swc/core@1.13.2, tesseract.js@5.1.1

### Community 109 - "lucide-react"
Cohesion: 0.08
Nodes (26): lucide-react, AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View, Props, tiers, TrialExpiredPaywall() (+18 more)

### Community 110 - "useFeatureFlags.ts"
Cohesion: 0.18
Nodes (13): AdminDashboard(), getDaysLeft(), TrialCountdownNudge(), AccountState, ALL_TRUE, appSettingsKeys, ARREARS_ALLOWED, ARREARS_FLAGS (+5 more)

### Community 111 - "services"
Cohesion: 0.05
Nodes (33): idx_profiles_email, idx_profiles_role, profiles, update_profiles_updated_at, update_updated_at_column(), idx_services_active, idx_services_category, services (+25 more)

### Community 112 - "platform-billing-checkout/index.ts"
Cohesion: 0.40
Nodes (5): buildSignature(), corsHeaders, jsStringEscape(), PLAN_LABELS, PLAN_PRICES_CENTS

### Community 113 - "vercel.json"
Cohesion: 0.33
Nodes (5): cleanUrls, headers, redirects, rewrites, $schema

### Community 114 - "Working rules for this repository"
Cohesion: 0.33
Nodes (5): graphify, Production, repo and database stay in sync, Quality gates, Secrets, Working rules for this repository

### Community 115 - "10. Yoco API Reference Notes"
Cohesion: 0.40
Nodes (5): 10. Yoco API Reference Notes, payment.succeeded Event Payload, Test Cards, Two Base URLs, Webhook Signature Verification

### Community 116 - "3. Bug #1: Yoco Webhook Signature Verification"
Cohesion: 0.40
Nodes (5): 3. Bug #1: Yoco Webhook Signature Verification, Commit, File, Fix Applied, Problem

### Community 117 - "5. Bug #3: queue_calendar_event Missing tenant_id"
Cohesion: 0.40
Nodes (5): 5. Bug #3: queue_calendar_event Missing tenant_id, Fix Applied, Function, Problem, Trigger Name

### Community 118 - "6. Bug #4: send-booking-email Function Missing"
Cohesion: 0.40
Nodes (5): 6. Bug #4: send-booking-email Function Missing, Commit, Fix Applied, Pending, Problem

### Community 119 - "8. Bug #6: Address Autocomplete & Distance Calculation"
Cohesion: 0.40
Nodes (5): 8. Bug #6: Address Autocomplete & Distance Calculation, Historical Issue, How It Works, Investigation, Status: Working (no code bug found)

### Community 120 - "public.payments"
Cohesion: 0.12
Nodes (10): idx_payments_booking_id, idx_payments_client_id, idx_payments_tenant_id, public.acquire_slot_hold(), public.create_booking_with_consultation(), public.reject_payshap_booking(), public.release_failed_gateway_booking(), public.cancel_expired_pending_bookings() (+2 more)

### Community 121 - "book-a-glow — NextSlot"
Cohesion: 0.40
Nodes (4): book-a-glow — NextSlot, Environment Variables, Local Development, Stack

### Community 122 - "payments"
Cohesion: 0.11
Nodes (17): idx_payments_booking, idx_payments_client, idx_payments_created, idx_payments_status, payments, update_payments_updated_at, idx_payments_gateway, get_returning_clients_count() (+9 more)

### Community 123 - "display-cards.tsx"
Cohesion: 0.50
Nodes (4): DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 124 - "public.booking_items"
Cohesion: 0.07
Nodes (20): idx_booking_items_booking_id, idx_booking_items_tenant_id, public.get_revenue_per_minute(), public.get_attach_rate(), idx_saa_addon_id, idx_saa_service_id, public.service_addon_assignments, unique_service_name_category (+12 more)

### Community 126 - "11. Deployment Constraints"
Cohesion: 0.50
Nodes (4): 11. Deployment Constraints, Database Changes, Edge Function Deployment (No CLI), Secrets

### Community 127 - "12. Current State"
Cohesion: 0.50
Nodes (4): 12. Current State, ✅ Fixed, ⏳ Pending Deployment, ❓ Untested

### Community 128 - "13. Remaining Tasks"
Cohesion: 0.50
Nodes (4): 13. Remaining Tasks, Immediate (Before Going Live), Known Limitations, Short Term

### Community 129 - "SetupChecklistPaymentGate.tsx"
Cohesion: 0.18
Nodes (13): Props, SetupChecklistPaymentGate(), TenantPaymentFields, useTenantPaymentFields(), getPlanLabel(), getPlanPaymentFocus(), hasCompletedPaymentSetup(), isLifetimeFree() (+5 more)

### Community 130 - "AdminBilling.tsx"
Cohesion: 0.23
Nodes (12): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+4 more)

### Community 131 - "registry.ts"
Cohesion: 0.26
Nodes (10): ALL_FLAGS, FEATURE_REGISTRY, FeatureDef, FeatureStatus, FLAG_KEYS, flagKeys, flagSettingKey(), PLAN_ORDER (+2 more)

### Community 132 - "20260524123735_platform_billing_tables.sql"
Cohesion: 0.26
Nodes (10): idx_platform_invoices_due, idx_platform_invoices_status, idx_platform_invoices_tenant, idx_platform_payments_invoice, idx_platform_payments_tenant, platform_invoices, platform_payments, set_updated_at() (+2 more)

### Community 133 - "20260703195943_ensure_tenant_owner_role_and_tenant_row.sql"
Cohesion: 0.60
Nodes (4): on_profile_tenant_set, on_tenant_created, public.handle_profile_tenant_set(), public.handle_tenant_created()

### Community 134 - "ikhokha-checkout/index.ts"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 138 - "20260307083447_009_add_tenant_id_to_missing_tables.sql"
Cohesion: 0.17
Nodes (7): idx_app_settings_tenant, idx_consultations_tenant, idx_loyalty_tracker_tenant, idx_reviews_cache_tenant, idx_staff_availability_tenant, idx_stock_inventory_tenant, idx_webhook_queue_tenant

### Community 139 - "class-variance-authority"
Cohesion: 0.32
Nodes (6): class-variance-authority@^0.7.1, class-variance-authority, Label, labelVariants, Toggle, toggleVariants

### Community 146 - "IntegrationsGuidePanel.tsx"
Cohesion: 0.47
Nodes (9): Callout(), FieldRef(), GoogleCalGuide(), GuidePanelProps, IntegrationsGuidePanel(), SectionHeader(), SmtpGuide(), Step() (+1 more)

### Community 147 - "StockScanModal.tsx"
Cohesion: 0.22
Nodes (10): pdfjs-dist@^4.4.168, tesseract.js@^5.1.1, pdfjs-dist, tesseract.js, parseInvoiceText(), pdfToImages(), Props, ScannedRow (+2 more)

### Community 148 - "Function audit (production, 14 November 2026)"
Cohesion: 0.25
Nodes (7): Corrections to the earlier candidate list, Found in production, not in the repo, Function audit (production, 14 November 2026), Live RPC traffic in the last 24 hours (for reference), Needed for the video consultation feature, Repo versus production (overlaps, not removed), Unused in the repo and logs, cleanup candidates

### Community 149 - "billing_queue"
Cohesion: 0.60
Nodes (5): billing_queue, billing_queue_billing_month_idx, billing_queue_created_at_idx, billing_queue_status_idx, billing_queue_tenant_id_idx

### Community 150 - "FirstBookingCelebration.tsx"
Cohesion: 0.53
Nodes (4): fireConfetti(), FirstBookingCelebration(), loadConfetti(), seenKey()

### Community 152 - "notifications"
Cohesion: 0.24
Nodes (8): booking_notification_trigger, notifications, notifications_tenant_id_created_at_idx, notify_on_booking_event(), idx_loyalty_tracker_tenant_id, idx_notifications_tenant_id, idx_payments_tenant_id, idx_profiles_tenant_id

### Community 153 - "public.staff_availability"
Cohesion: 0.20
Nodes (8): public.services, public.staff_availability, staff_availability_unique_slot, public.check_availability(), public.get_available_slots(), public.get_booking_horizon_availability(), public.save_staff_availability(), public.save_staff_daily_override()

### Community 154 - "DashboardPreview.tsx"
Cohesion: 0.25
Nodes (6): DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices

### Community 157 - "20261029202959_restore_call_out_fee.sql"
Cohesion: 0.33
Nodes (4): public.booking_callout_fee_waivers, public.waive_call_out_fee(), nextslot_private.restore_call_out_fee_atomic(), public.booking_callout_fee_restorations

### Community 166 - "public.blocked_clients"
Cohesion: 0.70
Nodes (4): blocked_clients_email_idx, blocked_clients_phone_idx, blocked_clients_tenant_id_idx, public.blocked_clients

### Community 182 - "pending/README.md"
Cohesion: 0.50
Nodes (3): Availability drafts (not applied), Pending migrations (not applied), Stage 2 tests

## Knowledge Gaps
- **170 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminCalendar.tsx`, `AdminStock.tsx`, `AdminBilling.tsx`, `ClientAlertsModal.tsx`, `SetupChecklistPaymentGate.tsx`, `AdminSidebar.tsx`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `dependencies`, `lucide-react`, `App.tsx`, `useTenant`, `class-variance-authority`, `Pricing.tsx`, `Admin.tsx`, `usePublicTenant`, `usePayshapPayments.ts`, `AdminDashboard.tsx`, `package.json`, `IntegrationsGuidePanel.tsx`, `AdminSettings.tsx`, `FirstBookingCelebration.tsx`, `StockScanModal.tsx`, `AdminCommunications.tsx`, `ReviewStep.tsx`, `AdminBilling.tsx`, `tokens.ts`, `Resources.tsx`, `DashboardViews.tsx`, `SuperAdminShell.tsx`, `SARevenue.tsx`, `BusinessThemeProvider.tsx`, `useSupabaseDashboard.ts`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `Onboarding.tsx`, `use-admin-viewport.ts`, `use-toast.ts`, `AdminHelp.tsx`, `Book.tsx`, `SeoLandingPage.tsx`, `AdminConsultations.tsx`, `Login.tsx`, `LoyaltyBulkBar.tsx`, `framer-motion`, `AdminRecommendations.tsx`, `cn`, `dialog.tsx`, `toast.tsx`, `SATenantHealth.tsx`, `NotificationBell.tsx`, `RevenueTrendCard.tsx`, `SATenants.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `@tanstack/react-query`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `LoyaltyClientCard.tsx`, `loyaltyHelpers.ts`, `SAGrowth.tsx`, `Index.tsx`, `sheet.tsx`, `utils.ts`, `types.ts`, `types.ts`, `lucide-react`, `useFeatureFlags.ts`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `ClientAlertsModal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `AdminCalendar.tsx`, `AdminStock.tsx`, `AdminBilling.tsx`, `ClientAlertsModal.tsx`, `SetupChecklistPaymentGate.tsx`, `AdminSidebar.tsx`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `dependencies`, `lucide-react`, `App.tsx`, `useTenant`, `Pricing.tsx`, `Admin.tsx`, `usePublicTenant`, `usePayshapPayments.ts`, `AdminDashboard.tsx`, `package.json`, `IntegrationsGuidePanel.tsx`, `AdminSettings.tsx`, `FirstBookingCelebration.tsx`, `StockScanModal.tsx`, `AdminCommunications.tsx`, `AdminMetricExplanation.tsx`, `AdminBilling.tsx`, `ReviewStep.tsx`, `Resources.tsx`, `DashboardPreview.tsx`, `SuperAdminShell.tsx`, `SARevenue.tsx`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `Onboarding.tsx`, `AdminHelp.tsx`, `Book.tsx`, `SeoLandingPage.tsx`, `AdminConsultations.tsx`, `react`, `Login.tsx`, `LoyaltyBulkBar.tsx`, `framer-motion`, `AdminRecommendations.tsx`, `dialog.tsx`, `toast.tsx`, `SATenantHealth.tsx`, `NotificationBell.tsx`, `RevenueTrendCard.tsx`, `SATenants.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `@tanstack/react-query`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `LoyaltyClientCard.tsx`, `loyaltyHelpers.ts`, `SAGrowth.tsx`, `sheet.tsx`, `DashboardViews.tsx`, `utils.ts`, `types.ts`, `types.ts`, `useFeatureFlags.ts`, `display-cards.tsx`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `ref_https` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `lucide-react` to `AdminCalendar.tsx`, `AdminStock.tsx`, `AdminBilling.tsx`, `ClientAlertsModal.tsx`, `SetupChecklistPaymentGate.tsx`, `lucide-react`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `App.tsx`, `useTenant`, `Pricing.tsx`, `useNextyInsights.ts`, `Admin.tsx`, `usePublicTenant`, `usePayshapPayments.ts`, `StockScanModal.tsx`, `AdminSettings.tsx`, `FirstBookingCelebration.tsx`, `ReviewStep.tsx`, `AdminCommunications.tsx`, `AdminBilling.tsx`, `SARevenue.tsx`, `BusinessThemeProvider.tsx`, `useSupabaseDashboard.ts`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `Onboarding.tsx`, `AdminHelp.tsx`, `Book.tsx`, `AdminConsultations.tsx`, `Login.tsx`, `framer-motion`, `AdminRecommendations.tsx`, `SATenantHealth.tsx`, `NotificationBell.tsx`, `SATenants.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `@tanstack/react-query`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `LoyaltyClientCard.tsx`, `loyaltyHelpers.ts`, `SAGrowth.tsx`, `types.ts`, `types.ts`, `useFeatureFlags.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `AdminSidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07549361207897794 - nodes in this community are weakly interconnected._
- **Should `useTenant` be split into smaller, more focused modules?**
  _Cohesion score 0.09408033826638477 - nodes in this community are weakly interconnected._