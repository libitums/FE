import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildExpressionSnapshot, toSyncSql } from "./expressions.mjs";

const contentDir = fileURLToPath(new URL("../../apps/mobile/content/", import.meta.url));

async function bundledEpisodes() {
  const manifest = JSON.parse(await readFile(join(contentDir, "manifest.json"), "utf8"));
  return Promise.all(
    manifest.episodes.map(async (entry) => ({
      id: entry.id,
      order: entry.order,
      episode: JSON.parse(await readFile(join(contentDir, entry.url), "utf8")),
    })),
  );
}

const word = (id, ko) => ({ id, ko, roman: "r", gloss_en: "g" });
const item = (id, ref) => ({ id, ref });

test("CE1. 유닛 대응은 문항 ref로 만들고, ref 없는 문항 · 문항 없는 스텝은 건너뛴다", () => {
  const snapshot = buildExpressionSnapshot([
    {
      id: "u01-water",
      order: 1,
      episode: {
        words: [word("voca:aaaa0001", "물"), word("voca:aaaa0002", "얼마")],
        patterns: [word("patt:bbbb0001", "{명사} 주세요")],
        steps: [
          {
            id: "S1",
            items: [item("S1-01", "voca:aaaa0001"), item("S1-02", "voca:aaaa0001"), item("S1-03")],
          },
          { id: "S3", items: [item("S3-01", "patt:bbbb0001")] },
          { id: "INT", items: [] },
          { id: "RP", items: [item("RP-01", "")] },
        ],
      },
    },
  ]);
  assert.deepEqual(snapshot.units, [
    { expression_id: "patt:bbbb0001", episode_id: "u01-water", unit_key: "S3" },
    { expression_id: "voca:aaaa0001", episode_id: "u01-water", unit_key: "S1" },
  ]);
  assert.equal(snapshot.expressions.length, 3);
  assert.deepEqual(snapshot.report, { invalidIds: [], conflicts: [], unresolvedRefs: [] });
});

// CE2 — 에피소드 3이 에피소드 2의 단어를 가리키는 일이 실제로 있습니다. 전역 표라서 풀려야 합니다.
test("CE2. 다른 에피소드에 정의된 id를 가리키는 ref도 풀리고, first_episode는 순서상 첫 에피소드다", () => {
  const snapshot = buildExpressionSnapshot([
    {
      id: "u03-mina",
      order: 3,
      episode: {
        words: [word("voca:aaaa0001", "물")],
        steps: [{ id: "S2", items: [item("S2-01", "voca:cccc0001")] }],
      },
    },
    {
      id: "u02-checkin",
      order: 2,
      episode: { words: [word("voca:cccc0001", "일주일")], steps: [] },
    },
  ]);
  assert.deepEqual(snapshot.units, [
    { expression_id: "voca:cccc0001", episode_id: "u03-mina", unit_key: "S2" },
  ]);
  assert.equal(
    snapshot.expressions.find((row) => row.id === "voca:cccc0001").first_episode,
    "u02-checkin",
  );
});

test("CE3. 정의가 없는 ref · 잘못된 id · 같은 id의 다른 글자를 리포트에 남기고 먼저 나온 쪽을 둔다", () => {
  const snapshot = buildExpressionSnapshot([
    {
      id: "u01-water",
      order: 1,
      episode: {
        words: [word("voca:aaaa0001", "배"), word("bad", "x")],
        steps: [{ id: "S1", items: [item("S1-01", "voca:ffff0000")] }],
      },
    },
    { id: "u02-checkin", order: 2, episode: { words: [word("voca:aaaa0001", "배꼽")], steps: [] } },
  ]);
  assert.deepEqual(snapshot.report.invalidIds, [{ episode: "u01-water", id: "bad" }]);
  assert.deepEqual(snapshot.report.conflicts, [
    { id: "voca:aaaa0001", kept: "u01-water", other: "u02-checkin", surfaces: ["배", "배꼽"] },
  ]);
  assert.deepEqual(snapshot.report.unresolvedRefs, [
    { episode: "u01-water", unit: "S1", item: "S1-01", ref: "voca:ffff0000" },
  ]);
  assert.equal(snapshot.expressions.find((row) => row.id === "voca:aaaa0001").surface, "배");
});

// CE4 — 동기화 함수는 입력 순서가 바뀌어도 결과가 같아야 하고, 리뷰어가 SQL diff를 읽을 수 있어야 합니다.
test("CE4. 입력 순서가 달라도 결과가 같다(내장 콘텐츠)", async () => {
  const episodes = await bundledEpisodes();
  assert.deepEqual(
    buildExpressionSnapshot([...episodes].reverse()),
    buildExpressionSnapshot(episodes),
  );
});

test("CE5. 내장 콘텐츠의 표현 id는 모두 형식에 맞고, 모든 대응이 있는 표현을 가리킨다", async () => {
  const snapshot = buildExpressionSnapshot(await bundledEpisodes());
  assert.deepEqual(snapshot.report.invalidIds, []);
  const ids = new Set(snapshot.expressions.map((row) => row.id));
  assert.ok(snapshot.units.every((unit) => ids.has(unit.expression_id)));
  assert.ok(snapshot.expressions.length > 0 && snapshot.units.length > 0);
});

test("CE6. SQL의 달러 인용 태그가 본문과 겹치지 않는다", () => {
  const sql = toSyncSql({ expressions: [word("voca:aaaa0001", "$expr$")], units: [] });
  assert.match(sql, /\$exprx\$\[/);
  assert.ok(sql.startsWith("select companion.sync_expressions("));
});
