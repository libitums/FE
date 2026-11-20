// 버킷에서 받은 지금의 음성 정보 파일(`audio/manifest.json`)에 글자 소리 항목을 더한 새 원문을 씁니다(ADR-0172).
// letters-audio-upload.sh가 올리기 직전에 부릅니다 — 다른 항목은 그대로 둡니다.
//
//   node devtools/content/letters-audio-merge.mjs --live <받은 manifest.json> --timings <letters-audio-timings.json> --out <새 파일>
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { mergeAudioManifest } from "./letters-audio.mjs";

const { values } = parseArgs({
  options: { live: { type: "string" }, timings: { type: "string" }, out: { type: "string" } },
});
if (values.live === undefined || values.timings === undefined || values.out === undefined) {
  console.error(
    "사용법: --live <manifest.json> --timings <letters-audio-timings.json> --out <파일>",
  );
  process.exit(2);
}

const liveText = readFileSync(values.live, "utf8");
const timings = JSON.parse(readFileSync(values.timings, "utf8"));
const merged = mergeAudioManifest(
  liveText,
  timings,
  new Date().toISOString().replace(/\.\d+Z$/, "Z"),
);
writeFileSync(values.out, merged);

const before = Object.keys(JSON.parse(liveText).audio);
const after = Object.keys(JSON.parse(merged).audio);
const letters = after.filter((id) => id.startsWith("letters/")).length;
console.log(`항목 ${before.length} → ${after.length} (letters ${letters}) · ${values.out}`);
