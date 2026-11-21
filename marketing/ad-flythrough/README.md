# NextSlot · "11 pm" (Tabletop App Flythrough)

A 30-second vertical (1080×1920, 30 fps) ad in the Tabletop App Flythrough style of the
[Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) library: one continuous camera
move over a desk where app screens lie flat as places and a small voxel client walks through
a real NextSlot booking. American-accented voice-over (Kokoro, offline) with burned-in
subtitles; `subtitles_en.srt` carries the same cues for platforms that take a separate file.

- `nextslot-11pm.mp4`: the film (H.264 + AAC, −14 LUFS); `poster.jpg`: the closing frame.
- `TREATMENT.md`: structure, shot list, beat sheet, cue map, sound design, claims.
- `CREDITS`: every third-party asset and its licence.
- `build.sh`: one command from the voice to the master (`LIB=/path/to/lemo-opuscar sh build.sh`).

The story in order: at 11 pm a new client finds Glow Studio's booking page, picks a
service and a time (the slot is held for 10 minutes), pays the R225 deposit; the payment
runs across the desk to the owner's phone, the "New Booking - Deposit received" email
lands, and the booking drops into Saturday's diary as paid. Title: NextSlot, "Start free at
nextslot.co.za". Glow Studio, its client and its prices are fictional.

Claims: the booking page, the 10-minute slot hold, deposits at booking and the owner's
"New Booking - Deposit received" email are shipped features. Deposits are PayShap on
Starter and card payments on Flow and up; the film doesn't name a payment method.
