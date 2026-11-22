import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  easeRank,
  nextVersion,
  orderingStats,
  reorderEpisode,
  reorderStepItems,
  sameExceptItemOrder,
  serializeEpisode,
} from "./card-then-quiz.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const bundledDir = join(root, "apps/mobile/content/episodes");
const cli = fileURLToPath(new URL("./card-then-quiz-publish.mjs", import.meta.url));
const run = promisify(execFile);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const LEVEL = {
  VOCAB_CARD: 0,
  IMG_MATCH: 1,
  LISTEN_SELECT: 2,
  CLOZE_CHOICE: 2,
  CLOZE: 3,
  WORD_ORDER: 3,
};
const item = (id, type, ref = null, extra = {}) => ({
  id,
  type,
  ref,
  level: LEVEL[type],
  ...extra,
});
const card = (id, ref) => item(id, "VOCAB_CARD", ref);
const ids = (items) => items.map((entry) => entry.id);

test("CQ-U1. 카드마다 그 낱말 문제가 바로 뒤에 붙는다 — 뒤에 흩어진 문제를 끌어온다", () => {
  const items = [
    card("S1-01", "voca:a"),
    card("S1-02", "voca:b"),
    item("S1-03", "IMG_MATCH", "voca:b"),
    item("S1-04", "IMG_MATCH", "voca:a"),
    item("S1-05", "CLOZE", "voca:a"),
  ];
  assert.deepEqual(ids(reorderStepItems(items)), ["S1-01", "S1-04", "S1-05", "S1-02", "S1-03"]);
});

test("CQ-U2. 블록 안은 쉬운 순(level), 같으면 원래 순", () => {
  const items = [
    card("S1-01", "voca:a"),
    item("S1-02", "CLOZE", "voca:a"),
    item("S1-03", "WORD_ORDER", "voca:a"),
    item("S1-04", "LISTEN_SELECT", "voca:a"),
    item("S1-05", "IMG_MATCH", "voca:a"),
    item("S1-06", "CLOZE_CHOICE", "voca:a"),
  ];
  assert.deepEqual(ids(reorderStepItems(items)), [
    "S1-01",
    "S1-05",
    "S1-04",
    "S1-06",
    "S1-02",
    "S1-03",
  ]);
});

test("CQ-U3. 카드보다 앞에 있던 같은 스텝의 그 낱말 문제는 카드 뒤로 간다", () => {
  const items = [
    card("S1-01", "voca:a"),
    item("S1-02", "IMG_MATCH", "voca:b"),
    item("S1-03", "IMG_MATCH", "voca:a"),
    card("S1-04", "voca:b"),
  ];
  assert.deepEqual(ids(reorderStepItems(items)), ["S1-01", "S1-03", "S1-04", "S1-02"]);
});

test("CQ-U4. ref 없음 · 이 스텝에 카드 없는 ref는 바로 앞 카드 블록의 끝에 원래 순으로 남는다", () => {
  const items = [
    item("S1-01", "LISTEN_SELECT"),
    card("S1-02", "voca:a"),
    item("S1-03", "CLOZE", "voca:z"),
    item("S1-04", "LISTEN_SELECT"),
    card("S1-05", "voca:b"),
    item("S1-06", "IMG_MATCH", "voca:a"),
    item("S1-07", "WORD_ORDER", "patt:q"),
    item("S1-08", "IMG_MATCH", "voca:b"),
  ];
  assert.deepEqual(ids(reorderStepItems(items)), [
    "S1-01",
    "S1-02",
    "S1-06",
    "S1-03",
    "S1-04",
    "S1-05",
    "S1-08",
    "S1-07",
  ]);
});

test("CQ-U5. 카드 없는 스텝은 그대로, 문항 객체 · 개수는 그대로, 입력은 바뀌지 않는다", () => {
  const plain = [item("S2-01", "CLOZE", "voca:a"), item("S2-02", "LISTEN_SELECT")];
  assert.deepEqual(reorderStepItems(plain), plain);

  const items = [
    card("S1-01", "voca:a"),
    item("S1-02", "CLOZE", "voca:b"),
    card("S1-03", "voca:b"),
  ];
  const snapshot = structuredClone(items);
  const out = reorderStepItems(items);
  assert.deepEqual(items, snapshot);
  assert.equal(out.length, items.length);
  for (const entry of out) assert.ok(items.includes(entry));
});

test("CQ-U6. 같은 ref 카드가 둘이면 문제는 첫 카드로, ref 없는 카드는 빈 블록", () => {
  const items = [
    card("S1-01", "voca:a"),
    card("S1-02", null),
    card("S1-03", "voca:a"),
    item("S1-04", "CLOZE", "voca:a"),
  ];
  assert.deepEqual(ids(reorderStepItems(items)), ["S1-01", "S1-04", "S1-02", "S1-03"]);
});

