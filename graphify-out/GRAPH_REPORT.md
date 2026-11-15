# Graph Report - merge-wt  (2026-11-15)

## Corpus Check
- 604 files · ~407,006 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .css 7, (none) 3, .example 1)

## Summary
- 3162 nodes · 6466 edges · 320 communities (142 shown, 178 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8504fc5d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminSidebar.tsx
- tokens.ts
- lucide-react
- AdminClientManagement.tsx
- ref_https
- Onboarding.tsx
- feature-flags/SAFeatureFlags.tsx
- useTenant
- dependencies
- devDependencies
- App.tsx
- HeatmapSection.tsx
- public.user_roles
- public.app_settings
- useNextyInsights.ts
- Admin.tsx
- @tanstack/react-query
- usePayshapPayments.ts
- AdminDashboard.tsx
- package.json
- DashboardViews.tsx
- AdminSettings.tsx
- SuperAdminShell.tsx
- ReviewStep.tsx
- AdminCommunications.tsx
- AdminMetricExplanation.tsx
- SAGrowth.tsx
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
- ClientAlertsModal.tsx
- vitest
- send-billing-receipt/index.ts
- AdminBilling.tsx
- use-toast.ts
- send-booking-email/index.ts
- components.json
- Pricing.tsx
- AdminSpecialOccasions.tsx
- TenantContext.tsx
- SAUsers.tsx
- vitest
- AdminConsultations.tsx
- 20260308214728_abe41b98-2217-4182-8511-10a994985858.sql
- Login.tsx
- compilerOptions
- Rollback plan: video consultation availability and booking release
- generate-seo-pages.mjs
- staff_availability
- public.staff_availability
- react
- AdminRecommendations.tsx
- cn
- videoConsultation.ts
- functions/_shared/security.ts
- Video call service — Full Build Scope & Blast-Radius Review
- ScheduleStep.tsx
- SATenantHealth.tsx
- activate-tenant/index.ts
- create-tenant/index.ts
- middleware.ts
- toast.tsx
- RevenueTrendCard.tsx
- SATenants.tsx
- AdminServices.tsx
- get-or-create-client/_shared/security.ts
- initiate-deposit-checkout/_shared/security.ts
- yoco-balance/_shared/security.ts
- compilerOptions
- Book-a-Glow: Debugging Session — 11 March 2026
- services
- AdminAvailability.tsx
- loyalty_tracker
- public.profiles
- planFeatureMap.ts
- SACohortRetention.tsx
- SetupChecklist.tsx
- SABookings.tsx
- SAFeatureAdoption.tsx
- LoyaltyClientCard.tsx
- tenants
- payfast-itn/index.ts
- Call-out fee waiver
- dialog.tsx
- Video consultation: open items (to return to when the feature is complete)
- public.booking_items
- AdminConsistencyPricing.tsx
- scripts
- 20260524135812_platform_billing_followup_fixes.sql
- AdminSharedUI.tsx
- utils.ts
- create-calendar-event/index.ts
- supabase
- class-variance-authority
- update-gcal-event/index.ts
- 4. Bug #2: protect_booking_financial_fields Trigger
- 7. Bug #5: RLS Policies Not Bound to service_role
- allowScripts
- lucide-react
- public.update_loyalty_tracker
- public.update_loyalty_tracker
- platform-billing-checkout/index.ts
- vercel.json
- Working rules for this repository
- 10. Yoco API Reference Notes
- 3. Bug #1: Yoco Webhook Signature Verification
- 5. Bug #3: queue_calendar_event Missing tenant_id
- 6. Bug #4: send-booking-email Function Missing
- 8. Bug #6: Address Autocomplete & Distance Calculation
- Rollback plan: video consultation stage 1 (service flag)
- book-a-glow — NextSlot
- payments
- public.tenants
- public.normalize_consistency_booking_client
- platform-billing-webhook/index.ts
- 11. Deployment Constraints
- 12. Current State
- 13. Remaining Tasks
- SetupChecklistPaymentGate.tsx
- popover.tsx
- loyaltyHelpers.ts
- public.bookings
- public.get_tenant_secret
- ikhokha-checkout/index.ts
- payfast-checkout/index.ts
- platform-monthly-billing-test/index.ts
- 20260516165820_normalise_booking_phones.sql
- 20260307083447_009_add_tenant_id_to_missing_tables.sql
- input-otp@^1.4.2
- @radix-ui/react-alert-dialog@^1.1.14
- @radix-ui/react-menubar@^1.1.15
- send-email/index.ts
- gcal-backfill/index.ts
- platform-payment-webhook/index.ts
- reply-to-review/index.ts
- IntegrationsGuidePanel.tsx
- StockScanModal.tsx
- Function audit (production, 14 November 2026)
- @radix-ui/react-scroll-area@^1.2.9
- @radix-ui/react-slider@^1.3.5
- display-cards.tsx
- notifications
- functions_before_video_release.sql
- DashboardPreview.tsx
- AdminMetricExplanation.tsx
- @radix-ui/react-toggle-group@^1.1.10
- 20261029202959_restore_call_out_fee.sql
- broadcast-email/index.ts
- ikhokha-webhook/index.ts
- protect_booking_fields_trigger
- react-day-picker
- recharts
- vite-env.d.ts
- 20260403214318_platform_events_and_mrr_engine.sql
- @supabase/supabase-js
- register-yoco-webhook/index.ts
- @radix-ui/react-toast
- 20260817095419_blocked_email_domains.sql
- staff_availability_unique_slot
- embla-carousel-react@^8.6.0
- @radix-ui/react-checkbox@^1.3.2
- AdminBilling.tsx
- @radix-ui/react-label
- pending/README.md
- 20261029195844_log_stale_balance_webhook_events.sql
- 20261107034436_internal_cron_secrets.sql
- @radix-ui/react-toggle
- react-hook-form@^7.61.1

## God Nodes (most connected - your core abstractions)
1. `react` - 130 edges
2. `lucide-react` - 109 edges
3. `useTenant()` - 101 edges
4. `supabase` - 90 edges
5. `bookings` - 65 edges
6. `cn()` - 51 edges
7. `framer-motion` - 50 edges
8. `public.tenants` - 40 edges
9. `@tanstack/react-query` - 36 edges
10. `profiles` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Secondary Cause: Hardcoded Address` --references--> `usePublicBusinessConfig()`  [INFERRED]
  docs/debugging-session-2026-03-11.md → src/hooks/usePublicBusinessConfig.ts
- `2. Real-world proof arrives late in the homepage sequence` --references--> `CaseStudySection()`  [INFERRED]
  docs/marketing-website-phase-1-audit.md → src/components/home/CaseStudySection.tsx
- `Existing implementation findings` --references--> `CaseStudySection()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/home/CaseStudySection.tsx
- `3. Give the five destinations stable IDs` --references--> `CTASection()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/home/CTASection.tsx
- `Existing implementation findings` --references--> `FeaturesSection()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/home/FeaturesSection.tsx

## Import Cycles
- None detected.

## Communities (320 total, 178 thin omitted)

### Community 0 - "AdminSidebar.tsx"
Cohesion: 0.05
Nodes (58): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+50 more)

