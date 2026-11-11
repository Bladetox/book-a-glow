# NextSlot ads: ten variants for A/B testing

Vertical (1080×1920, 30 fps) motion-graphics ads aimed at independent service
providers, for Reels, TikTok, YouTube Shorts and WhatsApp Status. Each variant
comes as a 30-second cut (`out/nextslot-ad-<v>-30s.mp4`) and a 20-second cut
(`out/nextslot-ad-<v>.mp4`). Variant A has no letter in its file name.

## The test

Every ad shares the same look and the same closing call to action. Each one
tests a different reason to sign up, so a difference in results points at the
message.

| Variant | Lever | Opens with |
|---|---|---|
| **A** · DM chaos | Pain: admin chaos | "Still running your bookings from your DMs?" Messages pile up, then a NO-SHOW stamp |
| **B** · No-shows cost you | Loss aversion | "One no-show a week costs you −R1 800 every month" (worked example) |
| **C** · Booked while you sleep | Time and lifestyle | A lock screen overnight filling with real "New Booking - Deposit received" emails |
| **D** · Everything in one app | Breadth and price | Kinetic words "Bookings. Deposits. Clients. Insights. All in one app." |
| **E** · Proof of payment | Pain: chasing money | "Still waiting for proof of payment?" A pending EFT slip, day 1, 2, 3 |
| **F** · Call-out pros | Segment: mobile businesses | A route drawn on a map: "You drive to your clients. Travel fee charged: R0" |
| **G** · Quiet regulars | Growth: retention | "Your regulars are going quiet." Weeks since last visit tick up |
| **H** · Link in bio | Identity: look professional | A polished social profile: "Your work looks premium. 'DM to book' doesn't." |
| **I** · Origin story | Proof: a real business | "NextSlot wasn't built in a boardroom." The PhenomeBeauty story and figures |
| **J** · December rush | Urgency: seasonal | "December is coming. Is your diary ready?" A calendar filling up |

Suggested setup: start with a first round of four or five ads, not all ten, so
each gets enough budget to produce a clear result. Same audience, budget split
and placements, with a tracked link per ad (for example
`nextslot.co.za/?utm_source=meta&utm_campaign=ab1&utm_content=e-pop`). Judge on
cost per sign-up, not views or clicks. Hook rate (3-second views ÷ impressions)
shows which opening stops the scroll. Then run the winners against the next
batch.

Targeting notes:

- **F** is for mobile and call-out businesses; run it to that audience, not broadly.
- **J** is seasonal. Run it from now until mid-December, then retire it.
- **I** features a real person (Shu-meez of PhenomeBeauty) using the quote,
  photo and figures already published on the marketing site. Confirm she is
  happy to appear in paid advertising before it runs.

## Scenes per variant (20-second timeline; the 30-second cut is 1.5× slower)

**A · DM chaos**: DMs and a no-show → logo → booking page in a phone → deposits
(PayShap, Yoco, iKhokha, PayFast) → revenue and Nexty insight → who it's for → CTA.

**B · No-shows cost you**: four missed R450 appointments add up to −R1 800 →
logo → deposit taken at booking → your policy accepted at checkout → get paid
upfront → the same four weeks with deposits paid (R900) → CTA.

**C · Booked while you sleep**: lock-screen booking emails overnight → logo →
clients book themselves → Saturday fills up, synced to Google Calendar → admin
handled → who it's for → CTA.

**D · Everything in one app**: kinetic word cards → logo with a free-trial
pill → six-feature grid → get paid upfront → plans and trial lengths → who it's
for → CTA.

**E · Proof of payment**: a pending EFT slip and three days of waiting → logo →
PayShap lands, "I have checked — payment received", "Confirm booking" (the
real PayShap queue wording) → cards auto-confirm → deposit and balance ledger
→ who it's for → CTA.

**F · Call-out pros**: the unpaid drive → logo → client types an address, the
call-out fee is added (return trip × rate per km) → rate and per-service
call-out settings → Nexty "Low-Margin Travel Identified" → who it's for → CTA.

**G · Quiet regulars**: regulars drifting past their usual gap → logo → the
loyalty list with its real statuses (Birthday, Overdue, Not Seen in a While,
Time to Book, On Track) → the app's own pre-written WhatsApp message, sent
from your WhatsApp → client rebooks, birthday reminder → who it's for → CTA.

**H · Link in bio**: a polished profile that says "DM to book" → logo → three
real booking-page themes (Lash Tech, Barber, Beautician) → one link everywhere,
or your own domain → no app, no sign-up for clients → who it's for → CTA.

**I · Origin story**: Shu-meez and PhenomeBeauty → life before NextSlot → logo,
"So we built the system she needed" → her published quote → R63 851 over 90
days and what the data showed → "this was built for you" → CTA.

**J · December rush**: a December calendar filling up → logo → booking page
open 24/7 → two clients, one slot, no double-booking → public holidays blocked
in a tap, "Your booking page is 10 minutes away" → who it's for → CTA.

## Claims

Everything shown exists in NextSlot and matches the live pricing page, and
features are tied to the right plan:

- PayShap and its confirmation queue are Starter features; card payments are
  Flow and up (labelled in E).
- Call-out mode (F), loyalty tools and occasions (G), custom terms (B) and
  custom domains (H) are Professional features, and each ad says so.
- Trial lengths are stated per plan in D. F and G state the 30-day trial that
  applies to Professional.
- App wording is quoted exactly where it appears: the owner's new-booking
  email subject (C), the PayShap queue buttons (E), the address confirmation
  line (F), loyalty statuses and the WhatsApp template (G), theme names (H).
- I uses only the quote, photo, figure and findings published in the
  PhenomeBeauty case study. All other businesses and clients are fictional,
  and money figures are labelled "Example" or "Illustrative".
- Dates shown are correct for 2026 (weekday matches date).

## Build

```bash
python3 music.py [variant] [seconds]                 # out/music[-v][-30s].wav, original synthesized audio
VARIANT=b node render.cjs stills 1 8.8 19.8          # optional: review stills in out/
VARIANT=b DURATION=30 node render.cjs video          # out/nextslot-ad-b-30s.mp4 (H.264 + AAC, -14 LUFS)
```

`VARIANT` is `a` (default, `ad.html`) or `b` to `j` (`ad-b.html` …).
`DURATION` defaults to 20, and any length works. Each variant is choreographed
on a 20-second timeline and stretched proportionally. The music keeps a real
120 BPM while its cues follow the scenes.

Shared scenes (logo reveal, booking phone, payments, insights, who it's for,
CTA) and the timing helpers live in `ad-core.js` and `ad-core.css`; `ad-kit.css`
holds the UI kit used by E to J. Each variant file only contains its own hook
and unique scenes. Every frame is
rendered deterministically by `render(t)`, so output is identical on every run.
Requires Playwright with Chromium, ffmpeg and numpy. Fonts are Montserrat and
Inter (SIL Open Font License), bundled under `fonts/`.
