# NextSlot current positioning and video-consultation messaging angles

Sources are repository files (no web sources). Line numbers refer to the working tree at `/home/user/book-a-glow` on the checked-out branch at the time of research. Citations use `path:line`.

## 1. What the public marketing pages say about the audience

### Takeaway
NextSlot's public positioning is "independent service businesses", with a three-word brand line ("Record. Understand. Grow.") and a promise of one place for bookings, payments, clients and business activity. The phrase "facilitate consulting" does not appear in any marketing page. The closest wording is a list of trades that includes "consulting". Legal copy describes NextSlot as an intermediary that does not provide the underlying services, which is the strongest existing constraint on how the video feature can be described.

### Cited Findings
- Hero eyebrow: "For independent service businesses" — `src/components/home/HeroSection.tsx:16`
- Hero H1: "Record. Understand. Grow." — `src/components/home/HeroSection.tsx:17`
- Hero description: "NextSlot brings your bookings, payments, clients and business activity into one place, so you can see what is happening and make better decisions about what comes next." — `src/components/home/HeroSection.tsx:18`
- Hero supporting line: "Built for independent service businesses · Proudly made in Cape Town, South Africa." — `src/components/home/HeroSection.tsx:21`
- Audience section H2: "Built for <span>independent</span> service businesses." — `src/components/home/WhoItsForSection.tsx:54`
- Audience section paragraph: "From beauty and barbering to consulting, photography and tattooing, NextSlot helps you manage bookings. Work on the move? It automatically calculates your call-out fee, too." — `src/components/home/WhoItsForSection.tsx:55` (the only marketing line naming consulting; it is a trade in a list, not a claim that NextSlot facilitates consulting)
- Fit section H2 on SEO landing pages: "Built for independent service businesses." — `src/components/site/SeoLandingPage.tsx:68`
- About page pull quote: "Built for independent service businesses." — `src/pages/About.tsx:297`
- About page body: "NextSlot is designed to work quietly in the background, bringing bookings, payments, clients and activity into one place. Not overly complex. Not disconnected. Just useful, thoughtful technology that helps businesses move forward." — `src/pages/About.tsx` (body copy, same block as line 297)
- About page: "A booking could arrive through WhatsApp." — `src/pages/About.tsx:161`
- Footer description: "Online booking and business management software for independent service businesses." — `src/components/site/SiteFooter.tsx:14`
- Terms of Service, the legal positioning: "NextSlot provides an online booking and management platform for independent service providers. We act as an intermediary and do not provide the underlying services (e.g., haircuts, beauty treatments, photography). The contract for services is between you and the relevant Service Provider." — `src/pages/SiteTerms.tsx:59`
- Terms definition of Service Provider: "barbers, beauticians, photographers, tattoo artists, and other professionals using NextSlot." — `src/pages/SiteTerms.tsx:49`
- Pricing, Studio plan (marked `comingSoon: true`): "A shared space for independent service providers, with clear operational oversight and no interference in how they run their businesses." — `src/pages/Pricing.tsx:262`; subline "For space owners hosting independent service providers." — `src/pages/Pricing.tsx:263`
- Home pricing preview, Studio card: "Independent providers. Clear oversight." — `src/components/home/HomePricingPreview.tsx:10`

Terminology note: the public site uses "independent service businesses" for the audience, while the legal terms use "independent service providers" and "Service Provider". Both appear; marketing should keep to the first.

### Inferences
- The audience claim is "independent service businesses", not "consultants". Consulting is one trade in a list, so a video-consultation angle should be framed as an extra delivery mode for these businesses, not as a new vertical.
- The Terms define NextSlot as an intermediary. Any copy that says NextSlot runs, hosts or delivers the call contradicts the legal position as well as the build spec.
- "Built for ... " is the dominant headline pattern. Video copy should extend it rather than introduce a new headline structure.

