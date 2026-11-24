// 「소리가 안 나는 문장」 보고를 만듭니다(ADR-0188). 이미 받아 둔 파일만 읽고 네트워크를 쓰지 않습니다.
//
//   node devtools/content/silent-sentences-report.mjs --episodes <배달 JSON 폴더> --manifest <audio/manifest.json> --out <보고.md>
//
// 에피소드 폴더의 `u*.json`(수준 5 배달 원문)을 모두 읽습니다. 보고는 `--out`에 마크다운으로 씁니다.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  chipSoundCoverageOf,
  silentSentencesOf,
  silentSentencesReport,
} from "./silent-sentences.mjs";

function argOf(name) {
  const at = process.argv.indexOf(`--${name}`);
  const value = at < 0 ? undefined : process.argv[at + 1];
  if (value === undefined) throw new Error(`--${name} 값이 필요합니다`);
  return value;
}

const episodesDir = argOf("episodes");
const manifest = JSON.parse(readFileSync(argOf("manifest"), "utf8"));
const manifestIds = new Set(Object.keys(manifest.audio ?? {}));
const files = readdirSync(episodesDir)
  .filter((file) => /^u\d+.*\.json$/.test(file))
  .sort();
const rows = [];
const coverage = {};
for (const file of files) {
  const episode = JSON.parse(readFileSync(join(episodesDir, file), "utf8"));
  rows.push(...silentSentencesOf(episode, manifestIds));
  for (const [type, entry] of Object.entries(chipSoundCoverageOf(episode, manifestIds))) {
    const total = (coverage[type] ??= { withSound: 0, total: 0 });
    total.withSound += entry.withSound;
    total.total += entry.total;
  }
}
const report = silentSentencesReport(rows, coverage, {
  manifestGeneratedAt: manifest.generated_at ?? "unknown",
  episodeCount: files.length,
});
const head = [
  "# 소리가 안 나는 문장 — 점검 보고",
  "",
  "[ADR-0188](../adr/0188-replay-audio-and-chip-sound.md) D6의 도구가 만든 파일입니다(`node devtools/content/silent-sentences-report.mjs`). 손으로 고치지 않습니다.",
  "까닭: `no-audio-id` 콘텐츠에 음성 id 없음 · `not-in-manifest` id는 있는데 음성 정보 파일에 없음(미업로드) · `no-recording` 레슨 정답과 같은 녹음 없음 · `placeholder` 자리표시자라 앱이 끔.",
  "",
].join("\n");
writeFileSync(argOf("out"), `${head}\n${report}`);
console.log(`episodes ${files.length} · silent ${rows.length}`);
