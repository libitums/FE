import { describe, expect, test } from "vitest";

import {
  armOf,
  batchesOf,
  type CampaignConfig,
  type CampaignLearner,
  type CatalogEpisode,
  classify,
  hash32,
  inHoldout,
  planCampaign,
  reengagementOverlap,
  renderCopy,
  storyPlaceOf,
} from "./push-campaign-plan.ts";
import { allCampaignCopy, pushCampaignConfig } from "./push-campaign-config.ts";

const HOUR = 3600_000;
// 2026-11-16 12:05 UTC = 마닐라 20:05.
const NOW = Date.UTC(2026, 10, 16, 12, 5);

const catalog: CatalogEpisode[] = [
  { id: "u00-tutorial", steps: ["S1", "S2", "S3", "RP"], title: "Tutorial", character: "승무원" },
  { id: "u01-water", steps: ["S1", "S2", "RP"], title: "Buying Water", character: "편의점 점원" },
];
const one = (title: string, body: string) => ({ en: { title, body } });
const config: CampaignConfig = {
  localHours: { noon: 12, evening: 20 },
  minIdleHours: 12,
  minGapHours: 6,
  dailyDays: 7,
  winbackDays: [10, 14],
  stages: {
    "tutorial-lesson1": "tutorial",
    "tutorial-lesson2": "tutorial",
    "episode-next": "next",
  },
  copy: {
    tutorial: {
      noon: [one("noon 0", "{name}, lunch."), one("noon 1", "{name}, lunch again.")],
      evening: [one("evening 0", "{name}, tonight."), one("evening 1", "{name}, tonight again.")],
      winback: [one("winback 0", "{name}, come back.")],
    },
    next: {
      noon: [one("next noon", "{name}, {episode} is ready.")],
      evening: [one("next evening", "{name}, {episode} tonight.")],
      winback: [one("next winback", "{name}, {episode} waits.")],
    },
    mid: { noon: [], evening: [], winback: [] },
  },
  lastCopy: one("last", "{name}, we will go quiet."),
};
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const learner = (n: number, over: Partial<CampaignLearner> = {}): CampaignLearner => ({
  userId: uuid(n),
  lastActiveMs: NOW - 30 * HOUR,
  name: "ana maria",
  country: "PH",
  catalogProgress: { "u00-tutorial": ["intro", "S1"] },
  lastCampaignMs: null,
  ...over,
});
const plan = (learners: CampaignLearner[], nowMs = NOW) =>
  planCampaign({ learners, catalog, config, nowMs });

describe("PCA1 판정 — 콘솔과 같은 규칙", () => {
  test("세그먼트 · 예고 자리", () => {
    expect(classify({ "u00-tutorial": ["intro"] }, catalog).segment).toBe("tutorial-lesson1");
    expect(classify({ "u00-tutorial": ["intro", "S1"] }, catalog).segment).toBe("tutorial-lesson2");
    expect(classify({ "u00-tutorial": ["intro", "S1", "S2", "RP"] }, catalog).segment).toBe(
      "episode-next",
    );
    expect(storyPlaceOf({ "u00-tutorial": ["RP"] }, catalog)).toEqual({
      unitId: "u00-tutorial",
      stepId: "RP",
      nextEpisodeId: "u01-water",
    });
    expect(storyPlaceOf({ "u00-tutorial": ["intro"] }, catalog)).toBeNull();
  });

  test("해시 · 대조군은 콘솔(segments.mjs)과 같은 값", () => {
    // 콘솔 FNV-1a와 같은 값이어야 결과 탭이 자동 발송의 대조군을 같게 읽습니다.
    expect(hash32("abc")).toBe(440920331);
    expect(inHoldout("series:x", "u", 0)).toBe(false);
    expect(inHoldout("series:x", "u", 100)).toBe(true);
  });

  test("문구 채우기 — 이름 첫 단어 · 인물 없으면 머리말째 지움", () => {
    const vars = { name: "ana maria", episode: "Buying Water", character: "", steps: 2 };
    expect(renderCopy("{character}: 안녕 · {name}, {episode}", vars)).toBe(
      "안녕 · Ana, Buying Water",
    );
  });

  test("다시 돌아오기와 겹침 — 3일 · 7일 전 하루", () => {
    const run = Date.UTC(2026, 10, 16, 10);
    expect(reengagementOverlap(run - 3.5 * 24 * HOUR, NOW)).toBe(true);
    expect(reengagementOverlap(run - 1 * 24 * HOUR, NOW)).toBe(false);
    // 다음 회차(내일 10시)에 3일이 되는 사람도 겹침입니다.
    expect(reengagementOverlap(run - 2 * 24 * HOUR, NOW)).toBe(true);
  });
});

