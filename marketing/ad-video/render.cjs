// Renders ad.html frame by frame with Playwright and encodes the result.
//   node render.cjs stills 1.5 4 8.6        -> out/still-<t>.png for review
//   node render.cjs video                    -> out/nextslot-ad.mp4 (needs out/music.wav)
//   DURATION=30 node render.cjs video        -> out/nextslot-ad-30s.mp4 (needs out/music-30s.wav)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const FPS = 30, W = 1080, H = 1920;
const DURATION = +(process.env.DURATION || 20);
const SUFFIX = DURATION === 20 ? "" : `-${DURATION}s`;
const OUT = path.join(__dirname, "out");

(async () => {
  const [mode = "video", ...times] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(__dirname, "ad.html") + `?d=${DURATION}`, { waitUntil: "networkidle" });
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
      "-i", path.join(OUT, `music${SUFFIX}.wav`),
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
      path.join(OUT, `nextslot-ad${SUFFIX}.mp4`),
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
