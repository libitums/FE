import { describe, expect, test } from "vitest";

import {
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
import { pushCampaignConfig } from "./push-campaign-config.ts";

const HOUR = 3600_000;
// 2026-11-16 12:05 UTC = 마닐라 20:05.
const NOW = Date.UTC(2026, 10, 16, 12, 5);

const catalog: CatalogEpisode[] = [
  { id: "u00-tutorial", steps: ["S1", "S2", "S3", "RP"], title: "Tutorial", character: "승무원" },
  { id: "u01-water", steps: ["S1", "S2", "RP"], title: "Buying Water", character: "편의점 점원" },
];
const storyUnits = {
  "u00-tutorial": {
    title_en: "Tutorial",
    after: {
      S1: [{ hook_name: "dare", text: { en: "after S1", id: "setelah S1" } }],
      RP: [{ hook_name: "half_line", text: { en: "tutorial done" } }],
    },
  },
  "u01-water": {
    title_en: "Buying Water",
    after: { S1: [{ hook_name: "secret", text: { en: "water S1" } }] },
  },
};
const config: CampaignConfig = {
  localHour: 20,
  cooldownHours: 72,
  rules: {
    "tutorial-lesson1": {
      holdoutPercent: 50,
      minIdleHours: 20,
      maxIdleHours: 24 * 14,
      story: false,
    },
    "tutorial-lesson2": {
      holdoutPercent: 30,
      minIdleHours: 20,
      maxIdleHours: 24 * 14,
      story: true,
    },
    "episode-next": { holdoutPercent: 30, minIdleHours: 20, maxIdleHours: 24 * 21, story: true },
  },
  copy: {
    "tutorial-lesson1": {
      en: { title: "{character}: 어서 오세요", body: "{name}, lesson 1 waits." },
    },
    "tutorial-lesson2": { en: { title: "{character}: 괜찮아요", body: "{name}, try lesson 2." } },
    "episode-next": {
      en: { title: "{character}: 수고했어요", body: "{name}, {episode} is ready." },
    },
  },
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
  planCampaign({ learners, catalog, storyCatalog: catalog, storyUnits, config, nowMs });

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

describe("PCA2 계획 — 현지 20시 · 쉰 시간 · 겹침 · 72시간", () => {
  test("빠지는 이유를 센다", () => {
    const { rows, skipped } = plan([
      learner(1),
      learner(2, { country: "US" }), // 뉴욕 07시
      learner(3, { country: null }),
      learner(4, { lastActiveMs: NOW - 2 * HOUR }),
      learner(5, { lastCampaignMs: NOW - 48 * HOUR }),
      learner(6, { catalogProgress: { "u00-tutorial": ["intro", "S1", "S2"] } }), // tutorial-rest — 규칙 없음
    ]);
    expect(rows.map((row) => row.userId)).toEqual([uuid(1)]);
    expect(skipped).toMatchObject({
      "local-hour": 1,
      "no-time-zone": 1,
      idle: 1,
      cooldown: 1,
      "no-rule": 1,
    });
  });

  test("예고가 있는 세그먼트는 받는 사람을 A 캐릭터 톤 · B 예고로 나누고, 대조군은 변형이 없다", () => {
    const learners = Array.from({ length: 80 }, (_, n) => learner(n));
    const { rows } = plan(learners);
    expect(rows).toHaveLength(80);
    const sent = rows.filter((row) => row.group === "sent");
    const control = rows.filter((row) => row.group === "control");
    expect(control.every((row) => row.variant === null)).toBe(true);
    const a = sent.filter((row) => row.variant === "a");
    const b = sent.filter((row) => row.variant === "b");
    expect(a.length).toBeGreaterThan(10);
    expect(b.length).toBeGreaterThan(10);
    expect(a[0]).toMatchObject({
      title: "승무원: 괜찮아요",
      body: "Ana, try lesson 2.",
      storyStep: null,
    });
    expect(b[0]).toMatchObject({
      title: "Tutorial",
      body: "after S1",
      storyStep: "u00-tutorial:S1:dare",
      series: "자동 · tutorial-lesson2",
    });
  });

  test("예고 규칙이 없는 세그먼트는 모두 A, 파이널 뒤 예고 제목은 다음 에피소드", () => {
    const lesson1 = plan([learner(1, { catalogProgress: { "u00-tutorial": ["intro"] } })]).rows;
    expect(lesson1.every((row) => row.variant !== "b")).toBe(true);
    const next = plan(
      Array.from({ length: 40 }, (_, n) =>
        learner(n, { catalogProgress: { "u00-tutorial": ["intro", "S1", "S2", "S3", "RP"] } }),
      ),
    ).rows;
    const b = next.find((row) => row.variant === "b");
    expect(b).toMatchObject({ title: "Buying Water", body: "tutorial done" });
    const a = next.find((row) => row.variant === "a");
    expect(a?.title).toBe("편의점 점원: 수고했어요");
    expect(a?.body).toBe("Ana, Buying Water is ready.");
  });

  test("같은 사람은 회차가 달라도 같은 대조군 · 변형", () => {
    const first = plan([learner(7)]).rows[0];
    const later = NOW + 24 * HOUR;
    const again = plan([learner(7, { lastActiveMs: later - 30 * HOUR })], later).rows[0];
    expect(first).toBeDefined();
    expect(again?.group).toBe(first?.group);
    expect(again?.variant).toBe(first?.variant);
  });

  test("묶음 — 받는 사람만, 같은 문구끼리", () => {
    const { rows } = plan(Array.from({ length: 30 }, (_, n) => learner(n, { name: "" })));
    const batches = batchesOf(rows);
    const users = batches.flatMap((batch) => batch.userIds);
    expect(users.length).toBe(rows.filter((row) => row.group === "sent").length);
  });
});

describe("PCA3 설정 — 결정대로", () => {
  test("현지 20시 · 72시간 · 예고 A/B는 레슨 2 이후 세그먼트, 문구는 모두 캐릭터 톤 + 영어", () => {
    expect(pushCampaignConfig.localHour).toBe(20);
    expect(pushCampaignConfig.cooldownHours).toBe(72);
    const storySegments = Object.entries(pushCampaignConfig.rules)
      .filter(([, rule]) => rule?.story)
      .map(([segment]) => segment)
      .sort();
    expect(storySegments).toEqual([
      "episode-mid",
      "episode-next",
      "tutorial-lesson2",
      "tutorial-rest",
    ]);
    for (const segment of Object.keys(pushCampaignConfig.rules)) {
      const copy = pushCampaignConfig.copy[segment as keyof typeof pushCampaignConfig.copy];
      expect(copy?.en?.title, segment).toMatch(/^\{character\}: /);
      expect(copy?.en?.body, segment).toBeTruthy();
    }
  });
});