### Gaps
- No marketing page uses the phrase "facilitate consulting" or any close variant. The request's premise is not supported by the repo. The nearest claims are "NextSlot helps you manage bookings" (`WhoItsForSection.tsx:55`) and "NextSlot facilitated bookings and business growth" (`src/components/home/CaseStudySection.tsx:107`, also `src/pages/About.tsx:465`). The latter is a customer result, see Section 3.
- No public page currently mentions video, calls or online consultations (grep of `src/components/home`, `src/components/site`, `src/pages/About.tsx`, `src/pages/Pricing.tsx`, `src/pages/Resources.tsx`, `src/pages/Index.tsx` for "video" returned nothing).

## 2. Live features that can support proof points

### Takeaway
The repo confirms the booking, payment, notification and WhatsApp-link building blocks for video consultations, but the video feature is only partly implemented. Marketing should describe only what is shipped and gated behind the tenant feature flag.

### Cited Findings
- Real-time slot availability is listed as a plan feature: "Real-time slot availability" — `src/pages/Pricing.tsx:302`
- Availability setup is part of onboarding copy: "Add your services, set your availability, connect your payment method, and share your booking link." — `src/pages/Pricing.tsx:415`
- Tenant-level availability admin with a "Video calls" schedule mode: `src/components/admin/AdminAvailability.tsx:302` (`value: "consultation", label: "Video calls"`), gated by `useVideoConsultationsEnabled` at `src/components/admin/AdminAvailability.tsx:57`
- Video-call services are flagged in the service model and migrations: `supabase/migrations/20261114214957_video_consultation_service_flag.sql`, plus `supabase/migrations/20261114222947_video_release_booking_functions.sql`
- Per-tenant gate: `src/hooks/useVideoConsultationsEnabled.ts:29` reads `flagSettingKey("video_consultations")`; `src/hooks/useVideoConsultationsEnabled.test.ts:19` asserts it is tenant-only, not a global flag
- Video services are hidden from the public catalogue unless the flag is on: `src/components/ServicesStep.tsx:42`
- Booking-email wording for video bookings: calendar location is replaced with "Online video consultation" (`supabase/functions/send-booking-email/index.ts:1107`); the comment at lines 978-979 says the client does not travel and physical bookings are unchanged
- Calendar invite attachment (`appointment.ics`, `text/calendar; method=REQUEST`) is sent only when the tenant setting `feature_flag_add_to_calendar` is `"true"`: `supabase/functions/send-booking-email/index.ts:1003` and `:1547`
- WhatsApp contact helpers exist: `src/lib/videoConsultation.ts:17` (`toWhatsAppDigits`) and `src/lib/videoConsultation.ts:40` (`buildWhatsAppContactUrl`). Their use in the tenant booking view is referenced via `src/components/admin/AdminBookings.tsx` in the video-flag file list; I did not confirm the rendered link in that component.
- The public site already advertises WhatsApp as a contact channel: "Chat with us on WhatsApp" — `src/components/home/CTASection.tsx:45`; `src/pages/About.tsx:496`
- Guest booking (no client account), from the build spec's live-database trace: "`create_booking_with_consultation` (29-arg, hold-aware) and the slot, hold and price functions have no `auth.uid()` gate and are anon-executable." — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:474` (section 12, read-only production check dated 14 November 2026)
- Calendar and availability listed on the home proof strip: "Calendar & availability" — `src/components/home/ProofTicker.tsx:8`
- Automatic call-out fee calculation is a Professional-plan feature: "Automatic call-out fee calculation" — `src/components/home/HomePricingPreview.tsx:9`. Video services must not carry call-out fees (build spec section 4.1, `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:84`), so copy must not imply call-out logic applies to video calls.
- Payment choices (full or deposit) already exist for ordinary services per the build spec (`docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:126`, section 4.4), with the tenant-wide deposit setting unchanged.

