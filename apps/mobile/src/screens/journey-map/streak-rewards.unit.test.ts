import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  nextStreakMilestone,
  streakRewardFor,
  streakRewardTable,
  streakRewardView,
} from "./streak-rewards";

// `unit` 계층(SR-U1 ~ U4): 연속 학습 엽전 보상(ADR-0143)의 표 · 다음 이정표 · 7칸 줄 꼬리표 · 큰 목표 줄.

const earned = (amount: number) => ({ kind: "earned", amount });
const upcoming = (amount: number) => ({ kind: "upcoming", amount });

describe("보상표", () => {
  test("SR-U1 3 · 7 · 14일과 30일마다, 그 밖은 0", () => {
    expect([3, 7, 14, 30, 60, 90].map(streakRewardFor)).toEqual([15, 40, 70, 150, 150, 150]);
    expect([0, 1, 2, 4, 6, 8, 13, 15, 29, 31, 45, -7, Number.NaN].map(streakRewardFor)).toEqual(
      Array.from({ length: 13 }, () => 0),
    );
  });

  test("SR-U2 다음 이정표 — 3 → 7 → 14 → 30 → 60", () => {
    expect([0, 2, 3, 6, 7, 13, 14, 29, 30, 45].map(nextStreakMilestone)).toEqual([
      { day: 3, amount: 15 },
      { day: 3, amount: 15 },
      { day: 7, amount: 40 },
      { day: 7, amount: 40 },
      { day: 14, amount: 70 },
      { day: 14, amount: 70 },
      { day: 30, amount: 150 },
      { day: 30, amount: 150 },
      { day: 60, amount: 150 },
      { day: 60, amount: 150 },
    ]);
  });
});

describe("모달 모양", () => {
  test("SR-U3a 5일 — 3일 칸은 받은 꼬리표, 7일 칸은 +40, 큰 목표 14일, 2일 남음, 오늘 보상 없음", () => {
    expect(streakRewardView(5, false)).toEqual({
      tags: [null, null, earned(15), null, null, null, upcoming(40)],
      goal: { day: 14, amount: 70, ratio: 5 / 14 },
      next: { day: 7, amount: 40, left: 2 },
      reward: 0,
    });
  });

  test("SR-U3b 7일 — 안 받았으면 오늘 칸은 비우고 카드가 40, 받았으면 초록 꼬리표 · 0", () => {
    const fresh = streakRewardView(7, false);
    expect(fresh.tags).toEqual([null, null, earned(15), null, null, null, null]);
    expect(fresh.reward).toBe(40);
    expect(fresh.next).toEqual({ day: 14, amount: 70, left: 7 });
    const collected = streakRewardView(7, true);
    expect(collected.tags[6]).toEqual(earned(40));
    expect(collected.reward).toBe(0);
  });

  test("SR-U3c 9일 — 줄이 8 ~ 14일로 넘어가 14일 칸에 +70, 큰 목표는 30일", () => {
    const view = streakRewardView(9, false);
    expect(view.tags).toEqual([null, null, null, null, null, null, upcoming(70)]);
    expect(view.goal).toEqual({ day: 30, amount: 150, ratio: 9 / 30 });
    expect(view.next).toEqual({ day: 14, amount: 70, left: 5 });
  });

  test("SR-U3d 0일 — 첫 줄이 1 ~ 7일이라 3 · 7일 칸이 앞으로의 꼬리표", () => {
    const view = streakRewardView(0, false);
    expect(view.tags).toEqual([null, null, upcoming(15), null, null, null, upcoming(40)]);
    expect(view.goal).toEqual({ day: 14, amount: 70, ratio: 0 });
    expect(view.next).toEqual({ day: 3, amount: 15, left: 3 });
    expect(view.reward).toBe(0);
  });

  test("SR-U3e 30일 — 줄 29 ~ 35일, 큰 목표는 60일, 카드 150", () => {
    const view = streakRewardView(30, false);
    expect(view.tags).toEqual([null, null, null, null, null, null, null]);
    expect(view.goal).toEqual({ day: 60, amount: 150, ratio: 0.5 });
    expect(view.reward).toBe(150);
  });
});

test("SR-U4 앱 표 = 서버 설정 기본값(마이그레이션)", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "../supabase-functions/supabase/migrations/20261128120000_streak_rewards.sql",
    ),
    "utf8",
  );
  const fixed = /streak_rewards jsonb not null default '([^']+)'/.exec(sql)?.[1];
  const repeatDays = /streak_repeat_days integer not null default (\d+)/.exec(sql)?.[1];
  const repeatReward = /streak_repeat_reward integer not null default (\d+)/.exec(sql)?.[1];
  expect(JSON.parse(fixed ?? "null")).toEqual(
    Object.fromEntries(
      Object.entries(streakRewardTable.fixed).map(([day, amount]) => [day, amount]),
    ),
  );
  expect(Number(repeatDays)).toBe(streakRewardTable.repeatDays);
  expect(Number(repeatReward)).toBe(streakRewardTable.repeatReward);
});