### Community 1 - "tokens.ts"
Cohesion: 0.12
Nodes (19): 3. Give the five destinations stable IDs, CaseStudySection(), Eyebrow(), FeaturesSection(), GROUPS, Orb(), ChartTooltipProps, CustomTooltip() (+11 more)

### Community 2 - "lucide-react"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 3 - "AdminClientManagement.tsx"
Cohesion: 0.18
Nodes (15): AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType, ProactiveAlertBanner(), Tab (+7 more)

### Community 4 - "ref_https"
Cohesion: 0.05
Nodes (17): corsHeaders, corsHeaders, CORS_HEADERS, corsHeaders, corsHeaders, corsHeaders, supabase, CORS_HEADERS (+9 more)

### Community 5 - "Onboarding.tsx"
Cohesion: 0.15
Nodes (17): businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload(), createTenant() (+9 more)

### Community 6 - "feature-flags/SAFeatureFlags.tsx"
Cohesion: 0.09
Nodes (41): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+33 more)

### Community 7 - "useTenant"
Cohesion: 0.11
Nodes (34): sonner, AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBookings(), AdminBookingsProps, ConfirmDialog() (+26 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, cmdk@^1.1.1, date-fns@^3.6.0, @dnd-kit/core@^6.3.1, @dnd-kit/utilities@^3.2.2, framer-motion@^12.35.1, @hcaptcha/react-hcaptcha@^1.11.0, lucide-react@^0.462.0 (+34 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (36): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+28 more)

### Community 10 - "App.tsx"
Cohesion: 0.06
Nodes (55): About, Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics (+47 more)

### Community 11 - "HeatmapSection.tsx"
Cohesion: 0.23
Nodes (12): Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection(), TIME_LABELS (+4 more)

### Community 12 - "public.user_roles"
Cohesion: 0.10
Nodes (12): public.is_tenant_admin(), on_auth_user_created, public.handle_new_user(), public.get_user_tenant_id(), public.has_role(), public.user_roles, public.is_tenant_admin(), idx_user_roles_tenant_role (+4 more)

### Community 13 - "public.app_settings"
Cohesion: 0.12
Nodes (11): public.get_nexty_business_context(), public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_rebooking_rate_analysis(), public.get_no_show_leakage(), public.check_availability(), public.check_availability(), public.check_availability() (+3 more)

### Community 14 - "useNextyInsights.ts"
Cohesion: 0.09
Nodes (31): AttachRateRow, BasketTrendRow, ChannelRoiRow, DAY_NAMES, dayBefore(), formatRand(), formatRpm(), hourLabel() (+23 more)

### Community 15 - "Admin.tsx"
Cohesion: 0.08
Nodes (35): AdminDashboard(), AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View, AdminMobileNav(), ArrearsBanner(), Tenant (+27 more)

### Community 16 - "@tanstack/react-query"
Cohesion: 0.12
Nodes (20): @tanstack/react-query, PublicTenantContext, PublicTenantData, usePublicTenant(), getStaffId(), MonthDateAvailability, resolveStaffId(), todayLocalStr() (+12 more)

### Community 17 - "usePayshapPayments.ts"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.09
Nodes (31): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+23 more)

