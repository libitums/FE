// 배포 콘텐츠에서 컴패니언 학습 표현 스냅숏을 만들어 SQL 파일과 리포트로 씁니다. DB에는 쓰지 않습니다 — 나온 SQL을
// 검토한 뒤 사람이 SQL 편집기(또는 psql)에서 실행합니다. `companion` 스키마는 PostgREST에 노출하지 않아 REST로 부를 수 없습니다.
//
//   node devtools/companion-expressions/build.mjs --content apps/mobile/content --out <dir>
//   node devtools/companion-expressions/build.mjs --base https://<ref>.supabase.co/storage/v1/object/public/content/ --out <dir>
//
// `--base`는 `manifest.json`과 수준별 매니페스트(`manifests/level-2.json` …, 없을 때까지)를 모두 읽어 에피소드를 합칩니다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { buildExpressionSnapshot, toEpisodesSql, toSyncSql } from "./expressions.mjs";

async function fromContentDir(dir) {
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  return Promise.all(
    manifest.episodes.map(async (entry) => ({
      id: entry.id,
      order: entry.order,
      title: entry.title,
      episode: JSON.parse(await readFile(join(dir, entry.url), "utf8")),
    })),
  );
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response.json();
}

async function fromBucket(base) {
  const root = base.endsWith("/") ? base : `${base}/`;
  const manifests = [await fetchJson(new URL("manifest.json", root))];
  if (manifests[0] === null) throw new Error("manifest.json이 없습니다");
  for (let level = 2; ; level += 1) {
    const next = await fetchJson(new URL(`manifests/level-${level}.json`, root));
    if (next === null) break;
    manifests.push(next);
  }
  // 같은 id는 높은 수준의 매니페스트가 이깁니다 — 그 판을 받는 앱이 실제로 보는 본문입니다.
  const entries = new Map();
  for (const manifest of manifests)
    for (const entry of manifest.episodes) entries.set(entry.id, entry);
  return Promise.all(
    [...entries.values()].map(async (entry) => ({
      id: entry.id,
      order: entry.order,
      title: entry.title,
      episode: await fetchJson(new URL(entry.url, root)),
    })),
  );
}

const { values } = parseArgs({
  options: { content: { type: "string" }, base: { type: "string" }, out: { type: "string" } },
});
if ((values.content === undefined) === (values.base === undefined) || values.out === undefined) {
  console.error("사용법: build.mjs (--content <dir> | --base <url>) --out <dir>");
  process.exit(2);
}

const episodes =
  values.content !== undefined
    ? await fromContentDir(values.content)
    : await fromBucket(values.base);
const snapshot = buildExpressionSnapshot(episodes);
await mkdir(values.out, { recursive: true });
// 에피소드 제목(20261126)은 같은 파일 뒤에 — `companion.sync_episodes`가 없는 옛 DB면 둘째 문장만 실패합니다.
await writeFile(
  join(values.out, "sync-expressions.sql"),
  toSyncSql(snapshot) + toEpisodesSql(episodes),
);
await writeFile(join(values.out, "report.json"), `${JSON.stringify(snapshot.report, null, 2)}\n`);
console.log(
  `episodes ${episodes.length} · expressions ${snapshot.expressions.length} · units ${snapshot.units.length} · ` +
    `invalid ${snapshot.report.invalidIds.length} · conflicts ${snapshot.report.conflicts.length} · ` +
    `unresolved ${snapshot.report.unresolvedRefs.length}`,
);
