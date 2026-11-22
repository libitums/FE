// 받아 둔 버킷 판(매니페스트 + 본문)에 「카드 → 그 낱말 문제」 순서(card-then-quiz.mjs)를 적용해 올릴 파일을 만듭니다.
// 버킷 · DB에는 쓰지 않습니다 — 나온 파일을 검토한 뒤 사람이 Storage API로 올립니다(계약 13절 · 부록 I).
//
//   node devtools/content/card-then-quiz-publish.mjs --manifest <받은 level-5.json> --episodes <본문 폴더> --out <출력 폴더> --today 2026-11-20
//
// - 입력 본문의 sha256 · bytes가 매니페스트와 다르면 멈춥니다(받은 판이 매니페스트의 판이 아님).
// - 순서가 바뀐 편만 `<out>/episodes/`에 쓰고 그 항목의 `version`(nextVersion) · `sha256` · `bytes`를 고칩니다. 번역 항목은 그대로입니다(문항 id 그대로).
// - `<out>/<매니페스트 파일 이름>`에 새 매니페스트, stdout에 편별 지표 표(전 → 후)를 씁니다.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

import {
  nextVersion,
  orderingStats,
  reorderEpisode,
  sameExceptItemOrder,
  serializeEpisode,
} from "./card-then-quiz.mjs";

const { values } = parseArgs({
  options: {
    manifest: { type: "string" },
    episodes: { type: "string" },
    out: { type: "string" },
    today: { type: "string" },
    "generated-at": { type: "string" },
  },
});
if (!values.manifest || !values.episodes || !values.out || !values.today) {
  console.error(
    "사용: --manifest <file> --episodes <dir> --out <dir> --today YYYY-MM-DD [--generated-at ISO]",
  );
  process.exit(2);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile(values.manifest, "utf8"));
await mkdir(join(values.out, "episodes"), { recursive: true });

const rows = [];
const episodes = [];
for (const entry of manifest.episodes) {
  const name = basename(entry.url);
  const raw = await readFile(join(values.episodes, name));
  if (sha256(raw) !== entry.sha256 || raw.length !== entry.bytes)
    throw new Error(`${entry.id}: 받은 본문이 매니페스트의 sha256 · bytes와 다릅니다`);
  const text = raw.toString("utf8");
  const before = JSON.parse(text);
  if (serializeEpisode(before) !== text)
    throw new Error(`${entry.id}: 직렬화가 버킷 본문과 바이트가 다릅니다 — 순서 말고도 바뀝니다`);
  const after = reorderEpisode(before);
  if (!sameExceptItemOrder(before, after))
    throw new Error(`${entry.id}: 순서 말고 다른 것이 바뀌었습니다`);
  const body = serializeEpisode(after);
  const changed = body !== text;
  let next = entry;
  if (changed) {
    const bytes = Buffer.from(body, "utf8");
    await writeFile(join(values.out, "episodes", name), bytes);
    next = {
      ...entry,
      version: nextVersion(entry.version, values.today),
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
  }
  episodes.push(next);
  rows.push({
    id: entry.id,
    changed,
    version: next.version,
    before: orderingStats(before),
    after: orderingStats(after),
  });
}

const out = {
  ...manifest,
  generated_at: values["generated-at"] ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  episodes,
};
await writeFile(join(values.out, basename(values.manifest)), `${JSON.stringify(out, null, 2)}\n`);

const arrow = (key, row) => `${row.before[key]} → ${row.after[key]}`;
const columns = [
  ["cardThenQuiz", "카드 바로 뒤 그 낱말 문제"],
  ["maxGapInStep", "카드→첫 문제 최대 칸(같은 스텝)"],
  ["maxGap", "카드→첫 문제 최대 칸(편 전체)"],
  ["medianGap", "중앙값"],
  ["beforeCardSameStep", "카드보다 먼저 — 같은 스텝"],
  ["beforeCardLaterStep", "카드보다 먼저 — 뒤 스텝에 카드"],
  ["noCardInEpisode", "이 편에 카드 없음"],
];
const labels = columns.map(([, label]) => label).join(" | ");
console.log(`| 편 | 판 | 카드 | 같은 스텝에 문제 없는 카드 | 낱말 문제 | ${labels} |`);
console.log(`|${"---|".repeat(columns.length + 5)}`);
for (const row of rows) {
  const cells = columns.map(([key]) => arrow(key, row)).join(" | ");
  const version = row.changed ? row.version : "그대로";
  const { cards, cardsWithoutQuizInStep, wordQuizzes } = row.before;
  console.log(
    `| ${row.id} | ${version} | ${cards} | ${cardsWithoutQuizInStep} | ${wordQuizzes} | ${cells} |`,
  );
}