### Community 19 - "package.json"
Cohesion: 0.06
Nodes (30): clsx@^2.1.1, @dnd-kit/sortable@^8.0.0, @hookform/resolvers@^3.10.0, @radix-ui/react-collapsible@^1.1.11, @radix-ui/react-context-menu@^2.2.15, @radix-ui/react-dropdown-menu@^2.1.15, @radix-ui/react-navigation-menu@^1.2.13, @radix-ui/react-radio-group@^1.3.7 (+22 more)

### Community 20 - "DashboardViews.tsx"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 21 - "AdminSettings.tsx"
Cohesion: 0.14
Nodes (22): AdminSettings(), Collapsible(), DEPOSIT_PRESETS, isAcquisitionChannel(), LEAD_TIME_PRESETS, MAX_DAYS_PRESETS, MIN_NOTICE_PRESETS, OVERRUN_PRESETS (+14 more)

### Community 22 - "SuperAdminShell.tsx"
Cohesion: 0.09
Nodes (28): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SABroadcast, SAFeatureFlags (+20 more)

### Community 23 - "ReviewStep.tsx"
Cohesion: 0.10
Nodes (31): BookingBar(), BookingBarProps, HoldTimer(), StepHeading(), StepHeadingProps, friendlyBookingError(), GatewayMark(), PaymentChoice (+23 more)

### Community 24 - "AdminCommunications.tsx"
Cohesion: 0.20
Nodes (22): AdminCommunications(), PREVIEW_DATA, buildDefaultWhatsAppMessage(), buildWhatsAppMessage(), clean(), DEFAULT_WHATSAPP_TONE, getWhatsAppTemplateDefault(), MessageData (+14 more)

### Community 25 - "AdminMetricExplanation.tsx"
Cohesion: 0.24
Nodes (10): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+2 more)

### Community 26 - "SAGrowth.tsx"
Cohesion: 0.19
Nodes (14): SAGrowth, BookingRaw, BookingStat, ChartTooltipProps, CustomTooltip(), daysUntil(), fmtCurrency(), GlassCard() (+6 more)

### Community 27 - "tokens.ts"
Cohesion: 0.10
Nodes (17): Existing implementation findings, @testing-library/react, CarouselDots(), CTASection(), HeroSection(), HomeJourneyNav(), HomeJourneyNavProps, ITEMS (+9 more)

### Community 28 - "Resources.tsx"
Cohesion: 0.12
Nodes (30): react-router-dom, PrimaryCTA(), MK, MarketingLayout(), SiteFooter(), navLinks, SiteHeader(), About() (+22 more)

### Community 29 - "platform-monthly-billing/index.ts"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 30 - "bookings"
Cohesion: 0.07
Nodes (31): bookings, idx_bookings_client, idx_bookings_created, idx_bookings_date, idx_bookings_staff, idx_bookings_status, update_bookings_updated_at, public.update_booking_status() (+23 more)

### Community 31 - "SARevenue.tsx"
Cohesion: 0.19
Nodes (21): ChartTooltipProps, CopyLinkButton(), CreateInvoiceModal(), CustomTooltip(), daysUntil(), fmtDate(), GlassCard(), MarkPaidModal() (+13 more)

### Community 32 - "BusinessThemeProvider.tsx"
Cohesion: 0.15
Nodes (25): ADMIN_PATH_PREFIXES, BusinessThemeContext, BusinessThemeContextValue, BusinessThemeProvider(), isAdminPath(), BusinessTheme, BusinessThemeColors, businessThemes (+17 more)

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
Cohesion: 0.10
Nodes (27): framer-motion, BookingConfirmation(), BookingConfirmationProps, ConsultationQRenderer(), ConsultationQRendererProps, DetailsStep(), DetailsStepProps, phoneCodes (+19 more)

