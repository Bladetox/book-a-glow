# Phase 1: NextSlot Marketing Website Baseline Audit

**Repository:** `Bladetox/book-a-glow`  
**Branch reviewed:** `marketing-seo-realignment`  
**Audit type:** Source and information-architecture review  
**Status:** Baseline findings documented; visual/browser QA remains to be completed  
**Scope:** Marketing and SEO experience only. No product, booking, tenant, payment, authentication, or admin behaviour changes.

## Executive summary

The current marketing site already has a strong foundation: a distinctive warm-light visual system, a concise hero, the Record / Understand / Grow narrative, product visuals, a PhenomeBeauty case-study preview, and clear signup/contact actions.

The biggest opportunity is not a wholesale redesign. It is to make the visitor's decision journey more complete and easier to scan.

The homepage currently presents this order:

1. Hero
2. Proof ticker
3. How NextSlot works / three-stage explanation
4. Revenue dashboard preview
5. Availability heatmap
6. PhenomeBeauty case-study preview
7. Final CTA

This sequence explains the product, but it does not yet answer all five visitor questions on the homepage. There is no concise pricing preview, the audience is named in the hero but not explored in a dedicated section, and the case-study evidence arrives after several product sections. The visitor must use the global navigation to find pricing or the full case study.

The shared navigation currently labels `/demo` as **Demo**, whereas the agreed marketing language is **How it works**. The existing routes and primary actions otherwise provide a useful base for the journey.

**Recommended direction:** keep the existing brand, copy foundations, product visuals and supporting pages. Improve the order and completeness of the homepage story, then introduce a compact five-question in-page navigation only after its desktop/mobile treatment is validated. Keep it distinct from the global site navigation.

## Visitor journey map

| Visitor question | Current homepage support | Assessment | Opportunity |
|---|---|---|---|
| **Who is this for?** | Hero eyebrow says “For independent service businesses”; supporting line repeats that positioning. | Present but brief. Visitors in less visually obvious categories may not immediately recognise themselves. | Add a short, inclusive audience cue or compact examples of appointment-based services. Do not turn it into a long industry list. |
| **How does it work?** | Three-stage Capture / Understand / Grow section, revenue preview and heatmap. | Strongest part of the current journey, though the explanation is spread across several sections. | Keep the existing product story and visuals, but ensure each section adds a distinct piece of understanding rather than repeating the same benefit. |
| **Has anyone used it, and what happened?** | PhenomeBeauty preview with Shu-meez, a revenue figure and link to the full story. | Real-world evidence exists, but it appears after several product-focused sections. Some claims need contextual framing so visitors understand the period and what the number represents. | Bring a concise proof preview closer to the initial product explanation. Verify wording and context for all figures before changing presentation. |
| **What does it cost?** | Pricing is available through the global navigation and dedicated `/pricing` page. | The homepage does not answer this question directly. A visitor must leave the page to discover the cost. | Add a compact pricing preview with accurate starting prices, trial periods and a link to full comparison. |
| **How do I get started?** | Hero “See how it works”, global “Start for free”, final CTA with “Start for free” and “Talk to us”. | Clear action paths exist. The final CTA also says “No payment required · Free trial · Cancel anytime”; these conditions should remain accurate and consistent with plan-specific trial terms. | Preserve the CTA design and destinations. Make the homepage's final step feel like a natural decision, not a new pitch. |

## Findings and priority

### Critical / resolve before release

No critical defect can be confirmed from this source-only review. A browser-based review is still required to establish whether any live rendering, navigation or signup defect should be classified as critical.

### High priority

#### 1. Homepage does not answer all five questions

**Evidence:** The homepage component sequence in `src/pages/Index.tsx` includes Hero, ProofTicker, Features, Revenue, Heatmap, CaseStudy and CTA. It has no pricing preview section.

**Impact:** Visitors who want a quick price check must navigate away from the homepage. The homepage is therefore not yet the concise, complete version of the full decision story.

**Recommendation:** Include a restrained pricing preview in the homepage journey. Keep the full comparison and terms on `/pricing`; do not duplicate the entire pricing matrix.

#### 2. Real-world proof arrives late in the homepage sequence

**Evidence:** `CaseStudySection` follows Features, Revenue and Heatmap. It includes Shu-meez / PhenomeBeauty, a revenue statement and a link to the full case study.

**Impact:** Visitors must process multiple product sections before reaching the clearest human example of use.

**Recommendation:** Test moving a concise PhenomeBeauty preview directly after the first explanation of how NextSlot works. The dashboard and heatmap can then provide additional product detail. Preserve verified context and avoid implying guaranteed outcomes.

#### 3. Global navigation terminology differs from the agreed visitor language

**Evidence:** `src/components/site/SiteHeader.tsx` labels the `/demo` route “Demo”. The agreed visitor-facing label is “How it works”.

**Impact:** “Demo” describes a format; “How it works” answers the visitor's question more directly and matches the proposed journey.

**Recommendation:** Consider changing only the visible label to “How it works”, keeping the existing `/demo` route and its functionality unchanged.

#### 4. The five-question navigation needs a mobile-safe interaction design

**Evidence:** The homepage supports hash-based deep links, including `/#how-nextslot-works`, but it currently has no five-question journey navigation.

