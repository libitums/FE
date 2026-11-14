// 배포 콘텐츠에서 학습 보상 유닛 표(`companion.content_units`, ADR-0146)에 넣을 멱등 SQL을 stdout으로 씁니다. DB에는 쓰지 않습니다 —
// 나온 SQL을 검토한 뒤 사람이 SQL 편집기(또는 psql)에서 실행합니다. 새 에피소드 · 유닛을 올릴 때마다 돌립니다(docs/specs/episode-content-json-contract.md 13절 규칙 11).
//
//   node devtools/content/content-units-sql.mjs --base https://<ref>.supabase.co/storage/v1/object/public/content/ > content-units.sql
//   node devtools/content/content-units-sql.mjs --content apps/mobile/content > content-units.sql
//
// `--base`는 `manifest.json`과 수준별 매니페스트(`manifests/level-2.json` …, 없을 때까지)의 **모든 항목** 본문을 읽어 합칩니다 — 옛 수준의
// 앱이 읽는 판의 유닛도 보상 대상이어야 하기 때문입니다.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { contentUnitRows, toContentUnitsSql } from "./content-units.mjs";

async function fromContentDir(dir) {
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  return Promise.all(
    manifest.episodes.map(async (entry) => ({
      id: entry.id,
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
  const urls = new Map();
  for (const manifest of manifests)
    for (const entry of manifest.episodes) urls.set(entry.url, entry.id);
  return Promise.all(
    [...urls].map(async ([url, id]) => {
      const episode = await fetchJson(new URL(url, root));
      if (episode === null) throw new Error(`${url}이 없습니다`);
      return { id, episode };
    }),
  );
}

const { values } = parseArgs({
  options: { content: { type: "string" }, base: { type: "string" } },
});
if ((values.content === undefined) === (values.base === undefined)) {
  console.error(
    "사용법: content-units-sql.mjs (--content <dir> | --base <url>) > content-units.sql",
  );
  process.exit(2);
}

const entries =
  values.content !== undefined
    ? await fromContentDir(values.content)
    : await fromBucket(values.base);
const rows = contentUnitRows(entries);
process.stdout.write(toContentUnitsSql(rows));
console.error(
  `files ${entries.length} · episodes ${new Set(rows.map((r) => r.episode_id)).size} · units ${rows.length}`,
);
