// Renders ad.html frame by frame with Playwright and encodes the result.
//   node render.cjs stills 1.5 4 8.6        -> out/still-<t>.png for review
//   node render.cjs video                    -> out/nextslot-ad.mp4 (needs out/music.wav)
//   DURATION=30 node render.cjs video        -> out/nextslot-ad-30s.mp4 (needs out/music-30s.wav)
//   VARIANT=b DURATION=30 node render.cjs video -> out/nextslot-ad-b-30s.mp4 (ad-b.html, out/music-b-30s.wav)
//   VARIANT=b DURATION=30 node render.cjs audio -> re-encode only the audio of an existing video (picture is copied)
// VARIANT a (default) is ad.html; b to j are ad-b.html … ad-j.html.
const { chromium } = require("playwright");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const FPS = 30, W = 1080, H = 1920;
const DURATION = +(process.env.DURATION || 20);
const VARIANT = (process.env.VARIANT || "a").toLowerCase();
const PAGE = VARIANT === "a" ? "ad.html" : `ad-${VARIANT}.html`;
const SUFFIX = (VARIANT === "a" ? "" : `-${VARIANT}`) + (DURATION === 20 ? "" : `-${DURATION}s`);
const OUT = path.join(__dirname, "out");

// Two-pass loudness normalisation: measure the soundtrack, then apply one fixed
// gain to reach -14 LUFS, so every variant plays at the same volume. The limiter
// leaves headroom for the small peak overshoot AAC encoding adds.
function audioFilter(wav) {
  const m = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "loudnorm=I=-14:TP=-2:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
  const j = JSON.parse(m.stderr.slice(m.stderr.lastIndexOf("{")));
  return `loudnorm=I=-14:TP=-2:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}` +
    `:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,alimiter=limit=0.79:level=disabled`;
}
// PNS (perceptual noise substitution) is off: it overshot badly on isolated hi-hat hits.
const AUDIO_ARGS = wav => ["-af", audioFilter(wav), "-ar", "44100", "-c:a", "aac", "-b:a", "256k", "-aac_pns", "0"];

(async () => {
  const [mode = "video", ...times] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const WAV = path.join(OUT, `music${SUFFIX}.wav`), MP4 = path.join(OUT, `nextslot-ad${SUFFIX}.mp4`);
  if (mode === "audio") {
    const tmp = MP4.replace(/\.mp4$/, ".tmp.mp4");
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", MP4, "-i", WAV, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
      ...AUDIO_ARGS(WAV), "-shortest", "-movflags", "+faststart", tmp], { stdio: "inherit" });
    if (r.status !== 0) process.exit(1);
    fs.renameSync(tmp, MP4);
    return;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(__dirname, PAGE) + `?d=${DURATION}`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.ready);

  const shot = async t => {
    await page.evaluate(tt => window.render(tt), t);
    return page.screenshot({ type: mode === "video" ? "jpeg" : "png", quality: mode === "video" ? 95 : undefined });
  };

  if (mode === "stills") {
    for (const t of times) fs.writeFileSync(path.join(OUT, `still${SUFFIX}-${t}.png`), await shot(+t));
  } else {
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      "-i", WAV,
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
      ...AUDIO_ARGS(WAV), "-shortest", "-movflags", "+faststart",
      MP4,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = 0; i < FPS * DURATION; i++) {
      const buf = await shot(i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (i % 60 === 0) process.stdout.write(`frame ${i}\n`);
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on("close", c => (c === 0 ? res() : rej(new Error("ffmpeg " + c)))));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