### Community 39 - "Phase 1: NextSlot Marketing Website Baseline Audit"
Cohesion: 0.11
Nodes (18): 1. Homepage does not answer all five questions, 2. Real-world proof arrives late in the homepage sequence, 3. Global navigation terminology differs from the agreed visitor language, 4. The five-question navigation needs a mobile-safe interaction design, 5. Audience breadth could be more explicit, 6. Pricing and trial statements should be consistent across pages, 7. Repeated final CTA patterns deserve a consistency pass, Brand and implementation guardrails (+10 more)

### Community 40 - "AdminIntegrations.tsx"
Cohesion: 0.20
Nodes (21): AdminIntegrations(), Field(), FieldProps, GoogleCalendarCard(), GoogleCalendarCardProps, IntegrationCard(), IntegrationCardProps, isConfigured() (+13 more)

### Community 41 - "ClientAlertsModal.tsx"
Cohesion: 0.23
Nodes (14): AdminDashboardViewProps, alertCardLayoutId(), ClientAlertsModal(), ClientAlertsModalProps, daysUntilOccasion(), EmptyState(), formatDate(), formatOccasionDate() (+6 more)

### Community 42 - "vitest"
Cohesion: 0.21
Nodes (8): vitest@^3.2.4, vitest, BookingSheet(), BookingSheetProps, renderSheet(), StepIndicator(), StepIndicatorProps, steps

### Community 43 - "send-billing-receipt/index.ts"
Cohesion: 0.14
Nodes (8): corsHeaders, buildReceiptHtml(), buildSnapshotHtml(), escHtml(), fmtRands(), formatLeadSource(), MonthlySnapshot, PLAN_LABELS

### Community 44 - "AdminBilling.tsx"
Cohesion: 0.18
Nodes (15): CancelSubscriptionFlow(), DATA_RETENTION_DAYS, deletionDateLabel(), Step, buildGuestRows(), csvCell(), download(), exportGuestData() (+7 more)

### Community 45 - "use-toast.ts"
Cohesion: 0.13
Nodes (18): PwaUpdater(), ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+10 more)

### Community 46 - "send-booking-email/index.ts"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 47 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 48 - "Pricing.tsx"
Cohesion: 0.09
Nodes (24): 1. Add a homepage-only journey index, 2. Make the hero CTA initiate the journey, 4. Use the smallest layout adjustments possible, Acceptance criteria, Agreed experience, Expected file touchpoints, Homepage Journey Interaction Map, Important implementation recommendation (+16 more)

### Community 49 - "AdminSpecialOccasions.tsx"
Cohesion: 0.26
Nodes (11): AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort(), nextOccurrence(), OccasionCard() (+3 more)

### Community 50 - "TenantContext.tsx"
Cohesion: 0.14
Nodes (14): FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, LOADING_CTX, resolveSubdomainTenantId(), TenantContext, TenantContextValue (+6 more)

### Community 51 - "SAUsers.tsx"
Cohesion: 0.12
Nodes (17): SAUsers, AppRole, EditRoleModal(), GlassCard(), Profile, ROLES, SAUsers(), TenantMap (+9 more)

### Community 52 - "vitest"
Cohesion: 0.15
Nodes (10): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, lovable-tagger, vite, vite-plugin-pwa (+2 more)

### Community 53 - "AdminConsultations.tsx"
Cohesion: 0.23
Nodes (14): AdminConsultations(), answeredItems(), changeEntries(), ConsultationAnswerItem, ConsultationChangeEntry, ConsultationJsonFields, ConsultationRow, exportCSV() (+6 more)

### Community 54 - "20260308214728_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.09
Nodes (13): booking_items, idx_booking_items_booking, idx_booking_items_service, public.current_tenant_id(), public.get_app_setting(), public.get_available_slots(), public.get_client_history(), public.get_month_availability() (+5 more)

### Community 55 - "Login.tsx"
Cohesion: 0.15
Nodes (15): HOME_STYLES, MarketingLayoutProps, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), LOVABLE_DOMAINS, MAIN_DOMAINS, SUPABASE_ANON_KEY (+7 more)

### Community 56 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 57 - "Rollback plan: video consultation availability and booking release"
Cohesion: 0.20
Nodes (9): Applied to production (14 November 2026), Blast radius, Frontend rollback, Gates before the release is applied, Pre-release state (record these before applying), Rollback plan: video consultation availability and booking release, Rollback steps (production), in this order, Verify after rollback (+1 more)

### Community 58 - "generate-seo-pages.mjs"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 59 - "staff_availability"
Cohesion: 0.08
Nodes (23): idx_staff_availability_date, idx_staff_availability_day, idx_staff_availability_staff, staff_availability, update_staff_availability_updated_at, public.check_availability(), public.check_availability(), public.get_available_slots() (+15 more)

