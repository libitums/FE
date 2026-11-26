#!/usr/bin/env node
// 스테이징 에피소드의 한 언어 번역 → 운영 번역 파일 + 그 언어 항목을 더한 매니페스트를 만든다(ADR-0185 개정). 버킷에 올리지 않는다 —
// 올리는 일은 사람이 한다(docs/specs/episode-content-json-contract.md 부록 「번역 파일」 · 올리는 법).
//
// 쓰는 법(입력은 미리 받아 둔 로컬 파일):
//   node devtools/content/translation-files-build.mjs \
//     --staging <스테이징 episodes 폴더> --manifest <운영 manifests/level-5.json> \
//     --reference <운영 translations/level-5/ja 폴더> --language zh-TW --out <출력 폴더>
// 출력: <out>/translations/level-5/<언어>/<id>.json · <out>/manifests/level-5.json · 점검 요약(표준 출력).
// 항목의 version은 그 편의 운영 본문 판(다른 언어 번역과 같은 규칙), 매니페스트 `generated_at`은 그대로 둔다.
// 기준(운영 ja)에만 있는 키는 자리표시자 이름만 다르면 맞추고(`alignedEntries`), 맞출 수 없으면 경고만 낸다(앱은 그 줄을 영어로 둔다).
// 그 밖의 점검 문제(빈 번역 · 자리표시자 잃음 · 간체 · 가나)가 있으면 파일은 쓰되 종료 코드 1이다.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  alignedEntries,
  checkTranslationEntries,
  translationFileText,
  translationRef,
  withTranslationRefs,
} from "./translation-files.mjs";

function argsOf(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  for (const name of ["staging", "manifest", "reference", "language", "out"]) {
    if (!args[name]) throw new Error(`--${name}가 필요합니다`);
  }
  return args;
}

const args = argsOf(process.argv.slice(2));
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const manifest = readJson(args.manifest);
const refs = {};
let failed = false;

for (const episode of manifest.episodes) {
  const staging = readJson(path.join(args.staging, `${episode.id}.json`));
  // 파일의 episode 칸이 매니페스트 id와 다르면 앱 디코더가 버려 조용히 영어가 된다 — 여기서 멈춘다.
  if (staging.unit_id !== episode.id)
    throw new Error(`${episode.id}: 스테이징 unit_id가 ${staging.unit_id}입니다`);
  const reference = readJson(path.join(args.reference, `${episode.id}.json`)).entries;
  // 운영 본문(기준 ja 키)에 맞춘다 — 자리표시자 이름만 바뀐 키를 채우고, 맞출 수 없는 키는 영어로 남는다(경고).
  translationFileText(staging, args.language); // 그 언어 번역이 없으면 여기서 던진다.
  const { entries, aligned, missing } = alignedEntries(
    staging.translations[args.language],
    reference,
  );
  const text = translationFileText(
    { ...staging, translations: { [args.language]: entries } },
    args.language,
  );
  const url = `translations/level-5/${args.language}/${episode.id}.json`;
  const out = path.join(args.out, url);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, text);
  refs[episode.id] = translationRef(text, url, episode.version);

  const problems = checkTranslationEntries(entries, reference, {
    traditional: args.language === "zh-TW",
  }).filter((problem) => !problem.startsWith("기준에 있으나 없음"));
  console.log(
    `${episode.id}\t${Object.keys(entries).length}키\t기준 ${Object.keys(reference).length}키\t맞춤 ${aligned.length}\t영어로 남음 ${missing.length}\t문제 ${problems.length}`,
  );
  for (const line of aligned) console.log(`  ~ 맞춤: ${line}`);
  for (const key of missing) console.log(`  ! 영어로 남음: ${key}`);
  for (const problem of problems) console.log(`  - ${problem}`);
  if (problems.length > 0) failed = true;
}

const nextManifest = withTranslationRefs(manifest, args.language, refs);
const manifestOut = path.join(args.out, "manifests", path.basename(args.manifest));
mkdirSync(path.dirname(manifestOut), { recursive: true });
writeFileSync(manifestOut, `${JSON.stringify(nextManifest, null, 2)}\n`);
console.log(`매니페스트: ${manifestOut}`);
process.exit(failed ? 1 : 0);
