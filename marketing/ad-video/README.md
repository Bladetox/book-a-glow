# NextSlot ad (20s and 30s cuts)

A vertical (1080×1920, 30 fps) motion-graphics ad aimed at independent service
providers, for Reels, TikTok, YouTube Shorts and WhatsApp Status.

## Storyboard

Times are for the 20-second cut. The 30-second cut (`out/nextslot-ad-30s.mp4`)
plays the same scenes 1.5× slower, so each scene holds 50% longer.

| Time | Scene | Message |
|---|---|---|
| 0–3.3s | DM chaos, ends with a NO-SHOW stamp | "Still running your bookings from your DMs?" |
| 3.3–6s | Cream circle reveal and logo | "Booking software for independent service businesses." |
| 6–10s | Booking page in a phone: service, time, slot held, deposit, booked | "Your own booking page. Clients book & pay 24/7." |
| 10–12.8s | PayShap · Yoco · iKhokha · PayFast, deposit toast | "Deposits upfront. Fewer no-shows." |
| 12.8–16s | Revenue dashboard and Nexty insight (labelled illustrative) | "See where your business can grow." |
| 16–18s | Beauty, barbers, tattoo artists, photographers | "Built for independent pros like you." |
| 18–20s | Call to action | "Start free today. Free trial · No payment required. Plans from R99/month. nextslot.co.za" |

All claims match the live marketing site: free trial with no payment
required, plans from R99, payment providers, and the Nexty "Fill your quietest
day" insight. "Glow Studio" is a fictional business, and the revenue figures
are illustrative.

## Build

```bash
python3 music.py                       # out/music.wav: original synthesized soundtrack and SFX
node render.cjs stills 1 8.8 19.8      # optional: review stills in out/
node render.cjs video                  # out/nextslot-ad.mp4 (20s, H.264 + AAC, -14 LUFS)

python3 music.py 30                    # out/music-30s.wav
DURATION=30 node render.cjs video      # out/nextslot-ad-30s.mp4
```

Any length works (for example `DURATION=25`). The choreography in `ad.html` is
written on a 20-second timeline and stretched proportionally. The music keeps
a real 120 BPM while its cues move with the scenes.

Requires Playwright with Chromium, ffmpeg and numpy. Each frame is rendered
deterministically by `render(t)` in `ad.html`, so the output is identical on
every run. Fonts are Montserrat and Inter (SIL Open Font License), bundled
under `fonts/`.