### Community 60 - "public.staff_availability"
Cohesion: 0.08
Nodes (22): idx_staff_avail_staff_date, idx_staff_avail_staff_day, public.acquire_slot_hold(), public.get_available_slots(), public.save_staff_daily_override(), public.get_month_availability(), public.get_month_availability(), public.check_availability() (+14 more)

### Community 61 - "react"
Cohesion: 0.09
Nodes (26): react, chipIn, chipList, EASE, logoIn, maskedLine, panelContent, rise (+18 more)

### Community 62 - "AdminRecommendations.tsx"
Cohesion: 0.21
Nodes (14): InsightIcon(), NextyLoyaltyPanel(), AdminNextyOrb(), AdminNextyOrbProps, AdminRecommendations(), getFilterKey(), InsightFilterKey, InsightIcon() (+6 more)

### Community 63 - "cn"
Cohesion: 0.15
Nodes (18): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Separator, SheetContent (+10 more)

### Community 64 - "videoConsultation.ts"
Cohesion: 0.21
Nodes (14): ReviewStepProps, ScheduleStepProps, getSessionToken(), ResizeHoldResult, SlotHoldState, useSlotHold(), buildWhatsAppContactUrl(), canAddToSelection() (+6 more)

### Community 65 - "functions/_shared/security.ts"
Cohesion: 0.19
Nodes (5): VAULT_KEYS, buildCorsHeaders(), json(), timingSafeEqual(), verifyWebhookSignature()

### Community 66 - "Video call service — Full Build Scope & Blast-Radius Review"
Cohesion: 0.06
Nodes (33): 10. Final scope boundary, 11.2 Availability security and compatibility, 11.3 Payment — verified live calculation path, 11.4 Payment — verified UI and provider behaviour, 11.5 Payment — deployed Edge Function and webhook behaviour, 11.6 Confirmed implementation order after the trace, 11.7 Additional acceptance tests from the live trace, 11. Deeper live trace — production database and payment paths (+25 more)

### Community 67 - "ScheduleStep.tsx"
Cohesion: 0.41
Nodes (9): getStaffId(), ScheduleStep(), addMinutesToTime(), DayPeriod, dayPeriod(), dayPeriodLabels, formatDayMonth(), formatLongDate() (+1 more)

### Community 68 - "SATenantHealth.tsx"
Cohesion: 0.22
Nodes (12): SATenantHealth, BookingStat, computeScore(), daysAgo(), daysUntil(), PaymentStat, RISK_CONFIG, RiskLevel (+4 more)

### Community 69 - "activate-tenant/index.ts"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 70 - "create-tenant/index.ts"
Cohesion: 0.17
Nodes (7): CATEGORY_MAP, corsHeaders, DAY_OF_WEEK, THEME_COLORS, THEME_COPY, ThemeColors, ThemeCopy

### Community 71 - "middleware.ts"
Cohesion: 0.33
Nodes (9): config, esc(), fetchTenant(), MAIN_DOMAINS, middleware(), nextResponse(), patchMetaName(), patchMetaProp() (+1 more)

### Community 72 - "toast.tsx"
Cohesion: 0.38
Nodes (8): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster()

### Community 73 - "RevenueTrendCard.tsx"
Cohesion: 0.25
Nodes (10): EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS, Props, RevenueTrendCard(), RevenueTrendEntry, Skeleton() (+2 more)

### Community 74 - "SATenants.tsx"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 75 - "AdminServices.tsx"
Cohesion: 0.18
Nodes (22): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+14 more)

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

### Community 81 - "services"
Cohesion: 0.07
Nodes (27): idx_profiles_email, idx_profiles_role, profiles, update_profiles_updated_at, update_updated_at_column(), idx_services_active, idx_services_category, services (+19 more)

### Community 82 - "AdminAvailability.tsx"
Cohesion: 0.15
Nodes (24): 11.1 Availability — verified live details, Availability implementation consequences, AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AvailabilitySlot (+16 more)

### Community 83 - "loyalty_tracker"
Cohesion: 0.12
Nodes (16): public.calculate_booking_price(), public.create_booking_with_consultation(), public.get_booking_consistency_quote(), consistency_guest_status, consistency_program_services, consistency_programs, public.recalculate_consistency_status(), trigger_consistency_status (+8 more)

### Community 84 - "public.profiles"
Cohesion: 0.09
Nodes (15): public.calculate_booking_price(), public.is_admin(), idx_profiles_role, idx_profiles_tenant_id, public.get_loyalty_gap_analysis(), get_loyalty_gap_analysis(), public.get_loyalty_gap_analysis(), public.get_nexty_outside_candidates() (+7 more)

### Community 85 - "planFeatureMap.ts"
Cohesion: 0.20
Nodes (7): ALL_FLAGS, FeatureStatus, flagKeys, PLAN_GROUPS, PlanFeature, PlanGroup, PLATFORM_TENANT_ID

