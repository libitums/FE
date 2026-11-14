// 연속 학습 엽전 보상(ADR-0143)의 순수 계산입니다 — 보상표 · 다음 이정표 · 모달 7칸 줄의 꼬리표 · 큰 목표 줄.
// 지급 여부는 서버가 정합니다(`companion_claim_streak_reward`). 이 표는 서버 설정 기본값과 같아야 하고 unit 테스트가 그것을 봅니다.

import { journeyStatSlotCount } from "./journey-stat";

/** 보상표(A안, 2026-11-14 사용자 결정) — 고정 이정표와 「그 뒤 30일마다」. */
export const streakRewardTable = {
  fixed: { 3: 15, 7: 40, 14: 70 } as Readonly<Record<number, number>>,
  repeatDays: 30,
  repeatReward: 150,
} as const;

export type StreakMilestone = { readonly day: number; readonly amount: number };

/** 줄 칸 위 꼬리표 — 지난 이정표(받음)는 초록 체크, 앞으로의 이정표는 엽전. */
export type StreakSlotTag = { readonly kind: "earned" | "upcoming"; readonly amount: number };

export type StreakRewardView = {
  /** 7칸마다의 꼬리표 — 이정표가 아닌 칸은 null. */
  readonly tags: readonly (StreakSlotTag | null)[];
  /** 큰 목표 — 이번 줄 마지막 날 뒤의 첫 이정표와 지금까지 찬 몫(0 ~ 1). */
  readonly goal: StreakMilestone & { readonly ratio: number };
  /** 오늘 뒤 첫 이정표와 남은 날. */
  readonly next: StreakMilestone & { readonly left: number };
  /** 오늘이 이정표이고 아직 안 받았으면 그 액수, 아니면 0. */
  readonly reward: number;
};

const whole = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/** 그날 연속에 붙는 보상입니다. 이정표가 아니면 0. */
export function streakRewardFor(days: number): number {
  const day = whole(days);
  if (day === 0) return 0;
  const fixed = streakRewardTable.fixed[day];
  if (fixed !== undefined) return fixed;
  return day % streakRewardTable.repeatDays === 0 ? streakRewardTable.repeatReward : 0;
}

/** `afterDay`보다 큰 첫 이정표입니다. */
export function nextStreakMilestone(afterDay: number): StreakMilestone {
  const after = whole(afterDay);
  const fixedDays = Object.keys(streakRewardTable.fixed)
    .map(Number)
    .filter((day) => day > after)
    .sort((a, b) => a - b);
  const repeat = streakRewardTable.repeatDays;
  const repeatDay = (Math.floor(after / repeat) + 1) * repeat;
  const day = fixedDays.length > 0 ? Math.min(fixedDays[0]!, repeatDay) : repeatDay;
  return { day, amount: streakRewardFor(day) };
}

/** 모달의 보상 모양입니다. `collectedToday`는 오늘 이정표 보상을 이미 받았는지(기기 기록). */
export function streakRewardView(days: number, collectedToday: boolean): StreakRewardView {
  const today = whole(days);
  // 줄은 이번 연속 주간의 첫날부터입니다(`streakTrack`과 같은 셈) — 연속이 없으면 1일째부터.
  const completed = today === 0 ? 0 : ((today - 1) % journeyStatSlotCount) + 1;
  const rowStart = today - completed + 1;
  const tags = Array.from({ length: journeyStatSlotCount }, (_, index): StreakSlotTag | null => {
    const day = rowStart + index;
    const amount = streakRewardFor(day);
    if (amount === 0) return null;
    if (day < today) return { kind: "earned", amount };
    if (day > today) return { kind: "upcoming", amount };
    return collectedToday ? { kind: "earned", amount } : null;
  });
  const goal = nextStreakMilestone(rowStart + journeyStatSlotCount - 1);
  const next = nextStreakMilestone(today);
  return {
    tags,
    goal: { ...goal, ratio: Math.min(1, today / goal.day) },
    next: { ...next, left: next.day - today },
    reward: collectedToday ? 0 : streakRewardFor(today),
  };
}