Build status, from `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md`:
- Line 7 and line 288 describe the document as a build specification, and say the planning branch contains only the spec, not implementation.
- The repo contains partial implementation (migrations, `src/lib/videoConsultation.ts`, `AdminAvailability.tsx`, email branch). The spec's own status line therefore looks out of date. Treat shipped status as unconfirmed until the branch is verified.
- Spec line 239 says the pilot is PhenomeBeauty with a tenant-scoped gate, and line 293 says the feature is off for all tenants by default.

### Inferences
- Safe, repo-backed proof points: guest booking through the public flow, existing payment choices, separate availability for video hours, booking emails, WhatsApp contact link for the tenant.
- Calendar invites are conditional on a tenant setting, so copy should not promise an invite unless the tenant has it on.
- Marketing should wait until the tenant flag is on for a given customer and the PhenomeBeauty pilot is verified. Until then, any video copy is pre-launch and needs to be labelled as such.

### Gaps
- Guest booking is confirmed by the build spec's read-only trace, not by a test or a live check run for this note. Re-verify before publishing.
- Whether the tenant booking view renders the WhatsApp link for video bookings was not confirmed by reading `AdminBookings.tsx`.
- No evidence in the repo of a public customer-facing video page. Public pages do not mention video.

## 3. Language to avoid

### Takeaway
Avoid anything that makes NextSlot the party running, hosting or joining the call, or that implies a video link is generated. The spec and the Terms both say the tenant starts the call in WhatsApp or the device's calling app.

### Cited Findings
- Spec: "**NextSlot facilitates the service booking and scheduling. The call itself is handled by the tenant's calling app/device.**" — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:21`
- Spec: "There is no managed meeting product." — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:23`
- Spec non-goals: no meeting provider integrations, meeting IDs, rooms, in-app WebRTC, call recording, or automated WhatsApp messages — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:29-35`
- Spec: "The existing calendar invitation remains the booking's normal calendar invitation. It is not a video meeting link and must not imply that NextSlot generates one." — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:39`
- Spec: "Do not pre-send a message, initiate an automated call, or claim that the hyperlink starts a video call." — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:164`
- Spec, WhatsApp: "The tenant clicks the number, initiates the WhatsApp call and switches to video in WhatsApp. NextSlot does not host the call." — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:165`
- Spec, acceptance: "Tenant manually starts the WhatsApp call and switches to video." — `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:274`
- Terms: "We act as an intermediary and do not provide the underlying services" — `src/pages/SiteTerms.tsx:59`

Avoid these phrases (with the reason):
- "hosted call", "host your consultation", "NextSlot hosts", "we run the call": contradicts spec §1, §2 and the Terms intermediary wording.
- "video room", "meeting link", "join link", "meeting ID", "Zoom/Meet link included", "automatic video link": spec §2 forbids meeting infrastructure and generated links.
- "start a call from NextSlot", "one-click video", "call button", "built-in video", "video calling in NextSlot": implies in-app calling, which is a non-goal.
- "we message your client on WhatsApp", "automatic WhatsApp reminders for your call": automated WhatsApp messages are a non-goal (`docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:33`).
- "Your calls are recorded/monitored", "secure video": call recording and monitoring are non-goals, and there is no evidence for "secure" delivery of the call.
- "Calendar invite with the call link": the invite contains no video link; the email location reads "Online video consultation" (`supabase/functions/send-booking-email/index.ts:1107`).
- "Telehealth", "virtual clinic", "medical consultation": not supported by the repo, and implies regulatory scope NextSlot has not assessed.
- "Video consultations are live for everyone" or "available now": the feature is tenant-gated and off by default (`docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:293`).
- "Included on your plan": plan changes are out of scope (`docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:294`).
- "Save on call-out fees for video": call-out does not apply to video services, so there is no fee to save. Do not link video to call-out.
- Customer results such as "R63,851 over 90 days" (`src/pages/About.tsx:465`) in video copy: a single case study, not evidence for this feature.

