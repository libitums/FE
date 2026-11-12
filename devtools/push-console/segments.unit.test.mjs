import assert from "node:assert/strict";
import { test } from "node:test";

import {
  batchesByMessage,
  classifyLearner,
  cleanName,
  episodeCatalog,
  hourWithin,
  inHoldout,
  languageFor,
  localClock,
  reengagementOverlap,
  renderCopy,
  shiftDay,
  streakFrom,
  timeZoneFor,
  variantIndexOf,
} from "./segments.mjs";

const steps = (...ids) => ids.map((id) => ({ id }));
const catalog = episodeCatalog(
  {
    episodes: [
      { id: "u01-water", order: 1 },
      { id: "u00-tutorial", order: 0 },
      { id: "u02-checkin", order: 2 },
    ],
  },
  {
    "u00-tutorial": { title_en: "Tutorial", steps: steps("S1", "S2", "S3", "RP") },
    "u01-water": {
      title_en: "Buying Water",
      counterpart: "편의점 점원",
      steps: steps("S1", "S2", "RP"),
    },
    "u02-checkin": { title_en: "Check-in", steps: steps("S1", "RP") },
  },
);

test("PC-S1. 카탈로그는 순서대로 놓이고 영어 제목 · 단계 id를 갖는다", () => {
  assert.deepEqual(
    catalog.map((episode) => [episode.id, episode.title, episode.steps.length]),
    [
      ["u00-tutorial", "Tutorial", 4],
      ["u01-water", "Buying Water", 3],
      ["u02-checkin", "Check-in", 2],
    ],
  );
});

test("PC-S2. 튜토리얼 진행 키로 네 단계를 가른다", () => {
  const segmentOf = (keys) =>
    classifyLearner(keys === null ? null : { "u00-tutorial": keys }, catalog).segment;
  assert.equal(segmentOf(null), "tutorial-cover");
  assert.equal(segmentOf([]), "tutorial-cover");
  assert.equal(segmentOf(["intro"]), "tutorial-lesson1");
  assert.equal(segmentOf(["intro", "S1"]), "tutorial-lesson2");
  assert.equal(segmentOf(["intro", "S1", "S2"]), "tutorial-rest");
});

test("PC-S3. 튜토리얼 뒤에는 처음으로 끝나지 않은 에피소드를 보고, 남은 단계를 센다", () => {
  const done = ["intro", "S1", "S2", "S3", "RP"];
  assert.deepEqual(classifyLearner({ "u00-tutorial": done }, catalog), {
    segment: "episode-next",
    episodeId: "u01-water",
    episodeTitle: "Buying Water",
    character: "편의점 점원",
    remainingSteps: 3,
  });
  assert.deepEqual(
    classifyLearner({ "u00-tutorial": done, "u01-water": ["intro", "S1"] }, catalog),
    {
      segment: "episode-mid",
      episodeId: "u01-water",
      episodeTitle: "Buying Water",
      character: "편의점 점원",
      remainingSteps: 2,
    },
  );
  assert.equal(
    classifyLearner(
      { "u00-tutorial": done, "u01-water": ["S1", "S2", "RP"], "u02-checkin": ["S1", "RP"] },
      catalog,
    ).segment,
    "all-done",
  );
});

test("PC-S4. 연속 학습 — 오늘 했으면 오늘까지, 아니면 어제까지 이어진 날 수", () => {
  assert.deepEqual(streakFrom(["2026-11-10", "2026-11-11"], "2026-11-12"), {
    current: 2,
    studiedToday: false,
    studiedYesterday: true,
  });
  assert.equal(streakFrom(["2026-11-10", "2026-11-11", "2026-11-12"], "2026-11-12").current, 3);
  assert.equal(streakFrom(["2026-11-09", "2026-11-11"], "2026-11-12").current, 1);
  assert.equal(streakFrom(["2026-11-10"], "2026-11-12").current, 0);
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
});

test("PC-S5. 나라 → 시간대 · 현지 시각 · 문구 언어", () => {
  assert.equal(timeZoneFor("ph"), "Asia/Manila");
  assert.equal(timeZoneFor("ZZ"), null);
  assert.deepEqual(localClock(Date.UTC(2026, 10, 12, 11, 30), "Asia/Manila"), {
    date: "2026-11-12",
    hour: 19,
  });
  assert.deepEqual(localClock(Date.UTC(2026, 10, 12, 2), "America/Mexico_City"), {
    date: "2026-11-11",
    hour: 20,
  });
  assert.equal(languageFor("VN"), "vi");
  assert.equal(languageFor("MX"), "es");
  assert.equal(languageFor("PH"), "en");
  assert.equal(languageFor(null), "en");
});

