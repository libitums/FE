import assert from "node:assert/strict";
import { test } from "node:test";

import { campaignResults, compareRates, poolResults, seriesOf } from "./results.mjs";

const HOUR = 3600 * 1000;
const SENT_AT = Date.UTC(2026, 10, 12, 11); // 마닐라 19시

const campaign = {
  id: "c1",
  sentAtMs: SENT_AT,
  recipients: [
    { userId: "a", group: "sent", timeZone: "Asia/Manila" },
    { userId: "b", group: "sent", timeZone: "Asia/Manila" },
    { userId: "c", group: "sent", timeZone: null },
    { userId: "d", group: "sent", timeZone: "Asia/Manila" },
    { userId: "x", group: "control", timeZone: "Asia/Manila" },
    { userId: "y", group: "control", timeZone: "Asia/Manila" },
  ],
};

test("PC-R1. 비율 차이 · 신뢰구간 · p값", () => {
  const result = compareRates({ hits: 60, n: 200 }, { hits: 30, n: 200 });
  assert.ok(Math.abs(result.diff - 0.15) < 1e-9);
  assert.ok(result.low > 0.06 && result.low < 0.08, String(result.low));
  assert.ok(result.pValue < 0.001);
  assert.equal(compareRates({ hits: 1, n: 1 }, { hits: 0, n: 0 }), null);
  assert.equal(compareRates({ hits: 0, n: 10 }, { hits: 0, n: 10 }).pValue, 1);
});

test("PC-R2. PostHog가 있으면 창별 앱 열기 · 누름 · 학습, 창이 덜 끝나면 표시한다", () => {
  const posthog = new Map([
    ["a", { firstEventMs: SENT_AT + 2 * HOUR, firstTapMs: SENT_AT + 2 * HOUR }],
    ["b", { firstEventMs: SENT_AT + 40 * HOUR, firstTapMs: null }],
    ["x", { firstEventMs: SENT_AT + 30 * HOUR, firstTapMs: null }],
  ]);
  const learningDays = new Map([
    ["a", new Set(["2026-11-12"])],
    ["c", new Set(["2026-11-14"])],
    ["y", new Set(["2026-11-10"])],
  ]);
  const lastActiveNow = new Map([
    ["a", SENT_AT + 2 * HOUR],
    ["x", SENT_AT + 30 * HOUR],
    ["d", SENT_AT - HOUR],
  ]);
  const result = campaignResults(
    campaign,
    { posthog, learningDays, lastActiveNow },
    SENT_AT + 48 * HOUR,
  );
  const metric = (name, hours) =>
    result.metrics.find((row) => row.metric === name && row.hours === hours);

  assert.deepEqual(result.counts, { sent: 4, control: 2 });
  assert.deepEqual(metric("opened", 24).sent, { hits: 1, n: 4 });
  assert.deepEqual(metric("opened", 72).sent, { hits: 2, n: 4 });
  assert.deepEqual(metric("opened", 72).control, { hits: 1, n: 2 });
  assert.equal(metric("opened", 24).complete, true);
  assert.equal(metric("opened", 72).complete, false);
  assert.deepEqual(metric("tapped", 24).sent, { hits: 1, n: 4 });
  // c는 시간대를 몰라 UTC — 11-12 ~ 11-13(24시간) 밖, 72시간이면 11-15까지라 든다.
  assert.deepEqual(metric("studied", 24).sent, { hits: 1, n: 4 });
  assert.deepEqual(metric("studied", 72).sent, { hits: 2, n: 4 });
  assert.deepEqual(metric("studied", 72).control, { hits: 0, n: 2 });
  assert.deepEqual(metric("since", null).sent, { hits: 1, n: 4 });

  assert.equal(result.curve.unit, "hour");
  assert.equal(result.curve.points.length, 49);
  assert.deepEqual(result.curve.points[3], { x: 3, sent: 0.25, control: 0 });
  assert.equal(result.curve.points[48].control, 0.5);
});

test("PC-R3. PostHog 키가 없으면 앱 열기 · 누름 지표를 빼고 곡선은 날별 학습이다", () => {
  const result = campaignResults(
    campaign,
    {
      posthog: null,
      learningDays: new Map([["a", new Set(["2026-11-13"])]]),
      lastActiveNow: new Map(),
    },
    SENT_AT + 30 * HOUR,
  );
  assert.equal(result.hasPosthog, false);
  assert.ok(result.metrics.every((row) => row.metric === "studied" || row.metric === "since"));
  assert.equal(result.curve.unit, "day");
  assert.deepEqual(
    result.curve.points.map((point) => point.sent),
    [0, 0.25],
  );
});

test("PC-R4. 묶음 이름 — 적은 이름, 없으면 캠페인 이름에서 끝의 「N차」를 뗀다", () => {
  assert.equal(seriesOf({ name: "레슨 2 재도전 저녁 1차" }), "레슨 2 재도전 저녁");
  assert.equal(seriesOf({ name: "레슨 2 재도전 저녁 12 차" }), "레슨 2 재도전 저녁");
  assert.equal(seriesOf({ name: "레슨 2 재도전 저녁 2차", series: " 레슨2 실험 " }), "레슨2 실험");
  assert.equal(seriesOf({ name: "3차" }), "3차");
  assert.equal(seriesOf({ segment: "episode-mid" }), "episode-mid");
});

