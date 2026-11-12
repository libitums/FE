import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildLearners,
  copyProblems,
  hourForecast,
  messageFor,
  normalizeVariants,
  planRecipients,
  selectAudience,
  summarize,
  variantsProblems,
} from "./audience.mjs";
import { DEFAULT_COPY, DEFAULT_FILTERS } from "./copy.mjs";
import { episodeCatalog, LANGUAGES, SEGMENTS } from "./segments.mjs";

const HOUR = 3600 * 1000;
const NOW = Date.UTC(2026, 10, 12, 11, 0); // 마닐라 19시
const catalog = episodeCatalog(
  {
    episodes: [
      { id: "u00-tutorial", order: 0 },
      { id: "u01-water", order: 1 },
    ],
  },
  {
    "u00-tutorial": { title_en: "Tutorial", steps: [{ id: "S1" }, { id: "S2" }, { id: "RP" }] },
    "u01-water": { title_en: "Buying Water", steps: [{ id: "S1" }, { id: "RP" }] },
  },
);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const iso = (ms) => new Date(ms).toISOString();

function fixture() {
  return buildLearners({
    devices: [
      { user_id: id(1), last_active_at: iso(NOW - 30 * HOUR) },
      { user_id: id(1), last_active_at: iso(NOW - 40 * HOUR) }, // 기기 둘 — 가장 최근
      { user_id: id(2), last_active_at: iso(NOW - 2 * HOUR) },
      { user_id: id(3), last_active_at: iso(NOW - 50 * HOUR) },
      { user_id: id(4), last_active_at: iso(NOW - 50 * HOUR) }, // 시험 계정
      { user_id: id(5), last_active_at: iso(NOW - 26 * HOUR) },
    ],
    profiles: [
      { user_id: id(1), name: "Ana", country_code: "PH" },
      { user_id: id(2), name: "Binh", country_code: "VN" },
      { user_id: id(3), name: "", country_code: "ZZ" },
      { user_id: id(5), name: "Carla", country_code: "MX" },
    ],
    progress: [
      { user_id: id(1), cp: { "u00-tutorial": ["intro"] } },
      { user_id: id(2), cp: { "u00-tutorial": ["intro", "S1", "S2", "RP"], "u01-water": ["S1"] } },
      { user_id: id(3), cp: { "u00-tutorial": ["intro"] } },
      { user_id: id(5), cp: null },
    ],
    days: [
      { user_id: id(2), day: "2026-11-10" },
      { user_id: id(2), day: "2026-11-11" },
    ],
    testers: new Set([id(4)]),
    catalog,
    nowMs: NOW,
  });
}

test("PC-A1. 기기 있는 회원만, 시험 계정은 빼고, 진행 · 언어 · 현지 시각 · 연속을 붙인다", () => {
  const learners = fixture();
  assert.deepEqual(learners.map((row) => row.userId).sort(), [id(1), id(2), id(3), id(5)]);
  const ana = learners.find((row) => row.userId === id(1));
  assert.equal(ana.idleHours, 30);
  assert.equal(ana.segment, "tutorial-lesson1");
  assert.equal(ana.lang, "en");
  assert.equal(ana.localHour, 19);
  const binh = learners.find((row) => row.userId === id(2));
  assert.equal(binh.segment, "episode-mid");
  assert.equal(binh.lang, "vi");
  assert.equal(binh.streak, 2);
  assert.equal(binh.atRisk, true);
  const unknown = learners.find((row) => row.userId === id(3));
  assert.equal(unknown.timeZone, null);
  assert.equal(unknown.localHour, null);
  assert.equal(learners.find((row) => row.userId === id(5)).segment, "tutorial-cover");
});

test("PC-A2. 조건 — 쉰 시간 · 시간대 모름 · 현지 시각 창 · 최근 콘솔 발송을 따로 센다", () => {
  const learners = fixture();
  const filter = {
    segment: "tutorial-lesson1",
    minIdleHours: 20,
    maxIdleHours: 100,
    localHours: [18, 21],
  };
  const result = selectAudience(learners, filter, { nowMs: NOW, lastConsoleSendMs: new Map() });
  assert.equal(result.inSegment, 2);
  assert.deepEqual(
    result.eligible.map((row) => row.userId),
    [id(1)],
  );
  assert.equal(result.excluded["no-time-zone"], 1);

  const cooled = selectAudience(learners, filter, {
    nowMs: NOW,
    lastConsoleSendMs: new Map([[id(1), NOW - 5 * HOUR]]),
  });
  assert.equal(cooled.eligible.length, 0);
  assert.equal(cooled.excluded["recent-console"], 1);

  const tooFresh = selectAudience(
    learners,
    { ...filter, minIdleHours: 31 },
    { nowMs: NOW, lastConsoleSendMs: new Map() },
  );
  assert.equal(tooFresh.excluded.idle, 1);

  const evening = selectAudience(
    learners,
    { ...filter, localHours: [7, 9] },
    { nowMs: NOW, lastConsoleSendMs: new Map() },
  );
  assert.equal(evening.excluded["local-hour"], 1);
});

test("PC-A3. 스트릭 세그먼트는 진행 단계와 겹쳐 붙는다", () => {
  const result = selectAudience(
    fixture(),
    { segment: "streak-at-risk" },
    { nowMs: NOW, lastConsoleSendMs: new Map() },
  );
  assert.deepEqual(
    result.eligible.map((row) => row.userId),
    [id(2)],
  );
});