### Community 86 - "SACohortRetention.tsx"
Cohesion: 0.25
Nodes (9): SACohortRetention, addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow (+1 more)

### Community 87 - "SetupChecklist.tsx"
Cohesion: 0.20
Nodes (13): ChecklistCelebration(), fireConfetti(), loadConfetti(), Props, GATE_ITEMS, GateItem, GateRow(), GateRowProps (+5 more)

### Community 88 - "SABookings.tsx"
Cohesion: 0.22
Nodes (8): SABookings, DATE_RANGES, FlaggedPayment, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 89 - "SAFeatureAdoption.tsx"
Cohesion: 0.24
Nodes (9): SAFeatureAdoption, adoptionColor(), avg(), BookingStat, FEATURE_LABELS, FeatureSummary, FeatureUsageRow, SAFeatureAdoption() (+1 more)

### Community 90 - "LoyaltyClientCard.tsx"
Cohesion: 0.14
Nodes (23): BulkBarProps, FallbackModal(), LoyaltyBulkBar(), useSequentialWaSend(), AVATAR_COLOURS, avatarColour(), getStatusMeta(), initials() (+15 more)

### Community 91 - "tenants"
Cohesion: 0.07
Nodes (26): trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger (+18 more)

### Community 92 - "payfast-itn/index.ts"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 93 - "Call-out fee waiver"
Cohesion: 0.25
Nodes (7): Audit, Call-out fee waiver, Eligibility and safeguards, Financial behaviour, Purpose, Restoration, Security and scope

### Community 94 - "dialog.tsx"
Cohesion: 0.22
Nodes (9): @radix-ui/react-dialog@^1.1.14, @radix-ui/react-dialog, DialogContent, DialogContentProps, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay (+1 more)

### Community 95 - "Video consultation: open items (to return to when the feature is complete)"
Cohesion: 0.25
Nodes (7): Feature flags that are not wired (decision needed), Frontend work still to do, Live in production, Other findings to address in the security batch (deferred by agreement), Pending, not applied to production, Tenant switch, Video consultation: open items (to return to when the feature is complete)

### Community 96 - "public.booking_items"
Cohesion: 0.06
Nodes (23): idx_booking_items_booking_id, idx_booking_items_tenant_id, public.record_mrr_snapshot(), public.get_revenue_per_minute(), public.get_attach_rate(), idx_saa_addon_id, idx_saa_service_id, public.service_addon_assignments (+15 more)

### Community 97 - "AdminConsistencyPricing.tsx"
Cohesion: 0.28
Nodes (8): AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow, UnavailableService

### Community 98 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 99 - "20260524135812_platform_billing_followup_fixes.sql"
Cohesion: 0.20
Nodes (5): public.is_super_admin(), public.sa_platform_billing_overview, platform_invoices_due_status_idx, platform_invoices_tenant_billing_month_uidx, public.platform_billing_config

### Community 100 - "AdminSharedUI.tsx"
Cohesion: 0.09
Nodes (33): AdminBlockedClients(), BlockedClientRow, AdminCard(), AdminIconButtonProps, AdminPageHeader(), EmptyState(), SavedBadge(), SectionLabel() (+25 more)

### Community 101 - "utils.ts"
Cohesion: 0.29
Nodes (6): Button, ButtonProps, buttonVariants, Calendar(), CalendarProps, Input

### Community 103 - "supabase"
Cohesion: 0.08
Nodes (30): SAAuditLog, SASettings, SATroubleshoot, ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog() (+22 more)

### Community 104 - "class-variance-authority"
Cohesion: 0.32
Nodes (6): class-variance-authority@^0.7.1, class-variance-authority, Label, labelVariants, Toggle, toggleVariants

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
Cohesion: 0.18
Nodes (9): lucide-react, Props, tiers, TrialExpiredPaywall(), SuperAdminLogin(), useShellBackground(), ConfirmState, PLAN_LABELS (+1 more)

### Community 110 - "public.update_loyalty_tracker"
Cohesion: 0.25
Nodes (4): loyalty_tracker_tenant_email_unique, public.update_loyalty_tracker(), loyalty_tracker_tenant_phone_unique, public.update_loyalty_tracker()

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

### Community 120 - "Rollback plan: video consultation stage 1 (service flag)"
Cohesion: 0.25
Nodes (7): Applied, Blast radius if rollback is needed, Pre-change state (14 November 2026), Rollback plan: video consultation stage 1 (service flag), Rollback steps (production), Rollback steps (repo), What the change does

### Community 121 - "book-a-glow — NextSlot"
Cohesion: 0.40
Nodes (4): book-a-glow — NextSlot, Environment Variables, Local Development, Stack

