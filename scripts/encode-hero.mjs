/**
 * Encodes the homepage hero clip into the files `HeroVideo.tsx` ships.
 *
 *   node scripts/encode-hero.mjs                  # from the default master
 *   node scripts/encode-hero.mjs path/to/new.mp4  # from a different master
 *
 * The master lives in `docs/media-masters/` (gitignored) because it is an
 * input, not a deliverable — only the encoded outputs belong in `public/`.
 *
 * Re-run this whenever the master changes. Everything below is derived from
 * the source's own dimensions, so a higher-resolution re-export needs no edits
 * here: drop it in, re-run, bump VERSION.
 *
 * ── Why these settings ────────────────────────────────────────────────────
 *
 * They were measured against the current master (1280x720, 24fps, 10.0s),
 * not guessed:
 *
 *  · AV1 + H.264, no VP9 tier. AV1 covers ~93% of browsers and H.264 covers
 *    the remainder at 100%. A VP9 encode would only ever serve browsers H.264
 *    already handles, for a third file to keep in sync.
 *
 *  · CRF 30 for AV1. Measured VMAF against the master: CRF 26 = 95.6,
 *    CRF 30 = 94.8, CRF 34 = 93.9, CRF 38 = 92.8. 30 sits in transparent
 *    territory at 514 KB; 26 costs +157 KB for +0.8 VMAF on a file that has
 *    to arrive before anything else on the page.
 *
 *  · No `enable-variance-boost`. It is the usual answer to banding on smooth
 *    gradients, and this clip is one big smooth gradient — but the banding is
 *    not there to fix. Sampling the row-mean luma down a pure-backdrop column
 *    gives a max step of 1 level and 65 distinct levels at every CRF tested,
 *    against 66 in the master: AV1 reproduces the sweep as smoothly as the
 *    source does. Variance boost costs +312 KB to fix nothing.
 *
 *  · `-an` on every output. The master carries an AAC track. A muted autoplay
 *    background can never play it, so it is pure weight.
 *
 *  · Explicit bt709 tagging. The master is untagged (`color_space=unknown`).
 *    Browsers then fall back to their own default for HD, which is bt709 in
 *    practice but is a guess — tagging it makes every browser render the same
 *    colours rather than nearly the same.
 *
 *  · The portrait crop is 11/16 of the source width, full height, centred.
 *    The subject occupies x 256..1020 of the master's 1280 — 20.0% to 79.7%,
 *    centred to within 2px, measured by edge-detecting all 240 frames. An
 *    11:9 crop keeps 15.6%..84.4%, so the wallet survives with margin even at
 *    its widest (t≈5.4s, fully open). Anything tighter cuts the product: the
 *    narrowest centred crop that keeps all of it is 768px, which is 1.067:1 —
 *    barely portrait at all. That is why there is no 9:16 encode here, and why
 *    the hero bands the media rather than cropping it on tall viewports.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Bump when re-encoding. The filenames are served `immutable` (see
 *  next.config.ts), so changed bytes must mean a changed URL. */
const VERSION = "v1";

const MASTER = process.argv[2] ?? "docs/media-masters/hero-wallet.mp4";
const OUT_DIR = "public/media/hero";

/** winget's ffmpeg only lands on PATH in a fresh shell; fall back to its
 *  install root so a first run right after install still works. */
function resolveFfmpeg(name) {
  try {
    execFileSync(name, ["-version"], { stdio: "ignore" });
    return name;
  } catch {
    const root = join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft/WinGet/Packages",
    );
    try {
      const pkg = readdirSync(root).find((d) => d.startsWith("Gyan.FFmpeg"));
      if (pkg) {
        const build = readdirSync(join(root, pkg)).find((d) =>
          d.startsWith("ffmpeg-"),
        );
        if (build) return join(root, pkg, build, "bin", name);
      }
    } catch {
      /* fall through to the error below */
    }
    throw new Error(
      `${name} not found. Install it with:  winget install Gyan.FFmpeg`,
    );
  }
}

const ffmpeg = resolveFfmpeg("ffmpeg");

const COLOUR = [
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-colorspace",
  "bt709",
  "-color_range",
  "tv",
];

/** Centred 11:9 crop from a 16:9 source — see the header note. */
const PORTRAIT_CROP = "crop=iw*11/16:ih";

function run(label, args) {
  process.stdout.write(`  ${label} … `);
  const started = Date.now();
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  const out = args[args.length - 1];
  const kb = (statSync(out).size / 1024).toFixed(0);
  console.log(`${kb} KB  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

function av1(out, filter) {
  run(out, [
    "-i",
    MASTER,
    "-an",
    ...(filter ? ["-vf", filter] : []),
    "-c:v",
    "libsvtav1",
    "-crf",
    "30",
    "-preset",
    "4",
    "-g",
    "48",
    "-pix_fmt",
    "yuv420p",
    "-svtav1-params",
    "tune=0",
    ...COLOUR,
    join(OUT_DIR, out),
  ]);
}

function h264(out, filter) {
  run(out, [
    "-i",
    MASTER,
    "-an",
    ...(filter ? ["-vf", filter] : []),
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-preset",
    "veryslow",
    "-profile:v",
    "high",
    "-g",
    "48",
    "-pix_fmt",
    "yuv420p",
    ...COLOUR,
    // moov ahead of mdat, so playback can start before the file has landed.
    "-movflags",
    "+faststart",
    join(OUT_DIR, out),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`\nmaster : ${MASTER}`);
console.log(`output : ${OUT_DIR}/\n`);

console.log("landscape (full frame, full-bleed on wide viewports)");
av1(`hero-landscape-${VERSION}.av1.webm`);
h264(`hero-landscape-${VERSION}.h264.mp4`);

console.log("\nportrait (11:9 centre crop, banded on tall viewports)");
av1(`hero-portrait-${VERSION}.av1.webm`, PORTRAIT_CROP);
h264(`hero-portrait-${VERSION}.h264.mp4`, PORTRAIT_CROP);

// Frame 0 at full width. HeroSection renders it with object-cover inside the
// same box as the video, so the 11:9 box crops it to exactly the portrait
// encode's framing — one poster covers both orientations.
console.log("\nposter (frame 0, both orientations)");
run(`hero-poster-${VERSION}.webp`, [
  "-i",
  MASTER,
  "-frames:v",
  "1",
  "-c:v",
  "libwebp",
  "-quality",
  "90",
  join(OUT_DIR, `hero-poster-${VERSION}.webp`),
]);

console.log("\ndone\n");