test("PC-S6. 시 창은 [from, to)이고 자정을 넘을 수 있다", () => {
  assert.equal(hourWithin(18, [18, 21]), true);
  assert.equal(hourWithin(21, [18, 21]), false);
  assert.equal(hourWithin(23, [22, 2]), true);
  assert.equal(hourWithin(1, [22, 2]), true);
  assert.equal(hourWithin(12, [22, 2]), false);
  assert.equal(hourWithin(5, null), true);
});

test("PC-S7. 자동 「다시 돌아오기」 cron과 앞뒤 24시간 안에 겹치는 사람을 가린다", () => {
  const day = 24 * 3600 * 1000;
  const now = Date.UTC(2026, 10, 12, 12); // 직전 cron 11-12 10:00, 다음 11-13 10:00
  const lastCron = Date.UTC(2026, 10, 12, 10);
  const nextCron = Date.UTC(2026, 10, 13, 10);
  assert.equal(reengagementOverlap(lastCron - 3.5 * day, now), true); // 직전 cron에 3일 알림을 받음
  assert.equal(reengagementOverlap(nextCron - 7.2 * day, now), true); // 다음 cron에 7일 알림을 받을 것
  assert.equal(reengagementOverlap(lastCron - 1.5 * day, now), false);
  assert.equal(reengagementOverlap(lastCron - 5 * day, now), false);
  assert.equal(reengagementOverlap(now - 3600 * 1000, now), false); // 직전 cron 뒤에 앱을 염
});

test("PC-S8. 대조군 배정은 결정적이고 비율에 가깝다", () => {
  const ids = Array.from(
    { length: 4000 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
  const control = ids.filter((id) => inHoldout("c1", id, 20)).length;
  assert.ok(control > 700 && control < 900, `대조군 ${control}`);
  assert.equal(inHoldout("c1", ids[7], 20), inHoldout("c1", ids[7], 20));
  assert.equal(ids.filter((id) => inHoldout("c1", id, 0)).length, 0);
});

test("PC-S9. 문구 자리표시 — 이름이 없으면 붙은 쉼표 · さん과 함께 지운다", () => {
  const vars = { name: "Ana", episode: "Buying Water", streak: 4, steps: 3 };
  assert.equal(renderCopy("{name}, continue {episode}", vars), "Ana, continue Buying Water");
  assert.equal(renderCopy("Keep your {streak}-day streak", vars), "Keep your 4-day streak");
  assert.equal(
    renderCopy("{name}, pick up where you left off.", { name: "" }),
    "Pick up where you left off.",
  );
  assert.equal(
    renderCopy("{name}さん、続きから始めましょう。", { name: " " }),
    "続きから始めましょう。",
  );
  assert.equal(renderCopy("Hi, {name}", { name: null }), "Hi");
  assert.equal(cleanName("  Jo\u0000hn{x}  "), "Johnx");
  assert.equal(cleanName("ivy Grace Varghese"), "Ivy");
  assert.equal(renderCopy("{name}, hi", { name: "maria clara" }), "Maria, hi");
  assert.equal(cleanName("A".repeat(40)).length, 20);
});

test("PC-S10. 같은 문구끼리 묶고 1,000명씩 자른다", () => {
  const messages = [
    ...Array.from({ length: 1500 }, (_, index) => ({ userId: `a${index}`, title: "T", body: "B" })),
    { userId: "z", title: "T2", body: "B" },
  ];
  const batches = batchesByMessage(messages);
  assert.deepEqual(
    batches.map((batch) => [batch.title, batch.userIds.length]),
    [
      ["T", 1000],
      ["T", 500],
      ["T2", 1],
    ],
  );
});

test("PC-S11. {character} — 인물 이름을 넣고, 없으면 「{character}: 」 머리말째 지운다 · 변형 칸은 결정적", () => {
  assert.equal(
    renderCopy("{character}: 아직이에요? 👀", { character: "미나" }),
    "미나: 아직이에요? 👀",
  );
  assert.equal(renderCopy("{character}: 또 만나요 🙂", { character: "" }), "또 만나요 🙂");
  assert.equal(renderCopy("{character}：hi", {}), "hi");
  const ids = Array.from({ length: 2000 }, (_, index) => `u${index}`);
  const b = ids.filter((id) => variantIndexOf("series:x", id, 2) === 1).length;
  assert.ok(b > 900 && b < 1100, `B ${b}`);
  assert.equal(variantIndexOf("series:x", "u7", 2), variantIndexOf("series:x", "u7", 2));
  assert.equal(variantIndexOf("series:x", "u7", 1), 0);
});