### Community 122 - "payments"
Cohesion: 0.11
Nodes (17): idx_payments_booking, idx_payments_client, idx_payments_created, idx_payments_status, payments, update_payments_updated_at, idx_payments_gateway, get_returning_clients_count() (+9 more)

### Community 123 - "public.tenants"
Cohesion: 0.09
Nodes (21): public.tenants, blocked_clients_email_idx, blocked_clients_phone_idx, blocked_clients_tenant_id_idx, public.blocked_clients, public.public_tenant_view, public.sync_tenant_business_name(), trg_sync_business_name (+13 more)

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

### Community 130 - "popover.tsx"
Cohesion: 0.50
Nodes (3): @radix-ui/react-popover@^1.1.14, @radix-ui/react-popover, PopoverContent

### Community 131 - "loyaltyHelpers.ts"
Cohesion: 0.09
Nodes (41): date-fns, AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), LOYALTY_INSIGHT_IDS, PRIORITY_STYLES, SettingCard() (+33 more)

### Community 132 - "public.bookings"
Cohesion: 0.05
Nodes (30): idx_bookings_booking_date, idx_bookings_client_id, idx_bookings_date_start, idx_bookings_staff_date, idx_bookings_status, idx_bookings_tenant_id, idx_bookings_yoco_checkout, idx_payments_booking_id (+22 more)

### Community 134 - "ikhokha-checkout/index.ts"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 138 - "20260307083447_009_add_tenant_id_to_missing_tables.sql"
Cohesion: 0.17
Nodes (7): idx_app_settings_tenant, idx_consultations_tenant, idx_loyalty_tracker_tenant, idx_reviews_cache_tenant, idx_staff_availability_tenant, idx_stock_inventory_tenant, idx_webhook_queue_tenant

### Community 146 - "IntegrationsGuidePanel.tsx"
Cohesion: 0.47
Nodes (9): Callout(), FieldRef(), GoogleCalGuide(), GuidePanelProps, IntegrationsGuidePanel(), SectionHeader(), SmtpGuide(), Step() (+1 more)

### Community 147 - "StockScanModal.tsx"
Cohesion: 0.22
Nodes (10): pdfjs-dist@^4.4.168, tesseract.js@^5.1.1, pdfjs-dist, tesseract.js, parseInvoiceText(), pdfToImages(), Props, ScannedRow (+2 more)

### Community 148 - "Function audit (production, 14 November 2026)"
Cohesion: 0.25
Nodes (7): Corrections to the earlier candidate list, Found in production, not in the repo, Function audit (production, 14 November 2026), Live RPC traffic in the last 24 hours (for reference), Needed for the video consultation feature, Repo versus production (overlaps, not removed), Unused in the repo and logs, cleanup candidates

### Community 151 - "display-cards.tsx"
Cohesion: 0.50
Nodes (4): DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 152 - "notifications"
Cohesion: 0.24
Nodes (8): booking_notification_trigger, notifications, notifications_tenant_id_created_at_idx, notify_on_booking_event(), idx_loyalty_tracker_tenant_id, idx_notifications_tenant_id, idx_payments_tenant_id, idx_profiles_tenant_id

### Community 153 - "functions_before_video_release.sql"
Cohesion: 0.08
Nodes (23): public.acquire_slot_hold(), public.check_availability(), public.get_available_slots(), public.get_booking_horizon_availability(), public.reschedule_booking(), public.resize_slot_hold(), public.save_staff_availability(), public.save_staff_daily_override() (+15 more)

### Community 154 - "DashboardPreview.tsx"
Cohesion: 0.25
Nodes (6): DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices

### Community 155 - "AdminMetricExplanation.tsx"
Cohesion: 0.18
Nodes (21): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+13 more)

### Community 157 - "20261029202959_restore_call_out_fee.sql"
Cohesion: 0.33
Nodes (4): public.booking_callout_fee_waivers, public.waive_call_out_fee(), nextslot_private.restore_call_out_fee_atomic(), public.booking_callout_fee_restorations

### Community 166 - "20260403214318_platform_events_and_mrr_engine.sql"
Cohesion: 0.48
Nodes (6): idx_mrr_snapshots_month, idx_platform_events_event, idx_platform_events_recorded_at, idx_platform_events_tenant_event, public.mrr_snapshots, public.platform_events

### Community 179 - "AdminBilling.tsx"
Cohesion: 0.18
Nodes (15): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+7 more)

### Community 182 - "pending/README.md"
Cohesion: 0.40
Nodes (4): Availability drafts (not applied), Booking drafts (not applied), Pending migrations (not applied), Stage 2 tests