test("PC-A4. 언어별 문구, 없으면 영어 · 대조군에도 문구를 기록한다", () => {
  const learners = fixture();
  const binh = learners.find((row) => row.userId === id(2));
  assert.deepEqual(messageFor(binh, DEFAULT_COPY["episode-mid"]), {
    lang: "vi",
    title: "Tiếp tục Buying Water",
    body: "Binh, học tiếp từ chỗ bạn dừng lại nhé.",
  });
  assert.equal(messageFor(binh, { en: { title: "Hi {name}", body: "b" } }).lang, "en");

  const plan = planRecipients({
    campaignId: "c",
    eligible: learners,
    holdoutPercent: 50,
    copy: DEFAULT_COPY["tutorial-cover"],
  });
  assert.equal(plan.length, 4);
  assert.ok(
    plan.every((row) => row.title !== "" && (row.group === "sent" || row.group === "control")),
  );
  assert.equal(plan.find((row) => row.userId === id(5)).lang, "es");
});

test("PC-A5. 문구 검사 — 영어는 필수, 한 언어에 제목 · 본문 둘 다, 길이", () => {
  assert.deepEqual(copyProblems({ en: { title: "t", body: "b" } }), []);
  assert.equal(copyProblems({ vi: { title: "t", body: "b" } }).length, 1);
  assert.equal(
    copyProblems({ en: { title: "t", body: "b" }, vi: { title: "t", body: "" } }).length,
    1,
  );
  assert.equal(copyProblems({ en: { title: "x".repeat(90), body: "b" } }).length, 1);
});

test("PC-A6. 기본 문구 · 조건은 모든 세그먼트에 있고, 영어는 언제나 있다", () => {
  for (const segment of SEGMENTS) {
    assert.ok(DEFAULT_COPY[segment.id]?.en, segment.id);
    assert.ok(DEFAULT_FILTERS[segment.id], segment.id);
    assert.deepEqual(copyProblems(DEFAULT_COPY[segment.id]), [], segment.id);
    for (const lang of Object.keys(DEFAULT_COPY[segment.id])) assert.ok(LANGUAGES.includes(lang));
  }
});

test("PC-A8. 시간별 예보 — 앞으로 24시간 정시마다 현지 창에 드는 사람 수", () => {
  const learners = fixture();
  const { hourCandidates } = selectAudience(
    learners,
    { segment: "tutorial-lesson1", minIdleHours: 20, localHours: [18, 21] },
    { nowMs: NOW, lastConsoleSendMs: new Map() },
  );
  assert.deepEqual(
    hourCandidates.map((row) => row.userId),
    [id(1)],
  );
  const forecast = hourForecast(hourCandidates, [18, 21], NOW - 30 * 60 * 1000); // 10:30 UTC → 첫 정시 11:00
  assert.equal(forecast.length, 24);
  assert.equal(forecast[0].atMs, NOW);
  // 마닐라 19 · 20시(11 · 12 UTC)에 들고, 21시(13 UTC)부터 빠진다.
  assert.deepEqual(
    forecast.slice(0, 3).map((row) => row.count),
    [1, 1, 0],
  );
  // 다음 날 마닐라 18시(10 UTC)가 마지막 칸이다 — 창 세 시간이 다 들어온다.
  assert.deepEqual(
    forecast.flatMap((row, index) => (row.count > 0 ? [index] : [])),
    [0, 1, 23],
  );
  assert.deepEqual(hourForecast(hourCandidates, null, NOW), []);
});

test("PC-A7. 요약은 세그먼트마다 쉰 시간 구간 · 언어를 센다", () => {
  const rows = summarize(fixture(), SEGMENTS);
  const lesson1 = rows.find((row) => row.id === "tutorial-lesson1");
  assert.equal(lesson1.total, 2);
  assert.deepEqual(lesson1.byIdle, { "<1d": 0, "1-3d": 2, "3-7d": 0, "7d+": 0 });
  assert.deepEqual(lesson1.byLang, { en: 2 });
});

test("PC-A9. 문구 변형 — 받는 사람만 A · B로 나뉘고, 대조군은 변형 없이 A 문구로 기록된다", () => {
  const variants = [
    { label: "기본 톤", copy: { en: { title: "Calm", body: "{name}, come back." } } },
    {
      label: "캐릭터 톤",
      copy: { en: { title: "{character}: 아직이에요? 👀", body: "{name}, back?" } },
    },
  ];
  const learners = Array.from({ length: 400 }, (_, index) => ({
    ...fixture()[0],
    userId: id(1000 + index),
    character: "미나",
  }));
  const plan = planRecipients({
    campaignId: "series:x",
    eligible: learners,
    holdoutPercent: 20,
    variants,
  });
  const control = plan.filter((row) => row.group === "control");
  const a = plan.filter((row) => row.variant === "a");
  const b = plan.filter((row) => row.variant === "b");
  assert.ok(control.every((row) => row.variant === null && row.title === "Calm"));
  assert.equal(a.length + b.length + control.length, 400);
  assert.ok(a.length > 120 && b.length > 120, `${a.length} / ${b.length}`);
  assert.ok(b.every((row) => row.title === "미나: 아직이에요? 👀"));

  assert.deepEqual(
    normalizeVariants({ copy: { en: { title: "t", body: "b" } } }).map((variant) => [
      variant.id,
      variant.label,
    ]),
    [["a", "기본 톤"]],
  );
  assert.deepEqual(
    normalizeVariants({
      variants: [{ copy: {} }, { label: " ", copy: {} }, { copy: {} }, { copy: {} }],
    }).map((variant) => variant.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(variantsProblems(normalizeVariants({ variants })), []);
  assert.match(
    variantsProblems(
      normalizeVariants({ variants: [variants[0], { copy: { vi: { title: "t", body: "b" } } }] }),
    )[0],
    /^문구 B:/,
  );
});