test("CQ-U6b. 문화 카드 · 문화 확인 · 롤플레이 턴은 ref가 카드와 같아도 옮기지 않는다(앱이 배열 순서로 짝 · 차례를 정함)", () => {
  const items = [
    card("S3-01", "voca:a"),
    { id: "S3-02", type: "CULTURE_CARD", ref: "voca:b", level: 0 },
    { id: "S3-03", type: "CULTURE_CHECK", ref: "voca:a", level: 1 },
    card("S3-04", "voca:b"),
    { id: "S3-05", type: "ROLEPLAY_TURN", ref: "voca:a", level: 5 },
  ];
  assert.deepEqual(ids(reorderStepItems(items)), ids(items));
});

test("CQ-U7. level이 없으면 타입 표, 모르는 타입은 맨 뒤", () => {
  assert.equal(easeRank({ type: "IMG_MATCH" }), 1);
  assert.equal(easeRank({ type: "SYLLABLE_BUILD" }), 3);
  assert.equal(easeRank({ type: "CLOZE", level: 0 }), 0);
  assert.equal(easeRank({ type: "NEW_KIND" }), Number.POSITIVE_INFINITY);
  const items = [
    card("S1-01", "voca:a"),
    { id: "S1-02", type: "NEW_KIND", ref: "voca:a" },
    { id: "S1-03", type: "SYLLABLE_BUILD", ref: "voca:a" },
    { id: "S1-04", type: "IMG_MATCH", ref: "voca:a" },
  ];
  assert.deepEqual(ids(reorderStepItems(items)), ["S1-01", "S1-04", "S1-03", "S1-02"]);
});

test("CQ-U8. 에피소드: 스텝을 넘어 옮기지 않고, 스텝 · 에피소드의 다른 키는 그대로", () => {
  const episode = {
    schema: "delivery-2",
    unit_id: "u99",
    steps: [
      {
        id: "S1",
        order: 1,
        items: [
          card("S1-01", "voca:a"),
          item("S1-02", "CLOZE", "voca:b"),
          item("S1-03", "CLOZE", "voca:a"),
        ],
      },
      { id: "INT", order: 2, kind: "interlude", items: [], interlude: { form: "x" } },
      { id: "S2", order: 3, items: [card("S2-01", "voca:b")] },
    ],
  };
  const after = reorderEpisode(episode);
  assert.deepEqual(ids(after.steps[0].items), ["S1-01", "S1-03", "S1-02"]);
  assert.deepEqual(after.steps[1], episode.steps[1]);
  assert.deepEqual(ids(after.steps[2].items), ["S2-01"]);
  assert.ok(sameExceptItemOrder(episode, after));

  const moved = structuredClone(after);
  moved.steps[2].items.push(moved.steps[0].items.pop());
  assert.equal(sameExceptItemOrder(episode, moved), false);
  const edited = structuredClone(after);
  edited.steps[0].items[0].level = 9;
  assert.equal(sameExceptItemOrder(episode, edited), false);
});

test("CQ-U9. 지표: 카드 바로 뒤 문제 · 칸 수 · 카드보다 먼저 나온 문제", () => {
  const episode = {
    steps: [
      {
        id: "S1",
        items: [
          card("S1-01", "voca:a"),
          card("S1-02", "voca:b"),
          item("S1-03", "IMG_MATCH", "voca:a"),
          item("S1-04", "CLOZE", "voca:c"),
          item("S1-05", "CLOZE", "voca:x"),
          item("S1-06", "IMG_MATCH", "voca:b"),
        ],
      },
      { id: "S3", items: [card("S3-01", "voca:c"), item("S3-02", "CLOZE", "voca:c")] },
    ],
  };
  const before = orderingStats(episode);
  assert.equal(before.cards, 3);
  assert.equal(before.cardThenQuiz, 1);
  assert.equal(before.maxGap, 4);
  assert.equal(before.maxGapInStep, 4);
  assert.equal(before.wordQuizzes, 5);
  assert.equal(before.beforeCardLaterStep, 1);
  assert.equal(before.noCardInEpisode, 1);
  const after = orderingStats(reorderEpisode(episode));
  assert.equal(after.cardThenQuiz, 3);
  assert.equal(after.maxGapInStep, 1);
  assert.equal(after.beforeCardSameStep, 0);
});

