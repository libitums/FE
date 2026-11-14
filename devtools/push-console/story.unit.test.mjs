import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLearners, inSegment, planRecipients, storyVariants } from "./audience.mjs";
import {
  storyContentProblems,
  storyLanguageFor,
  storyMessage,
  storyPack,
  storyStepOf,
} from "./story.mjs";

const NOW = Date.UTC(2026, 10, 14, 11, 0);
const option = (hook, en, extra = {}) => ({ hook: 1, hook_name: hook, text: { en, ...extra } });
const index = {
  schema: "push-index-1",
  units: [
    { unit: "u00-tutorial", url: "push/u00-tutorial.json", steps: ["S1", "S2", "RP"] },
    { unit: "u01-water", url: "push/u01-water.json", steps: ["S1", "INT", "RP"] },
  ],
};
const units = {
  "u00-tutorial": {
    title_en: "Tutorial",
    after: {
      S1: [option("dare", "after S1 dare"), option("meanwhile", "after S1 meanwhile")],
      S2: [option("secret", "after S2", { id: "setelah S2" })],
      RP: [option("dare", "tutorial done")],
    },
  },
  "u01-water": {
    title_en: "Buying Water",
    after: { S1: [option("missed", "water S1")], INT: [option("dare", "water INT")] },
  },
};
const pack = storyPack(index, units);

test("PC-ST1 끝낸 단계 — 지금 에피소드에서 단계 순서상 마지막, 표지는 단계가 아님", () => {
  assert.equal(storyStepOf({ "u00-tutorial": ["intro"] }, pack.catalog), null);
  assert.deepEqual(storyStepOf({ "u00-tutorial": ["intro", "S2", "S1"] }, pack.catalog), {
    unitId: "u00-tutorial",
    stepId: "S2",
    nextEpisodeId: null,
  });
  // 순서는 진행 배열이 아니라 index의 steps 순서입니다.
  assert.equal(
    storyStepOf({ "u00-tutorial": ["RP"], "u01-water": ["INT", "S1"] }, pack.catalog).stepId,
    "INT",
  );
});

test("PC-ST2 다음 에피소드를 시작 안 했으면 앞 에피소드의 파이널, 다 끝냈으면 마지막 파이널", () => {
  assert.deepEqual(storyStepOf({ "u00-tutorial": ["S1", "S2", "RP"] }, pack.catalog), {
    unitId: "u00-tutorial",
    stepId: "RP",
    nextEpisodeId: "u01-water",
  });
  assert.deepEqual(storyStepOf({ "u00-tutorial": ["RP"], "u01-water": ["RP"] }, pack.catalog), {
    unitId: "u01-water",
    stepId: "RP",
    nextEpisodeId: null,
  });
  assert.equal(storyStepOf(null, pack.catalog), null);
});

test("PC-ST3 언어 — 말레이시아는 인도네시아어, my는 미얀마, 나머지는 영어", () => {
  assert.equal(storyLanguageFor("MY"), "id");
  assert.equal(storyLanguageFor("ID"), "id");
  assert.equal(storyLanguageFor("MM"), "my");
  assert.equal(storyLanguageFor("TH"), "th");
  assert.equal(storyLanguageFor("MX"), "es");
  assert.equal(storyLanguageFor("PH"), "en");
  assert.equal(storyLanguageFor(null), "en");
});

test("PC-ST4 예고 문구 — 제목은 에피소드 이름(파이널 뒤면 다음 에피소드), 없는 언어는 영어", () => {
  const place = { unitId: "u00-tutorial", stepId: "S2", nextEpisodeId: null };
  const id = storyMessage({ content: units, titles: pack.titles, place, lang: "id", hookIndex: 0 });
  assert.deepEqual(id, { hook: "secret", lang: "id", title: "Tutorial", body: "setelah S2" });
  const th = storyMessage({ content: units, titles: pack.titles, place, lang: "th", hookIndex: 0 });
  assert.equal(th.lang, "en");
  const finale = storyMessage({
    content: units,
    titles: pack.titles,
    place: { unitId: "u00-tutorial", stepId: "RP", nextEpisodeId: "u01-water" },
    lang: "en",
    hookIndex: 0,
  });
  assert.equal(finale.title, "Buying Water");
  assert.equal(
    storyMessage({ content: units, titles: {}, place: null, lang: "en", hookIndex: 0 }),
    null,
  );
});