// 마닐라 12:05(= 04:05 UTC) — 점심 회차.
const NOON = Date.UTC(2026, 10, 16, 4, 5);
const many = (count: number, over: Partial<CampaignLearner> = {}) =>
  Array.from({ length: count }, (_, n) => learner(n, over));
const idle = (nowMs: number, hours: number) => ({ lastActiveMs: nowMs - hours * HOUR });

describe("PCA2 계획 — 빈도 칸 · 점심/저녁 · 매일/복귀 단계", () => {
  test("빠지는 이유를 센다", () => {
    const { rows, skipped } = plan([
      learner(1),
      learner(2, { country: "US" }), // 뉴욕 07시
      learner(3, { country: null }),
      learner(4, { lastActiveMs: NOW - 2 * HOUR }), // 오늘 이미 씀
      learner(5, { lastCampaignMs: NOW - 3 * HOUR }), // 방금 다른 알림
      learner(6, { catalogProgress: { "u00-tutorial": ["intro", "S1", "S2"] } }), // tutorial-rest — 단계 없음
      learner(7, idle(NOW, 8 * 24 + 1)), // 매일 단계가 끝났고 복귀 날도 아님
    ]);
    expect(rows.map((row) => row.userId)).toEqual([uuid(1)]);
    expect(skipped).toMatchObject({
      "local-hour": 1,
      "no-time-zone": 1,
      idle: 2,
      gap: 1,
      "no-rule": 1,
    });
  });

  test("칸은 셋으로 고르게 나뉘고, 진도 · 회차가 달라도 같은 사람은 같은 칸", () => {
    const arms = Array.from({ length: 300 }, (_, n) => armOf(uuid(n)));
    for (const arm of ["control", "once", "twice"] as const)
      expect(arms.filter((value) => value === arm).length, arm).toBeGreaterThan(70);
    const first = plan([learner(7)]).rows[0];
    const later = NOW + 24 * HOUR;
    const again = plan(
      [learner(7, { ...idle(later, 30), catalogProgress: { "u00-tutorial": ["intro"] } })],
      later,
    ).rows[0];
    expect(first).toBeDefined();
    expect(again?.group).toBe(first?.group);
    expect(again?.variant).toBe(first?.variant);
  });

  test("저녁 회차 — 세 칸 모두 줄이 생기고 대조군은 변형이 없다(a 하루 1번 · b 하루 2번)", () => {
    const { rows } = plan(many(90));
    expect(rows).toHaveLength(90);
    for (const row of rows) {
      const arm = armOf(row.userId);
      expect(row.group).toBe(arm === "control" ? "control" : "sent");
      expect(row.variant).toBe(arm === "control" ? null : arm === "once" ? "a" : "b");
      expect(row.series).toBe("빈도 · tutorial");
      expect(row.storyStep).toMatch(/^daily:evening:[01]$/);
      expect(row.title).toMatch(/^evening [01]$/);
    }
  });

  test("점심 회차 — 「하루 2번」 칸만 받고 나머지는 줄이 없다", () => {
    const { rows, skipped } = plan(many(90, idle(NOON, 30)), NOON);
    expect(rows.length).toBeGreaterThan(15);
    expect(rows.every((row) => armOf(row.userId) === "twice" && row.variant === "b")).toBe(true);
    expect(rows.every((row) => /^daily:noon:[01]$/.test(row.storyStep ?? ""))).toBe(true);
    expect(skipped["arm"]).toBe(90 - rows.length);
  });

  test("문구는 날마다 돌아 같은 사람에게 이틀 연속 같은 말이 가지 않는다", () => {
    const today = plan([learner(1)]).rows[0];
    const tomorrow = NOW + 24 * HOUR;
    const next = plan([learner(1, idle(tomorrow, 30))], tomorrow).rows[0];
    expect(today?.title).not.toBe(next?.title);
  });

  test("매일 단계의 마지막 날 저녁은 「멈춘다」 알림, 점심은 평소 문구", () => {
    const evening = plan(many(30, idle(NOW, 6 * 24 + 5))).rows;
    expect(evening).toHaveLength(30);
    expect(evening.every((row) => row.storyStep === "daily:last" && row.title === "last")).toBe(
      true,
    );
    const noon = plan(many(30, idle(NOON, 6 * 24 + 5)), NOON).rows;
    expect(noon.every((row) => row.storyStep?.startsWith("daily:noon:"))).toBe(true);
  });

  test("복귀 단계 — 정한 날 저녁에만, 보내는 두 칸 모두. 점심에는 가지 않는다", () => {
    const evening = plan(many(60, idle(NOW, 10 * 24 + 5))).rows;
    expect(evening).toHaveLength(60);
    expect(evening.every((row) => row.storyStep === "winback:0")).toBe(true);
    expect(evening.some((row) => row.variant === "a")).toBe(true);
    expect(evening.some((row) => row.variant === "b")).toBe(true);
    expect(plan(many(60, idle(NOON, 10 * 24 + 5)), NOON).rows).toHaveLength(0);
    expect(plan(many(60, idle(NOW, 11 * 24 + 5))).rows).toHaveLength(0);
    expect(plan(many(60, idle(NOW, 61 * 24))).rows).toHaveLength(0);
  });

  test("진도마다 그 단계 문구 — 다음 에피소드는 에피소드 이름을 싣는다", () => {
    const next = plan([
      learner(1, { catalogProgress: { "u00-tutorial": ["intro", "S1", "S2", "S3", "RP"] } }),
    ]).rows[0];
    expect(next).toMatchObject({
      series: "빈도 · next",
      segment: "episode-next",
      title: "next evening",
      body: "Ana, Buying Water tonight.",
    });
  });

  test("묶음 — 받는 사람만, 같은 문구끼리", () => {
    const { rows } = plan(many(30, { name: "" }));
    const users = batchesOf(rows).flatMap((batch) => batch.userIds);
    expect(users.length).toBe(rows.filter((row) => row.group === "sent").length);
  });
});

