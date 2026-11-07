# NextSlot ads: four variants for A/B testing

Vertical (1080×1920, 30 fps) motion-graphics ads aimed at independent service
providers, for Reels, TikTok, YouTube Shorts and WhatsApp Status. Each variant
comes as a 30-second cut and a 20-second cut.

## The test

All four share the same look, length, booking-page demo style and closing call
to action. Only the hook and the angle change, so a difference in results
points at the message.

| Variant | Angle (hypothesis) | Opens with | Files |
|---|---|---|---|
| **A** · DM chaos | Pain: bookings run through DMs are chaotic | "Still running your bookings from your DMs?" Messages pile up, then a NO-SHOW stamp | `nextslot-ad-30s.mp4`, `nextslot-ad.mp4` |
| **B** · No-shows cost you | Loss aversion: show the money | "One no-show a week costs you −R1 800 every month" (worked example) | `nextslot-ad-b-30s.mp4`, `nextslot-ad-b.mp4` |
| **C** · Booked while you sleep | Time and lifestyle | A lock screen overnight: real "New Booking - Deposit received" emails at 23:47, 01:12, 06:03 | `nextslot-ad-c-30s.mp4`, `nextslot-ad-c.mp4` |
| **D** · Everything in one app | Breadth and offer, price up front | Kinetic words "Bookings. Deposits. Clients. Insights. All in one app." | `nextslot-ad-d-30s.mp4`, `nextslot-ad-d.mp4` |

Suggested setup: run all four in one campaign with the same audience, budget
split and placements, and give each ad its own tracked link (for example
`nextslot.co.za/?utm_source=meta&utm_campaign=ab1&utm_content=b-noshows`). Judge
on cost per sign-up, not views or clicks. Hook rate (3-second views ÷
impressions) shows which opening stops the scroll.

## Scenes per variant (20-second timeline; the 30-second cut is 1.5× slower)

**A · DM chaos**: DMs and a no-show → logo → booking page in a phone → deposits
(PayShap, Yoco, iKhokha, PayFast) → revenue and Nexty insight → who it's for → CTA.

**B · No-shows cost you**: four missed R450 appointments add up to −R1 800 →
logo, "Clients secure their slot with a deposit" → deposit taken at booking →
your policy accepted at checkout (custom T&Cs) → get paid upfront → the same
four weeks with deposits paid (R900) → CTA.

**C · Booked while you sleep**: lock-screen booking emails overnight → logo,
"Takes bookings and deposits, even while you sleep" → clients book themselves
→ Saturday fills up, synced to Google Calendar → admin handled (confirmations,
deposit tracking, consultation forms, balance requests) → who it's for → CTA.

**D · Everything in one app**: kinetic word cards → logo with a free-trial
offer pill → six-feature grid → get paid upfront → plans: Starter R99 (7-day
trial), Flow R399 and Professional R699 (30-day trials) → who it's for → CTA.

## Claims

Everything shown exists in NextSlot and matches the live pricing page. Card
payments and deposit tracking are Flow features, so no ad ties them to the R99
plan. Trial lengths are stated per plan. The owner's new-booking email subject
is quoted exactly as `send-booking-email` sends it. "Glow Studio" and its
clients are fictional, and money figures are labelled "Example" or
"Illustrative".

## Build

```bash
python3 music.py [variant] [seconds]                 # out/music[-v][-30s].wav, original synthesized audio
VARIANT=b node render.cjs stills 1 8.8 19.8          # optional: review stills in out/
VARIANT=b DURATION=30 node render.cjs video          # out/nextslot-ad-b-30s.mp4 (H.264 + AAC, -14 LUFS)
```

`VARIANT` is `a` (default, `ad.html`), `b`, `c` or `d` (`ad-b.html` …).
`DURATION` defaults to 20, and any length works. Each variant is choreographed
on a 20-second timeline and stretched proportionally. The music keeps a real
120 BPM while its cues follow the scenes.

Shared scenes (logo reveal, booking phone, payments, insights, who it's for,
CTA) and the timing helpers live in `ad-core.js` and `ad-core.css`. Each
variant file only contains its own hook and unique scenes. Every frame is
rendered deterministically by `render(t)`, so output is identical on every run.
Requires Playwright with Chromium, ffmpeg and numpy. Fonts are Montserrat and
Inter (SIL Open Font License), bundled under `fonts/`.
