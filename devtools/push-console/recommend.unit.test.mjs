import assert from "node:assert/strict";
import { test } from "node:test";

import {
  claudeArgs,
  RECOMMENDATION_SCHEMA,
  recommendationContext,
  recommendationPrompt,
  validateRecommendations,
} from "./recommend.mjs";
import { SEGMENTS } from "./segments.mjs";

const good = {
  segment: "tutorial-lesson2",
  name: "레슨 2 재도전 저녁 1차",
  priority: 1,
  rationale: "레슨 2에서 가장 많이 멈춘다.",
  expectedEffect: "72시간 학습한 날 +5%p",
  sendAtComputerHour: 19,
  minIdleHours: 20,
  maxIdleHours: 336,
  localHours: [18, 21],
  holdoutPercent: 20,
  copy: {
    en: { title: "Lesson 2 is tricky", body: "{name}, it's normal to need a second try." },
    vi: { title: "Bài 2 hơi khó", body: "{name}, thử lại nhé." },
  },
};

test("PC-RC1. 맞는 추천은 그대로, 우선순위 순으로 놓인다", () => {
  const second = { ...good, segment: "tutorial-lesson1", priority: 2 };
  const result = validateRecommendations({ recommendations: [second, good], notes: "메모" });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    result.items.map((item) => [item.segment, item.priority]),
    [
      ["tutorial-lesson2", 1],
      ["tutorial-lesson1", 2],
    ],
  );
  assert.equal(result.notes, "메모");
  assert.deepEqual(Object.keys(result.items[0].copy), ["en", "vi"]);
});

test("PC-RC2. 모르는 세그먼트 · 영어 없음 · 모르는 자리표시는 빼고 이유를 남긴다", () => {
  const result = validateRecommendations({
    recommendations: [
      { ...good, segment: "everyone" },
      { ...good, copy: { vi: good.copy.vi } },
      { ...good, copy: { en: { title: "Hi {firstName}", body: "b" } } },
      good,
    ],
    notes: "",
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.problems.length, 3);
  assert.match(result.problems[2], /\{firstName\}/);
});

test("PC-RC3. 범위 밖 값은 고쳐 쓴다 — 대조군 · 우선순위 · 시각", () => {
  const [item] = validateRecommendations({
    recommendations: [
      { ...good, holdoutPercent: 15, priority: 9, sendAtComputerHour: 30, localHours: [18] },
    ],
    notes: "",
  }).items;
  assert.equal(item.holdoutPercent, 20);
  assert.equal(item.priority, 5);
  assert.equal(item.sendAtComputerHour, 23);
  assert.equal(item.localHours, null);
  assert.deepEqual(validateRecommendations(null).problems, ["추천이 비어 있어요."]);
});

test("PC-RC4. 맥락에는 집계만 — 이름 · id가 들어갈 자리가 없다", () => {
  const nowMs = Date.UTC(2026, 10, 12, 9);
  const context = recommendationContext({
    nowMs,
    computerTimeZone: "Asia/Seoul",
    segments: [
      {
        id: "tutorial-lesson2",
        label: "레슨 1만 함",
        hint: "S1은 있고 S2가 없다",
        total: 377,
        byIdle: { "<1d": 74, "1-3d": 81, "3-7d": 83, "7d+": 139 },
        byLang: { en: 363 },
      },
    ],
    forecasts: {
      "tutorial-lesson2": [
        { atMs: nowMs + 3600 * 1000, count: 0 },
        { atMs: nowMs + 2 * 3600 * 1000, count: 190 },
      ],
    },
    campaigns: [],
    defaultCopy: {},
  });
  assert.equal(context.computerHourNow, 18);
  assert.deepEqual(context.segments[0].reachableByComputerHour, [{ hour: 20, people: 190 }]);
  const text = JSON.stringify(context);
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(text), "사용자 id가 없어야 한다");
  const prompt = recommendationPrompt(context);
  assert.match(prompt, /S2-02/);
  assert.ok(prompt.endsWith(JSON.stringify(context)));
});

test("PC-RC5. claude 실행 인자 — 출력 모양 고정, 도구 · MCP · 세션 기록 끔, 스키마는 문구 세그먼트 id를 안다", () => {
  const args = claudeArgs(RECOMMENDATION_SCHEMA);
  assert.equal(args[0], "-p");
  assert.equal(args[args.indexOf("--tools") + 1], "");
  assert.ok(args.includes("--strict-mcp-config"));
  assert.ok(args.includes("--no-session-persistence"));
  const schema = JSON.parse(args[args.indexOf("--json-schema") + 1]);
  assert.deepEqual(
    schema.properties.recommendations.items.properties.segment.enum,
    SEGMENTS.filter((segment) => segment.id !== "story-next").map((segment) => segment.id),
  );
});

test("PC-RC6. 문구 B(캐릭터 톤)가 있으면 변형 둘, 없으면 A 하나, B가 틀리면 추천째 뺀다", () => {
  const copyB = { en: { title: "{character}: 괜찮아요 🙂", body: "{name}, one more try?" } };
  const [two] = validateRecommendations({ recommendations: [{ ...good, copyB }], notes: "" }).items;
  assert.deepEqual(
    two.variants.map((variant) => [variant.id, variant.label, variant.copy.en.title]),
    [
      ["a", "기본 톤", "Lesson 2 is tricky"],
      ["b", "캐릭터 톤", "{character}: 괜찮아요 🙂"],
    ],
  );
  const [one] = validateRecommendations({
    recommendations: [{ ...good, copyB: {} }],
    notes: "",
  }).items;
  assert.equal(one.variants.length, 1);
  const bad = validateRecommendations({
    recommendations: [{ ...good, copyB: { en: { title: "{mascot} hi", body: "b" } } }],
    notes: "",
  });
  assert.equal(bad.items.length, 0);
  assert.match(bad.problems[0], /문구 B/);
  assert.match(
    recommendationPrompt(
      recommendationContext({
        nowMs: 0,
        computerTimeZone: "UTC",
        segments: [],
        forecasts: {},
        campaigns: [],
        defaultCopy: {},
      }),
    ),
    /캐릭터 톤/,
  );
});

test("PC-RC7. 숫자가 아닌 최대 쉰 시간은 0이 아니라 「제한 없음」이다(리뷰 지적)", () => {
  const [item] = validateRecommendations({
    recommendations: [{ ...good, maxIdleHours: "a lot" }],
    notes: "",
  }).items;
  assert.equal(item.maxIdleHours, null);
});