## Knowledge Gaps
- **178 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminSidebar.tsx`, `SetupChecklistPaymentGate.tsx`, `tokens.ts`, `AdminClientManagement.tsx`, `loyaltyHelpers.ts`, `lucide-react`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `dependencies`, `popover.tsx`, `App.tsx`, `Onboarding.tsx`, `Admin.tsx`, `@tanstack/react-query`, `usePayshapPayments.ts`, `AdminDashboard.tsx`, `package.json`, `IntegrationsGuidePanel.tsx`, `AdminSettings.tsx`, `StockScanModal.tsx`, `ReviewStep.tsx`, `AdminCommunications.tsx`, `DashboardViews.tsx`, `SuperAdminShell.tsx`, `AdminMetricExplanation.tsx`, `tokens.ts`, `Resources.tsx`, `SAGrowth.tsx`, `SARevenue.tsx`, `BusinessThemeProvider.tsx`, `useSupabaseDashboard.ts`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `vitest`, `AdminBilling.tsx`, `use-toast.ts`, `Pricing.tsx`, `AdminSpecialOccasions.tsx`, `TenantContext.tsx`, `AdminBilling.tsx`, `SAUsers.tsx`, `AdminConsultations.tsx`, `Login.tsx`, `AdminRecommendations.tsx`, `cn`, `videoConsultation.ts`, `ScheduleStep.tsx`, `SATenantHealth.tsx`, `toast.tsx`, `RevenueTrendCard.tsx`, `SATenants.tsx`, `AdminServices.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `SetupChecklist.tsx`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `LoyaltyClientCard.tsx`, `dialog.tsx`, `AdminConsistencyPricing.tsx`, `AdminSharedUI.tsx`, `utils.ts`, `supabase`, `class-variance-authority`, `lucide-react`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `AdminSidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05365296803652968 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `AdminSidebar.tsx`, `SetupChecklistPaymentGate.tsx`, `lucide-react`, `AdminClientManagement.tsx`, `loyaltyHelpers.ts`, `Onboarding.tsx`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `dependencies`, `App.tsx`, `Admin.tsx`, `usePayshapPayments.ts`, `AdminDashboard.tsx`, `package.json`, `IntegrationsGuidePanel.tsx`, `AdminSettings.tsx`, `StockScanModal.tsx`, `ReviewStep.tsx`, `AdminCommunications.tsx`, `AdminMetricExplanation.tsx`, `DashboardPreview.tsx`, `AdminMetricExplanation.tsx`, `tokens.ts`, `DashboardViews.tsx`, `Resources.tsx`, `SuperAdminShell.tsx`, `SAGrowth.tsx`, `SARevenue.tsx`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `ClientAlertsModal.tsx`, `vitest`, `AdminBilling.tsx`, `Pricing.tsx`, `AdminSpecialOccasions.tsx`, `TenantContext.tsx`, `AdminBilling.tsx`, `SAUsers.tsx`, `AdminConsultations.tsx`, `Login.tsx`, `react`, `AdminRecommendations.tsx`, `cn`, `ScheduleStep.tsx`, `SATenantHealth.tsx`, `toast.tsx`, `RevenueTrendCard.tsx`, `SATenants.tsx`, `AdminServices.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `SetupChecklist.tsx`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `LoyaltyClientCard.tsx`, `dialog.tsx`, `AdminConsistencyPricing.tsx`, `AdminSharedUI.tsx`, `utils.ts`, `supabase`, `display-cards.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `tokens.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12375533428165007 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `supabase` to `AdminSidebar.tsx`, `SetupChecklistPaymentGate.tsx`, `lucide-react`, `AdminClientManagement.tsx`, `loyaltyHelpers.ts`, `Onboarding.tsx`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `App.tsx`, `useNextyInsights.ts`, `Admin.tsx`, `@tanstack/react-query`, `usePayshapPayments.ts`, `AdminDashboard.tsx`, `StockScanModal.tsx`, `AdminSettings.tsx`, `SuperAdminShell.tsx`, `ReviewStep.tsx`, `AdminCommunications.tsx`, `SAGrowth.tsx`, `SARevenue.tsx`, `BusinessThemeProvider.tsx`, `useSupabaseDashboard.ts`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `ClientAlertsModal.tsx`, `AdminBilling.tsx`, `Pricing.tsx`, `AdminSpecialOccasions.tsx`, `TenantContext.tsx`, `AdminBilling.tsx`, `SAUsers.tsx`, `AdminConsultations.tsx`, `Login.tsx`, `react`, `AdminRecommendations.tsx`, `videoConsultation.ts`, `ScheduleStep.tsx`, `SATenantHealth.tsx`, `SATenants.tsx`, `AdminServices.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `SetupChecklist.tsx`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `LoyaltyClientCard.tsx`, `AdminConsistencyPricing.tsx`, `AdminSharedUI.tsx`, `lucide-react`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `ref_https` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `Onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._