**Impact:** A persistent five-item bar could improve direct access, but on mobile it could become cramped or compete with the main navigation if implemented without responsive testing.

**Recommendation:** Prototype a restrained secondary in-page navigation. Use real section anchors, readable touch targets, accessible focus behaviour and correct scroll offsets. Do not implement a tiny five-column mobile bar. Compare a compact horizontal scroll pattern with an alternative mobile treatment before deciding.

### Medium priority

#### 5. Audience breadth could be more explicit

**Evidence:** The hero communicates “independent service businesses”, while the About page includes a broader image and story about service businesses. The homepage itself does not provide a short set of recognisable examples near the top.

**Impact:** A barber, tattoo artist, photographer, consultant or mobile provider may not immediately know the product is intended for their type of business.

**Recommendation:** Add a short audience cue near the hero or in a dedicated compact section, using a few examples rather than an exhaustive catalogue. Keep the message inclusive of any independent business that takes bookings.

#### 6. Pricing and trial statements should be consistent across pages

**Evidence:** The pricing page source defines Starter at R99 with a 7-day trial, Flow at R399 with a 30-day trial, and Professional at R699 with a 30-day trial. The homepage CTA says “Free trial” and “Cancel anytime”.

**Impact:** Generic trial language can leave visitors unsure which trial applies to a plan.

**Recommendation:** When adding a pricing preview, state the plan and trial details exactly as maintained on the pricing page. Confirm the current commercial terms before release; this source audit does not independently verify live billing behaviour.

#### 7. Repeated final CTA patterns deserve a consistency pass

**Evidence:** The homepage, About, Case Study, Resources and Pricing pages use repeated “Ready to start?” / booking-page CTA patterns, while the homepage has a separate “Ready to grow?” final section.

**Impact:** Repetition can be useful, but inconsistent wording or styling can make the experience feel stitched together.

**Recommendation:** Keep the homepage's “Ready to grow?” story and preserve the existing CTA destinations. During the shared-component pass, compare button appearance, focus states, spacing and wording across all marketing pages before changing any copy.

### Validation required

These items cannot be confirmed reliably from source inspection alone:

- Current desktop, tablet and mobile visual hierarchy and readability.
- Whether any section causes horizontal overflow, awkward wrapping or unexpected whitespace at real viewport sizes.
- Sticky-header behaviour and anchor landing positions on mobile.
- Keyboard and screen-reader behaviour of the mobile navigation and CTAs.
- Actual page performance, Core Web Vitals, and image-loading impact.
- Current live metadata, canonical tags, structured data and sitemap coverage for each marketing route.
- Current conversion data, analytics event coverage and which visitor questions are most commonly sought first.

Do not treat these as confirmed defects until tested.

## Page-by-page role map

| Page | Intended role in the journey | Baseline assessment |
|---|---|---|
| **Homepage `/`** | Concise answer to all five questions, with links to deeper detail. | Strong product narrative and visuals; missing pricing preview; proof arrives relatively late. |
| **How it works `/demo`** | Detailed explanation and interactive product walkthrough. | Has an interactive dashboard presentation and signup/pricing links. Visible navigation currently calls it “Demo”. |
| **Case study `/case-study/phenomebeauty`** | Full story, context and evidence for PhenomeBeauty. | Dedicated page and timeline exist. Review claim context and evidence wording as a separate content verification task. |
| **Pricing `/pricing`** | Plan comparison, prices, trial details, terms and signup routes. | Detailed plan comparison exists. The depth is appropriate here, but the homepage should give visitors a short initial answer. |
| **About `/about`** | Origin, purpose and audience context. | Communicates the real-world problem and includes service-provider imagery. Avoid making it compete with the homepage for the primary product explanation. |
| **Resources `/resources`** | Educational content and tools for independent business owners. | Rich content library with tools and articles. Treat as a discovery/support destination, not a required step in the conversion journey. |
| **Login `/login`** | Existing-customer entry. | Keep separate from acquisition messaging. |
| **Onboarding `/onboarding`** | Direct signup route. | Preserve current route and functionality. |

## Brand and implementation guardrails

The audit supports retaining the existing direction:

- Warm light editorial palette and restrained gold accents.
- Existing NextSlot typography, logo and visual identity.
- “Record. Understand. Grow.” as the central product narrative.
- Existing dashboard, availability heatmap, Nexty orb and PhenomeBeauty story.
- Concise, scannable sections rather than a feature catalogue.
- Consistent existing CTA styling and destinations.
- No fabricated outcomes or unsupported proof.

Keep changes confined to marketing and SEO pages. Do not modify booking flows, tenant routing, payments, authentication, admin behaviour or business logic as part of this work.

## Phase 1 recommendation

Proceed in this order:

1. Confirm the five-question journey as the homepage's organising principle.
2. Prototype the secondary in-page navigation and validate the mobile pattern.
3. Reorder the homepage narrative so the visitor sees audience relevance, product explanation, real-world proof, pricing and the next step without unnecessary detours.
4. Keep supporting pages as deeper destinations.
5. Complete browser-based desktop/mobile, accessibility, performance and SEO checks before sign-off.

**Phase 1 outcome:** The current site is structurally close to the intended direction, but the homepage does not yet provide all five answers in one place. The highest-value next work is to complete the decision journey and make navigation terminology match the visitor's questions, while preserving the product story and existing design language.