test("PC-ST5 훅 — 묶음 · 사람마다 늘 같은 칸, 여러 사람이면 훅이 고루 나뉨", () => {
  const place = { unitId: "u00-tutorial", stepId: "S1", nextEpisodeId: null };
  const pick = (userId) =>
    storyMessage({ content: units, titles: {}, place, lang: "en", seed: "series:x", userId }).hook;
  assert.equal(pick("user-1"), pick("user-1"));
  const hooks = new Set(Array.from({ length: 40 }, (_, n) => pick(`user-${n}`)));
  assert.deepEqual([...hooks].sort(), ["dare", "meanwhile"]);
});

test("PC-ST6 세그먼트 · 받는 사람 — 예고가 있는 사람만, 변형은 훅 이름, 대조군은 변형 없음", () => {
  const users = Array.from(
    { length: 30 },
    (_, n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  );
  const learners = buildLearners({
    devices: users.map((id) => ({
      user_id: id,
      last_active_at: new Date(NOW - 30 * 3600e3).toISOString(),
    })),
    profiles: users.map((id, n) => ({
      user_id: id,
      name: "Ana",
      country_code: n % 2 ? "MY" : "PH",
    })),
    progress: [
      ...users.slice(0, 25).map((id) => ({ user_id: id, cp: { "u00-tutorial": ["intro", "S1"] } })),
      ...users.slice(25).map((id) => ({ user_id: id, cp: { "u00-tutorial": ["intro"] } })),
    ],
    days: [],
    testers: new Set(),
    catalog: pack.catalog.map((episode) => ({ ...episode, order: 0, character: "" })),
    nowMs: NOW,
    story: pack,
  });
  const eligible = learners.filter((learner) => inSegment(learner, "story-next"));
  assert.equal(eligible.length, 25);
  const recipients = planRecipients({
    campaignId: "series:s",
    eligible,
    holdoutPercent: 30,
    story: pack,
  });
  assert.equal(recipients.length, 25);
  for (const row of recipients) {
    assert.equal(row.storyStep, "u00-tutorial:S1");
    assert.equal(row.title, "Tutorial");
    if (row.group === "control") assert.equal(row.variant, null);
    else assert.ok(["dare", "meanwhile"].includes(row.variant));
  }
  // 말레이시아 사람은 id 문구가 없어 영어로 갑니다.
  assert.ok(recipients.every((row) => row.lang === "en"));
  assert.deepEqual(
    storyVariants(recipients).map((variant) => variant.id),
    [...new Set(recipients.filter((row) => row.variant).map((row) => row.variant))].sort(),
  );
});

test("PC-ST7 예고 파일 문제 — 모르는 단계 · 영어 없음 · 파일 없음", () => {
  const catalog = [
    { id: "u00-tutorial", steps: ["S1", "S2", "RP"] },
    { id: "u02-checkin", steps: ["S1"] },
  ];
  const problems = storyContentProblems(
    {
      "u00-tutorial": { after: { S9: [option("dare", "x")], S1: [{ hook_name: "x", text: {} }] } },
    },
    catalog,
  );
  assert.deepEqual(problems, [
    "u00-tutorial: 모르는 단계 S9",
    "u00-tutorial S1: 영어 본문이 없습니다.",
    "u02-checkin: 예고 파일이 없습니다.",
  ]);
  assert.deepEqual(storyContentProblems(units, pack.catalog), []);
});

test("PC-ST8 모양이 틀린 예고 파일 — 배열 아님 · 빈 칸 · unit 없는 index에도 던지지 않음", () => {
  const broken = {
    "u00-tutorial": {
      title_en: "T",
      after: { S1: { not: "array" }, S2: [null, option("dare", "ok")] },
    },
  };
  const packed = storyPack(
    { units: [null, { url: "x.json" }, { unit: "u00-tutorial", steps: ["S1", "S2"] }] },
    broken,
  );
  assert.deepEqual(
    packed.catalog.map((episode) => episode.id),
    ["u00-tutorial"],
  );
  const at = (stepId) => ({ unitId: "u00-tutorial", stepId, nextEpisodeId: null });
  assert.equal(
    storyMessage({ content: broken, titles: {}, place: at("S1"), lang: "en", hookIndex: 0 }),
    null,
  );
  assert.equal(
    storyMessage({ content: broken, titles: {}, place: at("S2"), lang: "en", hookIndex: 0 }).body,
    "ok",
  );
  assert.deepEqual(storyContentProblems(broken, [{ id: "u00-tutorial", steps: ["S1", "S2"] }]), [
    "u00-tutorial S1: 훅 목록이 배열이 아닙니다.",
    "u00-tutorial S2: 영어 본문이 없습니다.",
  ]);
});
