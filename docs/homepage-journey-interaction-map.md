# Homepage Journey Interaction Map

**Branch:** `marketing-seo-realignment`  
**Scope:** Homepage only. Preserve the current hero, proof ticker, existing product visuals, current route structure and business behaviour.  
**Status:** Implementation map, not a code change.

## Agreed experience

1. The homepage opens on the current hero as the focused first impression.
2. The current proof ticker remains directly after the hero and is part of that first impression.
3. The existing **See how it works** CTA initiates the homepage journey.
4. The visitor moves smoothly to the first journey section.
5. A compact, semi-transparent five-item section index becomes available and stays accessible while scrolling.
6. The index jumps to the five answers: Who it's for, How it works, Who it's worked for, Pricing, and Get started.
7. The existing primary navigation and footer continue to provide deeper site navigation.

## Existing implementation findings

- `src/pages/Index.tsx` already composes the homepage in one route and renders `SiteHeader`, `HeroSection`, `ProofTicker`, `FeaturesSection`, `RevenueSection`, `HeatmapSection`, `CaseStudySection`, `CTASection`, and `SiteFooter`.
- `HeroSection.tsx` already uses the intended headline, hero image, supporting copy and **See how it works** CTA. Preserve it.
- `ProofTicker.tsx` is already immediately after the hero. Preserve it.
- `PrimaryCTA.tsx` already supports smooth scrolling for a homepage hash destination.
- `FeaturesSection.tsx` already has the anchor `how-nextslot-works`, used by the hero CTA.
- `Index.tsx` already supports direct hash navigation when the homepage loads.
- `SiteHeader.tsx` is the existing primary navigation. `SiteFooter.tsx` provides deeper links.
- Current homepage content is already in the DOM and below the hero. There is no need to rebuild the page or introduce a new routing model.

## Smallest change set

### 1. Add a homepage-only journey index

Create a small component such as `HomeJourneyNav.tsx`, rendered in `Index.tsx` between the proof ticker and the first journey section. It should:
- Use real anchor links to section IDs.
- Contain five concise labels: `Who it's for`, `How it works`, `Results`, `Pricing`, `Get started`.
- Start visually inactive/hidden in the initial hero state, then become visible when the user activates **See how it works**.
- Use a semi-transparent warm background and backdrop blur, existing palette values, a subtle active underline and no pill styling.
- Become sticky below the existing fixed site header once active.
- Update its active item as the visitor scrolls, preferably with `IntersectionObserver`.
- Support keyboard use, visible focus, reduced-motion preferences and direct hash links.
- On narrow screens, remain a single horizontally scrollable index region, with no page-level horizontal overflow.

### 2. Make the hero CTA initiate the journey

Keep the current CTA label and target section. Extend the existing homepage CTA handling so activation:
- Marks the journey index as active/visible.
- Updates the URL hash to `#how-nextslot-works`.
- Scrolls the target section into view with smooth behaviour unless reduced motion is requested.
- Accounts for the fixed site header and sticky index using `scroll-margin-top` or an equivalent measured offset.
- Works when arriving directly at a homepage hash and when browser back/forward changes the hash.

Avoid adding a separate page transition or a loading state.

### 3. Give the five destinations stable IDs

Keep `how-nextslot-works` for the current section and add IDs only where needed:
- `who-its-for`: the existing section that best explains the target audience. If the current homepage has no explicit audience section, add a concise section rather than mislabeling the existing product dashboard.
- `how-nextslot-works`: existing `FeaturesSection`.
- `results`: existing `CaseStudySection`.
- `pricing-preview`: add a compact homepage pricing preview only after verifying prices, trial terms and Studio positioning against the current Pricing page and product.
- `get-started`: existing `CTASection`.

Do not duplicate pricing details that are not verified. Do not invent customer quotes or product capabilities.

### 4. Use the smallest layout adjustments possible

- Keep the existing hero and proof ticker visually unchanged.
- Group sections using the existing warm cream and sand backgrounds.
- Avoid new design tokens, pill-shaped eyebrows, extra progress bars or decorative navigation elements.
- Reuse the existing typography, colours and spacing conventions.
- Adjust section spacing or content width only where required for a coherent editorial composition.
- Keep the current dashboard, heatmap, Nexty orb and PhenomeBeauty story.

## Important implementation recommendation

Do **not** remove the rest of the homepage from the DOM or make the content depend on JavaScript to exist. Keep the sections rendered for crawlability, accessibility and graceful degradation. The CTA should *initiate the guided journey* by revealing the index and moving the visitor to the first answer, not trigger a theatrical page reveal or a second route.

The hero naturally occupies the initial viewport. If the requirement is interpreted as literally hiding every following section until a click, that would add complexity and risks making content less discoverable. The recommended implementation achieves the intended focused first impression with less code and fewer failure modes.

## Acceptance criteria

- The hero and proof ticker are unchanged.
- The existing CTA starts the guided homepage journey and lands on the How it works section.
- The index is absent from the initial visual state, then appears and remains sticky after the journey starts.
- Each index item jumps to the correct section and the active item follows scrolling.
- The index never covers a heading or blocks content under the fixed header.
- The page remains usable with JavaScript disabled or reduced motion enabled, subject to the app's existing runtime.
- Desktop, tablet and mobile layouts have no page-level horizontal overflow.
- Existing top navigation, footer links, pricing links and onboarding CTA continue to work.
- No booking, tenant routing, payment, authentication, admin or other business logic changes.
- Tests cover CTA activation, anchor destinations, sticky index activation, active-section behaviour and mobile layout.

## Expected file touchpoints

Likely minimal changes:
- `src/pages/Index.tsx`: wire homepage journey state and render the index.
- New `src/components/home/HomeJourneyNav.tsx`: index UI and active-section tracking.
- `src/components/home/PrimaryCTA.tsx`: only if needed to expose a small callback or use a dedicated homepage journey handler; avoid a broad shared CTA refactor.
- `src/components/home/homeStyles.ts`: scoped styles for the index and anchor offsets.
- Section components only for stable IDs and the verified audience/pricing destinations.
- `src/test/marketing-smoke.test.tsx` or a dedicated homepage journey test for interaction coverage.

No code has been changed as part of this mapping document.
