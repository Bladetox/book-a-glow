# NextSlot · five ads, one per level of awareness (Swiss Motion)

Five 30-second vertical ads (1080×1920, 30 fps, −14 LUFS) in the Swiss Motion Graphics style of the
[Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) library: a 6-column grid, one typeface (Inter),
paper, ink and one signal colour, every move landing on a 120 BPM beat. American voice-over (Kokoro, offline),
with the subtitles set into the layout. `subtitles/` holds the same cues as `.srt` files.

## The strategy

Business owners already know booking apps exist, and many file "a system" under *something my future self
will need*. So none of these ads sells the booking link or the deposit. They sell what owners can't see
today: **what their bookings say about their business**. Which service actually earns money, which one only
fills the week, who came back, which days stay empty. Those answers can't be dug out of chats, a paper diary
or a banking app. No competitor is named.

| File | Level | The viewer… | The ad's job | Opens with |
|---|---|---|---|---|
| `nextslot-a1-unaware-busy-is-not-paid.mp4` | Unaware | doesn't know there's a problem | Plant the doubt: busiest ≠ best paid | "Your busiest service. And the one that pays you best." Gel overlay 60 min R320 against lash lift 45 min R450: R5.33 vs R10.00 a minute |
| `nextslot-a2-problem-answer-this.mp4` | Problem aware | knows their numbers are a mess | Make the pain specific, then show it solved | "Which service made you the most money last month?" The answer is split across 412 messages, 186 diary entries and 94 payments |
| `nextslot-a3-solution-later.mp4` | Solution aware | knows systems exist, plans one "later" | Kill "later": data you don't record now is gone | "later" is cut; ten months of 2026 marked "No record"; a week of bookings turns 90° into what it means |
| `nextslot-a4-product-is-it-for-you.mp4` | Product aware | knows NextSlot, unsure it fits | Answer the three objections | "I work alone." / "My clients live on WhatsApp." / "My numbers are too small." → Yes. |
| `nextslot-a5-most-aware-the-deal.mp4` | Most aware | only needs the terms | State the deal plainly | No payment to start; R99 / R399 / R699 / R999; 7 or 30 days free; the trial learns your business; no contract |

**How to run them:** they're a sequence, not five rivals. Run A1 and A2 cold (broad audiences), retarget video
viewers with A3 and A4, and show A5 to profile visitors and site visitors. Test hooks within a level, not across
levels. Judge A1–A2 on hook rate and cost per thousand engaged views, A3–A4 on click-through, and A5 on cost per
sign-up.

## Claims

- Figures in A1–A3 are labelled "Example figures" or "Illustrative" on screen. A1's maths is exact
  (R320 ÷ 60 = R5.33, R450 ÷ 45 = R10.00, 1.9×).
- Revenue per minute is a Nexty insight ("Revenue Per Minute Gap"), on the **Professional plan**; A1 says so on
  screen. Note: `src/pages/Pricing.tsx` currently lists "Nexty insights (prioritised, rand impact)" as Studio
  only, which is out of date if Nexty is on Professional.
- Rebooking rate and average booking value (A4) are business health metrics on every plan.
- Booking records keep service, price, day and source ("How did you hear about us?") (A2).
- Clients book from a link with no app or account (A4).
- Prices, trial lengths, "no payment to start" and "cancel any time" match the pricing page and its FAQ (A5),
  including the FAQ's "NextSlot learns how your business operates" during the trial.

## Build

`LIB=/path/to/lemo-opuscar sh build.sh [a1 … a5]`: voice, clock, events, score, foley, mix, picture, master,
subtitles, poster. The picture is 2D canvas and renders in about 20 seconds per ad. Source: `src/swiss.js`
(the engine), `src/a1.js` … `src/a5.js` (one scene each), `audio/` (clock, score, foley, mix).