test("CQ-U10. 판: 같은 날이면 n + 1, 다른 날이면 .1, 뒷날 판은 거부", () => {
  assert.equal(nextVersion("2026-11-18.1", "2026-11-20"), "2026-11-20.1");
  assert.equal(nextVersion("2026-11-20.2", "2026-11-20"), "2026-11-20.3");
  assert.throws(() => nextVersion("2026-11-21.1", "2026-11-20"));
  assert.throws(() => nextVersion("2026-11-18.1", "20261120"));
});

test("CQ-U11. 직렬화: 2칸 들여쓰기 + 끝 줄바꿈, 한글은 그대로", () => {
  assert.equal(
    serializeEpisode({ a: [1, { b: "물" }], c: [] }),
    '{\n  "a": [\n    1,\n    {\n      "b": "물"\n    }\n  ],\n  "c": []\n}\n',
  );
});

test("CQ-U12. 내장 에피소드: 재정렬은 멱등이고 순서 말고는 같으며, 같은 스텝 카드 앞 문제가 없다", async () => {
  const names = (await readdir(bundledDir)).filter((name) => name.endsWith(".json"));
  assert.ok(names.length > 0);
  for (const name of names) {
    const episode = JSON.parse(await readFile(join(bundledDir, name), "utf8"));
    const once = reorderEpisode(episode);
    assert.ok(sameExceptItemOrder(episode, once), name);
    assert.deepEqual(reorderEpisode(once), once, name);
    const stats = orderingStats(once);
    assert.equal(stats.beforeCardSameStep, 0, name);
    assert.equal(stats.cards - stats.cardsWithoutQuizInStep, stats.cardThenQuiz, name);
  }
});

test("CQ-U13. 발행 CLI: 바뀐 편만 쓰고 그 항목의 version · sha256 · bytes를 고치며, 받은 본문이 매니페스트와 다르면 멈춘다", async () => {
  const dir = await mkdtemp(join(tmpdir(), "card-then-quiz-"));
  const episode = (unit, items) => ({
    schema: "delivery-2",
    unit_id: unit,
    steps: [{ id: "S1", items }],
  });
  const moved = episode("u01", [
    card("S1-01", "voca:a"),
    card("S1-02", "voca:b"),
    item("S1-03", "IMG_MATCH", "voca:a"),
  ]);
  const kept = episode("u02", [card("S1-01", "voca:a"), item("S1-02", "IMG_MATCH", "voca:a")]);
  await mkdir(join(dir, "in"));
  const entries = [];
  for (const [id, body] of [
    ["u01", moved],
    ["u02", kept],
  ]) {
    const bytes = Buffer.from(serializeEpisode(body));
    await writeFile(join(dir, "in", `${id}.json`), bytes);
    const translations = {
      vi: {
        url: `translations/vi/${id}.json`,
        version: "2026-11-18.1",
        sha256: "0".repeat(64),
        bytes: 1,
      },
    };
    entries.push({
      id,
      order: entries.length,
      version: "2026-11-18.1",
      sha256: sha256(bytes),
      bytes: bytes.length,
      url: `episodes/level-5/${id}.json`,
      translations,
    });
  }
  const manifest = {
    schema: "manifest-1",
    generated_at: "2026-11-19T00:00:00Z",
    min_client_level: 5,
    episodes: entries,
  };
  await writeFile(join(dir, "level-5.json"), JSON.stringify(manifest));
  const args = [
    ...["--manifest", join(dir, "level-5.json"), "--episodes", join(dir, "in")],
    ...[
      "--out",
      join(dir, "out"),
      "--today",
      "2026-11-20",
      "--generated-at",
      "2026-11-20T00:00:00Z",
    ],
  ];
  try {
    await run(process.execPath, [cli, ...args]);
    const out = JSON.parse(await readFile(join(dir, "out", "level-5.json"), "utf8"));
    assert.equal(out.generated_at, "2026-11-20T00:00:00Z");
    assert.equal(out.min_client_level, 5);
    const [u01, u02] = out.episodes;
    const written = await readFile(join(dir, "out", "episodes", "u01.json"));
    assert.equal(u01.version, "2026-11-20.1");
    assert.equal(u01.sha256, sha256(written));
    assert.equal(u01.bytes, written.length);
    assert.deepEqual(u01.translations, entries[0].translations);
    assert.deepEqual(ids(JSON.parse(written.toString("utf8")).steps[0].items), [
      "S1-01",
      "S1-03",
      "S1-02",
    ]);
    assert.deepEqual(u02, entries[1]);
    await assert.rejects(readFile(join(dir, "out", "episodes", "u02.json")));

    await writeFile(join(dir, "in", "u02.json"), "{}\n");
    await assert.rejects(run(process.execPath, [cli, ...args]));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
