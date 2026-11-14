import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { contentUnitRows, rewardUnitKeysOf, toContentUnitsSql } from "./content-units.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const contentDir = join(root, "apps/mobile/content");
const migration = join(
  root,
  "apps/supabase-functions/supabase/migrations/20261130120000_coin_claim_valid_units.sql",
);

const steps = (...ids) => ({ steps: ids.map((id) => (typeof id === "string" ? { id } : id)) });

test("CU-U1. 보상 유닛은 스텝 id에서 막간 · 표지를 뺀 것 — 중복 없이 첫 등장 순", () => {
  const episode = steps(
    "S1",
    "S2",
    { id: "INT", kind: "interlude" },
    { id: "STORY2", kind: "interlude" },
    "intro",
    "INT",
    "S2",
    { id: 7 },
    { kind: "x" },
    "CULT",
    "RP",
  );
  assert.deepEqual(rewardUnitKeysOf(episode), ["S1", "S2", "CULT", "RP"]);
  assert.deepEqual(rewardUnitKeysOf({}), []);
  assert.deepEqual(rewardUnitKeysOf(null), []);
});

test("CU-U2. 여러 판의 합집합 — 옛 판에만 있던 id도 남고, (에피소드, 유닛) 순으로 정렬된다", () => {
  const rows = contentUnitRows([
    { id: "u01-water", episode: steps("S1", { id: "INT", kind: "interlude" }, "CULT", "RP") },
    { id: "u00-tutorial", episode: steps("S1", "RP") },
    { id: "u01-water", episode: steps("S1", "S3", "S9", "RP") },
  ]);
  assert.deepEqual(rows, [
    { episode_id: "u00-tutorial", unit_key: "RP" },
    { episode_id: "u00-tutorial", unit_key: "S1" },
    { episode_id: "u01-water", unit_key: "CULT" },
    { episode_id: "u01-water", unit_key: "RP" },
    { episode_id: "u01-water", unit_key: "S1" },
    { episode_id: "u01-water", unit_key: "S3" },
    { episode_id: "u01-water", unit_key: "S9" },
  ]);
});

test("CU-U3. 표 규칙 밖의 에피소드 id · 유닛 키는 SQL로 내보내지 않고 던진다", () => {
  for (const [id, key] of [
    ["u01'; drop table x; --", "S1"],
    ["U01-Water", "S1"],
    ["", "S1"],
    ["u01-water", "S1'"],
    ["u01-water", "S1234567890123456"],
    ["u01-water", "S 1"],
  ]) {
    assert.throws(() => contentUnitRows([{ id, episode: steps(key) }]), Error, `${id} / ${key}`);
  }
});

test("CU-U4. SQL은 멱등 insert 한 문장, 빈 목록이면 insert가 없다", () => {
  const sql = toContentUnitsSql([
    { episode_id: "u01-water", unit_key: "RP" },
    { episode_id: "u18-new", unit_key: "S1" },
  ]);
  assert.equal(
    sql,
    "insert into companion.content_units (episode_id, unit_key) values\n" +
      "  ('u01-water', 'RP'),\n" +
      "  ('u18-new', 'S1')\n" +
      "on conflict do nothing;\n",
  );
  const empty = toContentUnitsSql([]);
  assert.doesNotMatch(empty, /insert/i);
  assert.match(empty, /^--/);
});

/** 마이그레이션의 시드 insert에서 (에피소드, 유닛) 쌍을 읽습니다. */
async function seededPairs() {
  const sql = await readFile(migration, "utf8");
  const insert = sql.match(/insert into companion\.content_units[\s\S]*?on conflict do nothing;/g);
  assert.ok(insert, "시드 insert가 없습니다");
  const pairs = insert.flatMap((statement) =>
    [...statement.matchAll(/\('([^']+)', '([^']+)'\)/g)].map(([, ep, unit]) => `${ep}:${unit}`),
  );
  return new Set(pairs);
}

test("CU-U5. 마이그레이션 시드 ⊇ 내장 콘텐츠의 보상 유닛, intro · INT 없음, 187행", async () => {
  const seeded = await seededPairs();
  const manifest = JSON.parse(await readFile(join(contentDir, "manifest.json"), "utf8"));
  const bundled = await Promise.all(
    manifest.episodes.map(async (entry) => ({
      id: entry.id,
      episode: JSON.parse(await readFile(join(contentDir, entry.url), "utf8")),
    })),
  );
  const rows = contentUnitRows(bundled);
  assert.ok(rows.length > 0);
  const missing = rows
    .map((row) => `${row.episode_id}:${row.unit_key}`)
    .filter((pair) => !seeded.has(pair));
  assert.deepEqual(missing, []);
  assert.equal([...seeded].filter((pair) => /:(intro|INT)$/.test(pair)).length, 0);
  assert.equal(seeded.size, 187);
});
