#!/usr/bin/env node
// 에피소드 표지 일러스트를 내장 규격 webp로 바꿉니다(ADR-0099) — 폭 780(표시 폭 260 × 3배) · 4:3 · q80.
//
//   node devtools/content/cover-webp.mjs ~/Downloads/u04.png u04-directions
//   → apps/mobile/src/assets/content/covers/u04-directions.webp
//
// 그 뒤 `apps/mobile/src/lib/bundled-content-images.ts` 표와 `apps/mobile/content/manifest.json` 항목의
// `cover: "images/covers/<id>.webp"`를 더합니다(u10까지 내장 — 사용자 결정). u11부터는 버킷
// `images/covers/<id>.webp`에 올리고 버킷 매니페스트 항목에 `cover`를 적습니다(앱 변경 없음).
// `cwebp`(libwebp)가 PATH에 있어야 합니다 — `brew install webp`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WIDTH = 780;
const QUALITY = 80;
const MAX_BYTES = 100_000;

const [, , input, episodeId] = process.argv;
if (!input || !episodeId || !/^[a-z0-9-]+$/.test(episodeId)) {
  console.error("usage: node devtools/content/cover-webp.mjs <input.png> <episode-id>");
  process.exit(2);
}
if (!existsSync(input)) {
  console.error(`input not found: ${input}`);
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = resolve(root, "apps/mobile/src/assets/content/covers");
mkdirSync(outDir, { recursive: true });
const output = resolve(outDir, `${episodeId}.webp`);

const result = spawnSync(
  "cwebp",
  ["-quiet", "-resize", String(WIDTH), "0", "-q", String(QUALITY), "-m", "6", input, "-o", output],
  { stdio: "inherit" },
);
if (result.error || result.status !== 0) {
  console.error("cwebp failed — is libwebp installed? (brew install webp)");
  process.exit(1);
}

const bytes = statSync(output).size;
console.log(`${output} (${bytes.toLocaleString()} bytes)`);
if (bytes > MAX_BYTES) {
  console.error(`over ${MAX_BYTES.toLocaleString()} bytes — lower the quality or crop the source`);
  process.exit(1);
}