test("PC-R5. 같은 묶음은 사람 수를 더해 다시 비교하고, 덜 끝난 창 · 곡선 가중을 지킨다", () => {
  const one = {
    hasPosthog: false,
    counts: { sent: 100, control: 100 },
    metrics: [
      {
        metric: "studied",
        hours: 72,
        complete: true,
        sent: { hits: 30, n: 100 },
        control: { hits: 20, n: 100 },
      },
      {
        metric: "since",
        hours: null,
        complete: true,
        sent: { hits: 50, n: 100 },
        control: { hits: 40, n: 100 },
      },
    ],
    curve: {
      unit: "day",
      metric: "studied",
      points: [
        { x: 0, sent: 0.1, control: 0.1 },
        { x: 1, sent: 0.2, control: 0.1 },
      ],
    },
  };
  const two = {
    hasPosthog: false,
    counts: { sent: 300, control: 100 },
    metrics: [
      {
        metric: "studied",
        hours: 72,
        complete: false,
        sent: { hits: 90, n: 300 },
        control: { hits: 25, n: 100 },
      },
      {
        metric: "since",
        hours: null,
        complete: true,
        sent: { hits: 120, n: 300 },
        control: { hits: 30, n: 100 },
      },
    ],
    curve: { unit: "day", metric: "studied", points: [{ x: 0, sent: 0.3, control: 0.2 }] },
  };
  const pooled = poolResults([one, two]);
  assert.equal(pooled.campaigns, 2);
  assert.deepEqual(pooled.counts, { sent: 400, control: 200 });
  const studied = pooled.metrics.find((row) => row.metric === "studied");
  assert.deepEqual(studied.sent, { hits: 120, n: 400 });
  assert.deepEqual(studied.control, { hits: 45, n: 200 });
  assert.equal(studied.complete, false);
  assert.ok(Math.abs(studied.compare.diff - 0.075) < 1e-9);
  assert.deepEqual(pooled.curve.points[0], {
    x: 0,
    sent: (0.1 * 100 + 0.3 * 300) / 400,
    control: 0.15,
  });
  assert.deepEqual(pooled.curve.points[1], { x: 1, sent: 0.2, control: 0.1 });

  const mixed = poolResults([
    one,
    { ...two, hasPosthog: true, curve: { unit: "hour", metric: "opened", points: [] } },
  ]);
  assert.equal(mixed.curve, null);
  assert.equal(mixed.hasPosthog, false);
  assert.deepEqual(poolResults([]).metrics, []);
});

test("PC-R6. 변형마다 대조군과 비교하고, B는 A와 바로 비교한다 · 묶음에서도 변형끼리 합친다", () => {
  const recipients = [
    ...["a1", "a2", "a3", "a4"].map((userId) => ({
      userId,
      group: "sent",
      variant: "a",
      timeZone: "UTC",
    })),
    ...["b1", "b2", "b3", "b4"].map((userId) => ({
      userId,
      group: "sent",
      variant: "b",
      timeZone: "UTC",
    })),
    ...["c1", "c2"].map((userId) => ({ userId, group: "control", variant: null, timeZone: "UTC" })),
  ];
  const campaign = {
    id: "v",
    sentAtMs: SENT_AT,
    recipients,
    variants: [
      { id: "a", label: "기본 톤" },
      { id: "b", label: "캐릭터 톤" },
    ],
  };
  const learningDays = new Map([
    ["a1", new Set(["2026-11-12"])],
    ["b1", new Set(["2026-11-12"])],
    ["b2", new Set(["2026-11-12"])],
    ["b3", new Set(["2026-11-13"])],
  ]);
  const result = campaignResults(
    campaign,
    { posthog: null, learningDays, lastActiveNow: new Map() },
    SENT_AT + 80 * HOUR,
  );
  const studied72 = (metrics) =>
    metrics.find((row) => row.metric === "studied" && row.hours === 72);
  assert.deepEqual(studied72(result.metrics).sent, { hits: 4, n: 8 });
  assert.deepEqual(
    result.variants.map((variant) => [
      variant.id,
      variant.label,
      studied72(variant.metrics).sent.hits,
      variant.counts.control,
    ]),
    [
      ["a", "기본 톤", 1, 2],
      ["b", "캐릭터 톤", 3, 2],
    ],
  );
  assert.equal(result.headToHead.length, 1);
  const h2h = studied72(result.headToHead[0].metrics);
  assert.deepEqual(
    [h2h.sent, h2h.control],
    [
      { hits: 3, n: 4 },
      { hits: 1, n: 4 },
    ],
  );
  assert.ok(Math.abs(h2h.compare.diff - 0.5) < 1e-9);

  const single = campaignResults(
    { ...campaign, recipients: recipients.filter((row) => row.variant !== "b") },
    { posthog: null, learningDays, lastActiveNow: new Map() },
    SENT_AT + 80 * HOUR,
  );
  assert.deepEqual(single.variants, []);
  assert.deepEqual(single.headToHead, []);

  const pooled = poolResults([result, result]);
  assert.deepEqual(studied72(pooled.variants[1].metrics).sent, { hits: 6, n: 8 });
  assert.deepEqual(pooled.headToHead[0].counts, { sent: 8, control: 8 });
  assert.deepEqual(poolResults([result, single]).variants, []);
});
