# Graph Report - book-a-glow  (2026-11-14)

## Corpus Check
- 578 files · ~384,278 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 6, (none) 2, .example 1)

## Summary
- 3010 nodes · 6073 edges · 316 communities (139 shown, 177 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `870e2fa6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminCalendar.tsx
- AdminStock.tsx
- lucide-react
- AdminLoyalty.tsx
- ref_https
- AdminSidebar.tsx
- feature-flags/SAFeatureFlags.tsx
- useTenant
- dependencies
- devDependencies
- App.tsx
- useTenant
- FeaturesSection.tsx
- Resources.tsx
- useNextyInsights.ts
- Admin.tsx
- client.ts
- profiles
- AdminDashboard.tsx
- package.json
- DashboardViews.tsx
- AdminCommunications.tsx
- SuperAdminShell.tsx
- ReviewStep.tsx
- @tanstack/react-query
- AdminMetricExplanation.tsx
- AdminBilling.tsx
- Pricing.tsx
- homepage-journey.test.tsx
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
- AdminSharedUI.tsx
- Book.tsx
- SeoLandingPage.tsx
- vitest
- AdminConsultations.tsx
- usePublicServices.ts
- Login.tsx
- compilerOptions
- AdminClientManagement.tsx
- generate-seo-pages.mjs
- staff_availability
- public.staff_availability
- date-fns
- framer-motion
- cn
- usePayshapPayments.ts
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
- public.booking_items
- get-or-create-client/_shared/security.ts
- initiate-deposit-checkout/_shared/security.ts
- yoco-balance/_shared/security.ts
- compilerOptions
- Book-a-Glow: Debugging Session — 11 March 2026
- public.tenants
- AdminAvailability.tsx
- loyalty_tracker
- public.user_roles
- planFeatureMap.ts
- SACohortRetention.tsx
- client.ts
- SABookings.tsx
- SAFeatureAdoption.tsx
- SABroadcast.tsx
- app_settings
- payfast-itn/index.ts
- Call-out fee waiver
- next-themes@^0.3.0
- SASystemHealth.tsx
- class-variance-authority
- Index.tsx
- scripts
- sheet.tsx
- TrialExpiredPaywall.tsx
- confirm-booking/index.ts
- create-calendar-event/index.ts
- delete-gcal-event/index.ts
- types.ts
- update-gcal-event/index.ts
- 4. Bug #2: protect_booking_financial_fields Trigger
- 7. Bug #5: RLS Policies Not Bound to service_role
- allowScripts
- lucide-react
- send-superadmin-otp/index.ts
- 20260308214728_abe41b98-2217-4182-8511-10a994985858.sql
- platform-billing-checkout/index.ts
- vercel.json
- Working rules for this repository
- 10. Yoco API Reference Notes
- 3. Bug #1: Yoco Webhook Signature Verification
- 5. Bug #3: queue_calendar_event Missing tenant_id
- 6. Bug #4: send-booking-email Function Missing
- 8. Bug #6: Address Autocomplete & Distance Calculation
- @radix-ui/react-select@^2.2.5
- book-a-glow — NextSlot
- payments
- display-cards.tsx
- public.profiles
- platform-billing-webhook/index.ts
- 11. Deployment Constraints
- 12. Current State
- 13. Remaining Tasks
- SetupChecklistPaymentGate.tsx
- TenantContext.tsx
- public.payments
- 20260524123735_platform_billing_tables.sql
- gcal-backfill/index.ts
- ikhokha-checkout/index.ts
- payfast-checkout/index.ts
- platform-monthly-billing-test/index.ts
- cmdk@^1.1.1
- 20260307083447_009_add_tenant_id_to_missing_tables.sql
- react
- 20260403214318_platform_events_and_mrr_engine.sql
- 20260524135812_platform_billing_followup_fixes.sql
- useClientAlerts.ts
- ikhokha-webhook/index.ts
- platform-payment-webhook/index.ts
- reply-to-review/index.ts
- IntegrationsGuidePanel.tsx
- pdfjs-dist
- @radix-ui/react-context-menu@^2.2.15
- @radix-ui/react-dialog
- FirstBookingCelebration.tsx
- @radix-ui/react-label
- notifications
- react-day-picker
- DashboardPreview.tsx
- @radix-ui/react-menubar@^1.1.15
- zod@^3.25.76
- 20261029202959_restore_call_out_fee.sql
- @radix-ui/react-navigation-menu@^1.2.13
- @radix-ui/react-progress@^1.1.7
- @radix-ui/react-slot
- billing_queue
- 20260929231952_guest_consultations_stage1.sql
- @radix-ui/react-toggle
- vite-env.d.ts
- public.blocked_clients
- public.get_tenant_secret
- 20260516165820_normalise_booking_phones.sql
- @supabase/supabase-js
- register-yoco-webhook/index.ts
- protect_booking_fields_trigger
- 20260817095419_blocked_email_domains.sql
- staff_availability_unique_slot
- tesseract.js
- vaul@^0.9.9
- @radix-ui/react-hover-card@^1.1.14
- pending/README.md
- 20261029195844_log_stale_balance_webhook_events.sql
- 20261107034436_internal_cron_secrets.sql

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
10. `public.tenants` - 30 edges

## Surprising Connections (you probably didn't know these)
- `1. Add a homepage-only journey index` --references--> `Pricing()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/pages/Pricing.tsx
- `Secondary Cause: Hardcoded Address` --references--> `usePublicBusinessConfig()`  [INFERRED]
  docs/debugging-session-2026-03-11.md → src/hooks/usePublicBusinessConfig.ts
- `2. Real-world proof arrives late in the homepage sequence` --references--> `CaseStudySection()`  [INFERRED]
  docs/marketing-website-phase-1-audit.md → src/components/home/CaseStudySection.tsx
- `Existing implementation findings` --references--> `HeatmapSection()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/home/HeatmapSection.tsx
- `Existing implementation findings` --references--> `SiteFooter()`  [INFERRED]
  docs/homepage-journey-interaction-map.md → src/components/site/SiteFooter.tsx

## Import Cycles
- None detected.

## Communities (316 total, 177 thin omitted)

### Community 0 - "AdminCalendar.tsx"
Cohesion: 0.16
Nodes (28): addDays(), AdminCalendar(), AvailabilityRow, CalendarBooking, CalendarView, clientEmail(), clientName(), clientPhone() (+20 more)

### Community 1 - "AdminStock.tsx"
Cohesion: 0.10
Nodes (28): sonner, AdminBlockedClients(), BlockedClientRow, EmptyState(), SectionLabel(), ActionType, AdminStock(), FormField() (+20 more)

### Community 2 - "lucide-react"
Cohesion: 0.17
Nodes (29): BillingProvider, BillingProviderCard(), fetchBillingConfig(), updateBillingProvider(), fetchSettings(), IkhokhaKeysCard(), Mode, upsertSetting() (+21 more)

### Community 3 - "AdminLoyalty.tsx"
Cohesion: 0.05
Nodes (76): AdminLoyalty(), AdminLoyaltyProps, CandidatesBar(), FloatingSaveBar(), InsightIcon(), LOYALTY_INSIGHT_IDS, NextyLoyaltyPanel(), PRIORITY_STYLES (+68 more)

### Community 4 - "ref_https"
Cohesion: 0.05
Nodes (16): corsHeaders, corsHeaders, corsHeaders, TYPE_LABELS, CORS_HEADERS, corsHeaders, supabase, CORS_HEADERS (+8 more)

### Community 5 - "AdminSidebar.tsx"
Cohesion: 0.08
Nodes (26): AdminMobileNavProps, mobileIconMap, NAV_GROUPS, ADMIN_NAV_GROUPS, AdminSidebarProps, AdminSidebarView(), AdminSidebarViewProps, groupIconMap (+18 more)

### Community 6 - "feature-flags/SAFeatureFlags.tsx"
Cohesion: 0.10
Nodes (37): FeatureToggleRow(), LifetimeBanner(), LoadingBlock(), PlanSections(), RefreshButton(), SavedButton(), SaveStatus, TenantOption (+29 more)

### Community 7 - "useTenant"
Cohesion: 0.11
Nodes (28): AddServiceModal(), AddServiceModalProps, BookingItem, Service, AdminBookings(), AdminBookingsProps, ConfirmDialog(), ConfirmDialogProps (+20 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, date-fns@^3.6.0, @dnd-kit/core@^6.3.1, @dnd-kit/sortable@^8.0.0, @dnd-kit/utilities@^3.2.2, framer-motion@^12.35.1 (+35 more)

### Community 9 - "devDependencies"
Cohesion: 0.06
Nodes (35): devDependencies, autoprefixer@^10.4.21, eslint@^9.32.0, @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, jsdom@^20.0.3 (+27 more)

### Community 10 - "App.tsx"
Cohesion: 0.07
Nodes (40): About, Admin, App(), AuthRecoveryHandler(), BillingSuccess, Book, BookingSoftwareSouthAfrica, BusinessAnalytics (+32 more)

### Community 11 - "useTenant"
Cohesion: 0.08
Nodes (48): AdminServices(), EditingService, emptyService(), RuleEditor(), RuleEditorProps, ServiceOption, ServiceReorderRow(), ServiceReorderRowProps (+40 more)

### Community 12 - "FeaturesSection.tsx"
Cohesion: 0.21
Nodes (13): Eyebrow(), Card(), FigmaDashboardPreview(), Heatmap(), MetricCard(), MobileFrame(), HEAT_ROWS, HeatmapSection() (+5 more)

### Community 13 - "Resources.tsx"
Cohesion: 0.12
Nodes (27): react-router-dom, MarketingLayout(), SiteFooter(), navLinks, SiteHeader(), CaseStudy(), NotFound(), OnlineBookingSoftware() (+19 more)

### Community 14 - "useNextyInsights.ts"
Cohesion: 0.09
Nodes (31): AttachRateRow, BasketTrendRow, ChannelRoiRow, DAY_NAMES, dayBefore(), formatRand(), formatRpm(), hourLabel() (+23 more)

### Community 15 - "Admin.tsx"
Cohesion: 0.10
Nodes (30): AdminDashboard(), AdminMobileNav(), ArrearsBanner(), Tenant, TenantSubscription, useFeatureFlags(), Admin(), AdminAvailability (+22 more)

### Community 16 - "client.ts"
Cohesion: 0.14
Nodes (20): getStaffId(), ScheduleStep(), ScheduleStepProps, PublicTenantContext, PublicTenantData, usePublicTenant(), getStaffId(), MonthDateAvailability (+12 more)

### Community 17 - "profiles"
Cohesion: 0.05
Nodes (31): idx_profiles_email, idx_profiles_role, profiles, update_profiles_updated_at, update_updated_at_column(), idx_services_active, idx_services_category, services (+23 more)

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.09
Nodes (30): AdminDashboardView(), ALL_SECTIONS, Appointment, AppointmentsList(), ClientMiniCard(), daysInMonth(), fadeUp, getVisibility() (+22 more)

### Community 19 - "package.json"
Cohesion: 0.06
Nodes (30): embla-carousel-react@^8.6.0, @hcaptcha/react-hcaptcha@^1.11.0, @hookform/resolvers@^3.10.0, input-otp@^1.4.2, @radix-ui/react-accordion@^1.2.11, @radix-ui/react-alert-dialog@^1.1.14, @radix-ui/react-avatar@^1.1.10, @radix-ui/react-dropdown-menu@^2.1.15 (+22 more)

### Community 20 - "DashboardViews.tsx"
Cohesion: 0.13
Nodes (27): allBookings, AvailabilityContent(), BookingsContent(), ConsultationsContent(), DashboardContent(), heatmapData, heatmapSlots, IntegrationsContent() (+19 more)

### Community 21 - "AdminCommunications.tsx"
Cohesion: 0.20
Nodes (22): AdminCommunications(), PREVIEW_DATA, buildDefaultWhatsAppMessage(), buildWhatsAppMessage(), clean(), DEFAULT_WHATSAPP_TONE, getWhatsAppTemplateDefault(), MessageData (+14 more)

### Community 22 - "SuperAdminShell.tsx"
Cohesion: 0.13
Nodes (26): ALL_NAV, NAV_GROUPS, NavGroup, NavItem, NavItemButton(), NavItemButtonProps, SAAuditLog, SABookings (+18 more)

### Community 23 - "ReviewStep.tsx"
Cohesion: 0.13
Nodes (14): friendlyBookingError(), PaymentChoice, phaseLabel(), redirectToPayfast(), ReviewStep(), ReviewStepProps, SubmitPhase, ConsistencyQuote (+6 more)

### Community 24 - "@tanstack/react-query"
Cohesion: 0.08
Nodes (36): @tanstack/react-query, AddOccasionForm(), AdminSpecialOccasions(), daysUntil(), FILTER_CHIPS, FilterChip, formatOccasionShort(), nextOccurrence() (+28 more)

### Community 25 - "AdminMetricExplanation.tsx"
Cohesion: 0.21
Nodes (11): BusinessHealthProps, BusinessHealthSection(), cardAlertClass(), ExpandedCard, fadeUp, HEALTH_METRIC_COPY, InfoLine, MetricCard() (+3 more)

### Community 26 - "AdminBilling.tsx"
Cohesion: 0.11
Nodes (27): AdminBilling(), currentBillingMonth(), daysLeft(), formatDate(), PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, PLAN_PRICES (+19 more)

### Community 27 - "Pricing.tsx"
Cohesion: 0.09
Nodes (33): Orb(), PrimaryCTA(), ChartTooltipProps, CustomTooltip(), DATA, RevenueChart(), BP, C (+25 more)

### Community 28 - "homepage-journey.test.tsx"
Cohesion: 0.29
Nodes (5): @testing-library/react@^16.0.0, @testing-library/react, HomeJourneyNav(), HomeJourneyNavProps, ITEMS

### Community 29 - "platform-monthly-billing/index.ts"
Cohesion: 0.12
Nodes (18): BRAND, buildIkSignature(), cors, DAYS_LONG, deltaPill(), escHtml(), fmtDate(), jsStringEscape() (+10 more)

### Community 30 - "bookings"
Cohesion: 0.07
Nodes (31): bookings, idx_bookings_client, idx_bookings_created, idx_bookings_date, idx_bookings_staff, idx_bookings_status, update_bookings_updated_at, public.update_booking_status() (+23 more)

### Community 31 - "SARevenue.tsx"
Cohesion: 0.09
Nodes (36): recharts@^2.15.4, recharts, BookingRaw, BookingStat, ChartTooltipProps, CustomTooltip(), daysUntil(), fmtCurrency() (+28 more)

### Community 32 - "BusinessThemeProvider.tsx"
Cohesion: 0.19
Nodes (18): ADMIN_PATH_PREFIXES, BusinessThemeContext, BusinessThemeContextValue, BusinessThemeProvider(), isAdminPath(), BusinessTheme, BusinessThemeColors, businessThemes (+10 more)

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
Cohesion: 0.14
Nodes (18): Onboarding, businessThemes, getThemeCssVars(), OnboardingTheme, SuggestedService, availabilityPresets, BLANK_SERVICE, clearPendingPayload() (+10 more)

### Community 42 - "use-admin-viewport.ts"
Cohesion: 0.60
Nodes (3): ADMIN_VIEWPORT_BREAKPOINTS, getAdminViewport(), useAdminViewport()

### Community 43 - "send-billing-receipt/index.ts"
Cohesion: 0.14
Nodes (8): corsHeaders, buildReceiptHtml(), buildSnapshotHtml(), escHtml(), fmtRands(), formatLeadSource(), MonthlySnapshot, PLAN_LABELS

### Community 44 - "public.bookings"
Cohesion: 0.08
Nodes (21): idx_bookings_booking_date, idx_bookings_client_id, idx_bookings_date_start, idx_bookings_staff_date, idx_bookings_status, idx_bookings_tenant_id, idx_bookings_yoco_checkout, idx_webhook_queue_created (+13 more)

### Community 45 - "use-toast.ts"
Cohesion: 0.15
Nodes (16): ToastActionElement, ToastProps, Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId() (+8 more)

### Community 46 - "send-booking-email/index.ts"
Cohesion: 0.13
Nodes (7): buildConsistencyEmailSection(), ConsistencyEmailContext, corsHeaders, escapeHtml(), getConsistencyEmailContext(), normalizePhone(), parseBookingServiceIds()

### Community 47 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 48 - "Homepage Journey Interaction Map"
Cohesion: 0.20
Nodes (9): 1. Add a homepage-only journey index, 2. Make the hero CTA initiate the journey, 4. Use the smallest layout adjustments possible, Acceptance criteria, Agreed experience, Expected file touchpoints, Homepage Journey Interaction Map, Important implementation recommendation (+1 more)

### Community 49 - "AdminSharedUI.tsx"
Cohesion: 0.10
Nodes (35): AccordionCard(), AdminHelp(), Callout(), Code(), FaqItem(), FAQS, GoogleCalGuide(), Link() (+27 more)

### Community 50 - "Book.tsx"
Cohesion: 0.15
Nodes (19): ConsultationQRenderer(), DetailsStep(), SplashScreen(), SplashScreenProps, StepIndicator(), StepIndicatorProps, steps, ThemeToggle() (+11 more)

### Community 51 - "SeoLandingPage.tsx"
Cohesion: 0.15
Nodes (12): PageContent, PageData, Section, SeoLandingPage(), usePageSEO(), BookingSoftwareSouthAfrica(), BusinessAnalytics(), BusinessGrowth() (+4 more)

### Community 52 - "vitest"
Cohesion: 0.12
Nodes (15): vite-plugin-pwa@0.21.1, lovable-tagger@^1.1.13, vite@^5.4.19, @vitejs/plugin-legacy@^5.4.3, @vitejs/plugin-react-swc@^3.11.0, vitest@^3.2.4, lovable-tagger, vite (+7 more)

### Community 53 - "AdminConsultations.tsx"
Cohesion: 0.23
Nodes (14): AdminConsultations(), answeredItems(), changeEntries(), ConsultationAnswerItem, ConsultationChangeEntry, ConsultationJsonFields, ConsultationRow, exportCSV() (+6 more)

### Community 54 - "usePublicServices.ts"
Cohesion: 0.23
Nodes (11): ServicesStep(), ServicesStepProps, StickyBottomBar(), StickyBottomBarProps, categoryLabel(), PublicService, ServiceCategory, usePublicCategories() (+3 more)

### Community 55 - "Login.tsx"
Cohesion: 0.13
Nodes (18): HOME_STYLES, MarketingLayoutProps, buildAdminUrl(), edgeFunctionHeaders(), edgeFunctionUrl(), getTenantSlug(), isCustomDomainHost(), LOVABLE_DOMAINS (+10 more)

### Community 56 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 57 - "AdminClientManagement.tsx"
Cohesion: 0.23
Nodes (12): AdminBlockedClients, AdminClientManagement(), AdminConsultations, AdminSpecialOccasions, AlertChip, AlertModalType, ProactiveAlertBanner(), Tab (+4 more)

### Community 58 - "generate-seo-pages.mjs"
Cohesion: 0.16
Nodes (10): baseHtml, dist, esc(), indexable, pages, patch(), root, schemaFor() (+2 more)

### Community 59 - "staff_availability"
Cohesion: 0.08
Nodes (23): idx_staff_availability_date, idx_staff_availability_day, idx_staff_availability_staff, staff_availability, update_staff_availability_updated_at, public.check_availability(), public.check_availability(), public.get_available_slots() (+15 more)

### Community 60 - "public.staff_availability"
Cohesion: 0.08
Nodes (22): idx_staff_avail_staff_date, idx_staff_avail_staff_day, public.acquire_slot_hold(), public.get_available_slots(), public.save_staff_daily_override(), public.get_month_availability(), public.get_month_availability(), public.check_availability() (+14 more)

### Community 61 - "date-fns"
Cohesion: 0.32
Nodes (5): date-fns, BookingConfirmation(), defaults, PublicBusinessConfig, usePublicBusinessConfig()

### Community 62 - "framer-motion"
Cohesion: 0.40
Nodes (5): framer-motion, AdminLogin(), AdminLoginProps, getTenantSlugFromUrl(), View

### Community 63 - "cn"
Cohesion: 0.20
Nodes (15): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DialogContent, DialogContentProps (+7 more)

### Community 64 - "usePayshapPayments.ts"
Cohesion: 0.31
Nodes (10): AdminPayshapQueue(), fadeUp, resolveAmountLabel(), resolveClaimedAmount(), PAYSHAP_QUERY_KEY(), PayshapBookingRow, useConfirmPayshapBooking(), usePayshapClaimQueue() (+2 more)

### Community 65 - "functions/_shared/security.ts"
Cohesion: 0.19
Nodes (5): VAULT_KEYS, buildCorsHeaders(), json(), timingSafeEqual(), verifyWebhookSignature()

### Community 66 - "Video call service — Full Build Scope & Blast-Radius Review"
Cohesion: 0.06
Nodes (33): 10. Final scope boundary, 11.2 Availability security and compatibility, 11.3 Payment — verified live calculation path, 11.4 Payment — verified UI and provider behaviour, 11.5 Payment — deployed Edge Function and webhook behaviour, 11.6 Confirmed implementation order after the trace, 11.7 Additional acceptance tests from the live trace, 11. Deeper live trace — production database and payment paths (+25 more)

### Community 67 - "toast.tsx"
Cohesion: 0.35
Nodes (9): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster() (+1 more)

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
Cohesion: 0.29
Nodes (7): FALLBACK_CONFIG, NotificationBell(), SectionLabel(), TYPE_CONFIG, AppNotification, playNotificationChime(), useRealtimeNotifications()

### Community 73 - "RevenueTrendCard.tsx"
Cohesion: 0.25
Nodes (10): EmptyState(), PERIOD_COMPARE_LABEL, PeriodLabel, PERIODS, Props, RevenueTrendCard(), RevenueTrendEntry, Skeleton() (+2 more)

### Community 74 - "SATenants.tsx"
Cohesion: 0.29
Nodes (10): CreateForm, CreateModal(), DeleteModal(), EditModal(), EMPTY_FORM, fmtDate(), GlassCard(), SATenants() (+2 more)

### Community 75 - "public.booking_items"
Cohesion: 0.06
Nodes (22): idx_booking_items_booking_id, idx_booking_items_tenant_id, public.record_mrr_snapshot(), public.get_revenue_per_minute(), public.get_attach_rate(), idx_saa_addon_id, idx_saa_service_id, public.service_addon_assignments (+14 more)

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

### Community 81 - "public.tenants"
Cohesion: 0.10
Nodes (13): public.get_nexty_business_context(), public.get_no_show_leakage(), public.get_quiet_day_analysis(), public.get_rebooking_rate_analysis(), public.get_no_show_leakage(), public.sync_tenant_business_name(), trg_sync_business_name, public.check_availability() (+5 more)

### Community 82 - "AdminAvailability.tsx"
Cohesion: 0.15
Nodes (24): 11.1 Availability — verified live details, Availability implementation consequences, AdminAvailability(), ALL_SLOTS, DayConfig, normaliseSlot(), normaliseSlots(), AvailabilitySlot (+16 more)

### Community 83 - "loyalty_tracker"
Cohesion: 0.09
Nodes (17): loyalty_tracker_tenant_email_unique, public.update_loyalty_tracker(), loyalty_tracker_tenant_phone_unique, public.update_loyalty_tracker(), consistency_guest_status, consistency_program_services, consistency_programs, public.recalculate_consistency_status() (+9 more)

### Community 84 - "public.user_roles"
Cohesion: 0.07
Nodes (23): on_auth_user_created, public.handle_new_user(), public.get_user_tenant_id(), public.has_role(), public.tenants, public.user_roles, public.is_tenant_admin(), public.calculate_booking_price() (+15 more)

### Community 85 - "planFeatureMap.ts"
Cohesion: 0.20
Nodes (7): ALL_FLAGS, FeatureStatus, flagKeys, PLAN_GROUPS, PlanFeature, PlanGroup, PLATFORM_TENANT_ID

### Community 86 - "SACohortRetention.tsx"
Cohesion: 0.29
Nodes (8): addMonths(), BookingRow, CohortMonth, labelForKey(), retentionColor(), SACohortRetention(), TenantRow, toYearMonth()

### Community 87 - "client.ts"
Cohesion: 0.13
Nodes (18): ENV_INFO, GlassCard(), NOTIF_LABELS, NotifPrefs, SASettings(), SectionHeader(), Booking, DiagIssue (+10 more)

### Community 88 - "SABookings.tsx"
Cohesion: 0.25
Nodes (7): DATE_RANGES, FlaggedPayment, fmt(), PlatformTotals, SABookings(), STATUS_META, TenantStat

### Community 89 - "SAFeatureAdoption.tsx"
Cohesion: 0.28
Nodes (8): adoptionColor(), avg(), BookingStat, FEATURE_LABELS, FeatureSummary, FeatureUsageRow, SAFeatureAdoption(), TenantRow

### Community 90 - "SABroadcast.tsx"
Cohesion: 0.33
Nodes (4): Broadcast, BROADCAST_TYPES, BType, TYPE_COLOR

### Community 91 - "app_settings"
Cohesion: 0.12
Nodes (13): trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger, trigger_yoco_webhook_registration(), yoco_webhook_registration_trigger (+5 more)

### Community 92 - "payfast-itn/index.ts"
Cohesion: 0.28
Nodes (5): corsHeaders, ipToInt(), isIpInCidr(), isValidPayfastIp(), PAYFAST_VALID_IPS

### Community 93 - "Call-out fee waiver"
Cohesion: 0.25
Nodes (7): Audit, Call-out fee waiver, Eligibility and safeguards, Financial behaviour, Purpose, Restoration, Security and scope

### Community 95 - "SASystemHealth.tsx"
Cohesion: 0.60
Nodes (4): Check, GlassCard(), pingTable(), SASystemHealth()

### Community 96 - "class-variance-authority"
Cohesion: 0.38
Nodes (5): class-variance-authority, Label, labelVariants, Toggle, toggleVariants

### Community 97 - "Index.tsx"
Cohesion: 0.11
Nodes (17): 3. Give the five destinations stable IDs, Existing implementation findings, CarouselDots(), CaseStudySection(), CTASection(), FeaturesSection(), GROUPS, HeroSection() (+9 more)

### Community 98 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 99 - "sheet.tsx"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 100 - "TrialExpiredPaywall.tsx"
Cohesion: 0.50
Nodes (3): Props, tiers, TrialExpiredPaywall()

### Community 104 - "types.ts"
Cohesion: 0.10
Nodes (23): ACTION_COLOR, ACTION_ICON, AuditLog, fmtDate(), SAAuditLog(), AppRole, EditRoleModal(), GlassCard() (+15 more)

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
Cohesion: 0.26
Nodes (8): lucide-react, SuperAdmin, SuperAdminLogin(), GlassCard(), SAOverview(), Stats, useShellBackground(), SuperAdmin()

### Community 111 - "20260308214728_abe41b98-2217-4182-8511-10a994985858.sql"
Cohesion: 0.11
Nodes (10): booking_items, idx_booking_items_booking, idx_booking_items_service, public.get_app_setting(), public.get_available_slots(), public.get_client_history(), public.get_month_availability(), public.get_returning_clients_count() (+2 more)

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

### Community 121 - "book-a-glow — NextSlot"
Cohesion: 0.40
Nodes (4): book-a-glow — NextSlot, Environment Variables, Local Development, Stack

### Community 122 - "payments"
Cohesion: 0.11
Nodes (17): idx_payments_booking, idx_payments_client, idx_payments_created, idx_payments_status, payments, update_payments_updated_at, idx_payments_gateway, get_returning_clients_count() (+9 more)

### Community 123 - "display-cards.tsx"
Cohesion: 0.50
Nodes (4): DisplayCard(), DisplayCardProps, DisplayCards(), DisplayCardsProps

### Community 124 - "public.profiles"
Cohesion: 0.09
Nodes (14): idx_profiles_role, idx_profiles_tenant_id, public.get_loyalty_gap_analysis(), get_loyalty_gap_analysis(), public.get_loyalty_gap_analysis(), public.get_nexty_outside_candidates(), public.bookings_with_client, public.current_tenant_id() (+6 more)

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

### Community 130 - "TenantContext.tsx"
Cohesion: 0.13
Nodes (15): AdminConsistencyPricing(), daysAgo(), GuestStatusRow, NumberField(), ProgramRow, ProgramServiceRow, ServiceRow, UnavailableService (+7 more)

### Community 131 - "public.payments"
Cohesion: 0.14
Nodes (9): idx_payments_booking_id, idx_payments_client_id, idx_payments_tenant_id, public.acquire_slot_hold(), public.reject_payshap_booking(), public.release_failed_gateway_booking(), public.cancel_expired_pending_bookings(), payments_ikhokha_transaction_id_uidx (+1 more)

### Community 132 - "20260524123735_platform_billing_tables.sql"
Cohesion: 0.26
Nodes (10): idx_platform_invoices_due, idx_platform_invoices_status, idx_platform_invoices_tenant, idx_platform_payments_invoice, idx_platform_payments_tenant, platform_invoices, platform_payments, set_updated_at() (+2 more)

### Community 134 - "ikhokha-checkout/index.ts"
Cohesion: 0.67
Nodes (3): buildSignature(), corsHeaders, jsStringEscape()

### Community 138 - "20260307083447_009_add_tenant_id_to_missing_tables.sql"
Cohesion: 0.17
Nodes (7): idx_app_settings_tenant, idx_consultations_tenant, idx_loyalty_tracker_tenant, idx_reviews_cache_tenant, idx_staff_availability_tenant, idx_stock_inventory_tenant, idx_webhook_queue_tenant

### Community 139 - "react"
Cohesion: 0.18
Nodes (8): react, Button, ButtonProps, buttonVariants, Calendar(), CalendarProps, Input, Separator

### Community 140 - "20260403214318_platform_events_and_mrr_engine.sql"
Cohesion: 0.48
Nodes (6): idx_mrr_snapshots_month, idx_platform_events_event, idx_platform_events_recorded_at, idx_platform_events_tenant_event, public.mrr_snapshots, public.platform_events

### Community 141 - "20260524135812_platform_billing_followup_fixes.sql"
Cohesion: 0.20
Nodes (5): public.is_super_admin(), public.sa_platform_billing_overview, platform_invoices_due_status_idx, platform_invoices_tenant_billing_month_uidx, public.platform_billing_config

### Community 142 - "useClientAlerts.ts"
Cohesion: 0.31
Nodes (8): AdminDashboardViewProps, ClientAlertsModalProps, ClientAlerts, InactiveClient, OverdueLoyaltyClient, useClientAlerts(), buildClientIdentityKeys(), ClientIdentityRow

### Community 146 - "IntegrationsGuidePanel.tsx"
Cohesion: 0.47
Nodes (9): Callout(), FieldRef(), GoogleCalGuide(), GuidePanelProps, IntegrationsGuidePanel(), SectionHeader(), SmtpGuide(), Step() (+1 more)

### Community 150 - "FirstBookingCelebration.tsx"
Cohesion: 0.53
Nodes (4): fireConfetti(), FirstBookingCelebration(), loadConfetti(), seenKey()

### Community 152 - "notifications"
Cohesion: 0.24
Nodes (8): booking_notification_trigger, notifications, notifications_tenant_id_created_at_idx, notify_on_booking_event(), idx_loyalty_tracker_tenant_id, idx_notifications_tenant_id, idx_payments_tenant_id, idx_profiles_tenant_id

### Community 154 - "DashboardPreview.tsx"
Cohesion: 0.25
Nodes (6): DashboardPreviewProps, kpiData, maxRev, revenueWeeks, sources, topServices

### Community 157 - "20261029202959_restore_call_out_fee.sql"
Cohesion: 0.33
Nodes (4): public.booking_callout_fee_waivers, public.waive_call_out_fee(), nextslot_private.restore_call_out_fee_atomic(), public.booking_callout_fee_restorations

### Community 161 - "billing_queue"
Cohesion: 0.60
Nodes (5): billing_queue, billing_queue_billing_month_idx, billing_queue_created_at_idx, billing_queue_status_idx, billing_queue_tenant_id_idx

### Community 162 - "20260929231952_guest_consultations_stage1.sql"
Cohesion: 0.47
Nodes (4): idx_guest_consultations_tenant, public.guest_consultations, public.guest_name_aliases, public.guest_person_key()

### Community 166 - "public.blocked_clients"
Cohesion: 0.70
Nodes (4): blocked_clients_email_idx, blocked_clients_phone_idx, blocked_clients_tenant_id_idx, public.blocked_clients

## Knowledge Gaps
- **177 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminCalendar.tsx`, `AdminStock.tsx`, `TenantContext.tsx`, `AdminLoyalty.tsx`, `SetupChecklistPaymentGate.tsx`, `AdminSidebar.tsx`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `dependencies`, `lucide-react`, `App.tsx`, `useTenant`, `Resources.tsx`, `Admin.tsx`, `client.ts`, `AdminDashboard.tsx`, `package.json`, `IntegrationsGuidePanel.tsx`, `AdminCommunications.tsx`, `FirstBookingCelebration.tsx`, `ReviewStep.tsx`, `@tanstack/react-query`, `DashboardViews.tsx`, `AdminBilling.tsx`, `Pricing.tsx`, `homepage-journey.test.tsx`, `SuperAdminShell.tsx`, `SARevenue.tsx`, `BusinessThemeProvider.tsx`, `useSupabaseDashboard.ts`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `Onboarding.tsx`, `use-admin-viewport.ts`, `use-toast.ts`, `AdminSharedUI.tsx`, `Book.tsx`, `SeoLandingPage.tsx`, `AdminConsultations.tsx`, `usePublicServices.ts`, `Login.tsx`, `AdminClientManagement.tsx`, `framer-motion`, `cn`, `usePayshapPayments.ts`, `toast.tsx`, `SATenantHealth.tsx`, `NotificationBell.tsx`, `RevenueTrendCard.tsx`, `SATenants.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `client.ts`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `SABroadcast.tsx`, `SASystemHealth.tsx`, `class-variance-authority`, `Index.tsx`, `sheet.tsx`, `TrialExpiredPaywall.tsx`, `types.ts`, `lucide-react`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `AdminStock.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10037878787878787 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `AdminCalendar.tsx`, `AdminStock.tsx`, `TenantContext.tsx`, `AdminLoyalty.tsx`, `SetupChecklistPaymentGate.tsx`, `AdminSidebar.tsx`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `dependencies`, `lucide-react`, `App.tsx`, `useTenant`, `react`, `Resources.tsx`, `Admin.tsx`, `client.ts`, `AdminDashboard.tsx`, `package.json`, `IntegrationsGuidePanel.tsx`, `AdminCommunications.tsx`, `FirstBookingCelebration.tsx`, `ReviewStep.tsx`, `@tanstack/react-query`, `AdminMetricExplanation.tsx`, `AdminBilling.tsx`, `DashboardPreview.tsx`, `homepage-journey.test.tsx`, `DashboardViews.tsx`, `SuperAdminShell.tsx`, `SARevenue.tsx`, `Pricing.tsx`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `Onboarding.tsx`, `AdminSharedUI.tsx`, `Book.tsx`, `SeoLandingPage.tsx`, `AdminConsultations.tsx`, `usePublicServices.ts`, `Login.tsx`, `AdminClientManagement.tsx`, `date-fns`, `framer-motion`, `cn`, `usePayshapPayments.ts`, `toast.tsx`, `SATenantHealth.tsx`, `NotificationBell.tsx`, `RevenueTrendCard.tsx`, `SATenants.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `client.ts`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `SABroadcast.tsx`, `SASystemHealth.tsx`, `sheet.tsx`, `TrialExpiredPaywall.tsx`, `types.ts`, `display-cards.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `AdminLoyalty.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05103785103785104 - nodes in this community are weakly interconnected._
- **Why does `supabase` connect `client.ts` to `AdminCalendar.tsx`, `AdminStock.tsx`, `TenantContext.tsx`, `AdminLoyalty.tsx`, `SetupChecklistPaymentGate.tsx`, `lucide-react`, `feature-flags/SAFeatureFlags.tsx`, `useTenant`, `App.tsx`, `useTenant`, `useClientAlerts.ts`, `useNextyInsights.ts`, `Admin.tsx`, `AdminCommunications.tsx`, `FirstBookingCelebration.tsx`, `ReviewStep.tsx`, `@tanstack/react-query`, `AdminBilling.tsx`, `Pricing.tsx`, `SARevenue.tsx`, `BusinessThemeProvider.tsx`, `useSupabaseDashboard.ts`, `DetailsStep.tsx`, `AdminIntegrations.tsx`, `Onboarding.tsx`, `AdminSharedUI.tsx`, `Book.tsx`, `AdminConsultations.tsx`, `usePublicServices.ts`, `Login.tsx`, `AdminClientManagement.tsx`, `date-fns`, `framer-motion`, `usePayshapPayments.ts`, `SATenantHealth.tsx`, `NotificationBell.tsx`, `SATenants.tsx`, `AdminAvailability.tsx`, `SACohortRetention.tsx`, `client.ts`, `SABookings.tsx`, `SAFeatureAdoption.tsx`, `SABroadcast.tsx`, `SASystemHealth.tsx`, `types.ts`, `lucide-react`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `ref_https` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `AdminSidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08392603129445235 - nodes in this community are weakly interconnected._