describe("PCA3 설정 — 결정대로(ADR-0208)", () => {
  test("현지 12시 · 20시, 7일 매일 뒤 복귀 날, 튜토리얼 표지부터 에피소드 중간까지 모두 대상", () => {
    expect(pushCampaignConfig.localHours).toEqual({ noon: 12, evening: 20 });
    expect(pushCampaignConfig.dailyDays).toBe(7);
    expect(pushCampaignConfig.winbackDays).toEqual([10, 14, 21, 30, 45, 60]);
    expect(Object.keys(pushCampaignConfig.stages).sort()).toEqual([
      "episode-mid",
      "episode-next",
      "tutorial-cover",
      "tutorial-lesson1",
      "tutorial-lesson2",
      "tutorial-rest",
    ]);
  });

  test("단계마다 점심 · 저녁 문구가 둘 이상(이틀 연속 같은 말이 가지 않게), 모든 문구는 일곱 언어", () => {
    for (const [stage, copy] of Object.entries(pushCampaignConfig.copy)) {
      expect(copy.noon.length, stage).toBeGreaterThanOrEqual(2);
      expect(copy.evening.length, stage).toBeGreaterThanOrEqual(2);
      expect(copy.winback.length, stage).toBeGreaterThanOrEqual(2);
    }
    for (const [id, copy] of allCampaignCopy(pushCampaignConfig))
      expect(Object.keys(copy).sort(), id).toEqual(["en", "es", "id", "ja", "ms", "vi", "zh-TW"]);
  });
});