Preferred words: "video-call service", "video consultation booking", "book a call", "you contact the client on WhatsApp", "you start the call on your device", "online consultation", "appointment day".

### Inferences
- The safest, most accurate verb pattern is "NextSlot handles the booking; you run the call." Every headline should keep the tenant as the one who makes the call.

### Gaps
- No legal review of consumer or professional-services claims was found in the repo. Copy about consultation outcomes or professional advice should be checked by the company before use.

## 4. Proposed messaging angles and headline/subhead pairs

### Takeaway
Five angles extend the existing "one place for bookings, payments, clients and business activity" promise and the "independent service businesses" audience. Each keeps the tenant as the party who runs the call. All are pre-launch drafts until the feature flag and pilot are confirmed.

### Angles

1. **Same booking, new delivery mode.** Extends "bookings, payments, clients ... into one place". Video calls are one more service in the normal flow.
   - Headline: "Sell your time by the call, not just the chair."
   - Subhead: "Video consultations sit alongside your other services. Clients book and pay online as guests, and you take the call on your own WhatsApp."
   - Proof: guest booking, existing payment choices, existing booking emails.

2. **Separate hours without a second calendar.** Extends "Real-time slot availability" and "set your availability".
   - Headline: "Your video hours, separate from your studio hours."
   - Subhead: "Set call times on their own schedule. Physical appointments and consultations can share a day, and one never blocks the other."
   - Proof: video-call availability mode in `AdminAvailability.tsx:302`. Confirm the separate-schedule behaviour is live before use.

3. **No account for the client.** Extends the simple "Built for independent service businesses" promise into the client side.
   - Headline: "Clients book a call in a few taps, no login needed."
   - Subhead: "Guests pick a time, enter their details and pay. You get the booking, the email and the client's number."
   - Proof: guest booking (`docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:474`). Re-verify on the live database before use.

4. **Your expertise, your channel.** Extends "From beauty and barbering to consulting ... NextSlot helps you manage bookings" with consulting-type providers, without claiming NextSlot runs the call.
   - Headline: "Advice, check-ins and consultations, booked in one place."
   - Subhead: "NextSlot takes the booking and payment. When the time comes, you call your client on WhatsApp and switch to video."
   - Proof: WhatsApp link helper (`src/lib/videoConsultation.ts:40`); manual start in the spec (`docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:165`).

5. **Clear about who does what.** Extends the intermediary language in the Terms, and suits trust-building in the "Clear oversight" and "no interference" tone of the Studio copy.
   - Headline: "We handle the booking. You keep the relationship."
   - Subhead: "NextSlot manages your video-call bookings, payments and reminders. The call itself stays in your own WhatsApp or calling app."
   - Note: "reminders" is in the subhead as a booking-email claim only. Confirm which reminder emails exist before use, or remove the word.

### Inferences
- Angles 1 and 4 are the strongest fit with the current "Record. Understand. Grow." and "independent service businesses" language, because they keep the same audience and add a delivery mode.
- Angle 5 is the most accurate and the least likely to create a claim the product does not meet, so it is the safest default for a first release.
- Use the same audience line everywhere ("independent service businesses") rather than adding a consulting headline.

### Gaps
- No A/B or customer research in the repo on which angle lands. These are drafts derived from repo copy, not tested messaging.
- No confirmed pricing or plan placement for video. Plan changes are out of scope per the spec.
- The Studio plan is `comingSoon: true` and targets space owners, so do not use Studio copy for video messaging.

## Key checks before any copy goes live
- Confirm the tenant flag `video_consultations` is on for the customer and that the pilot has passed the acceptance tests in `docs/VIDEO_CONSULTATION_BUILD_SCOPE.md:242-284`.
- Confirm `feature_flag_add_to_calendar` before saying a calendar invite is sent.
- Re-verify guest booking and the WhatsApp link on the live branch.
- Keep the intermediary language from `src/pages/SiteTerms.tsx:59` consistent with any new copy.
