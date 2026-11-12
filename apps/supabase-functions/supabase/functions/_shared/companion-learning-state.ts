// 턴 뒤 화제 상태의 학습 칸(간격 · 하루 수 · 건너뜀)을 셉니다. 순수 함수입니다 — 표현 고르기는 `companion-learning.ts`.

import type { TopicState } from "./chat-send.contract.ts";
import { defaultLearningSettings, type LearningTarget } from "./companion-learning.ts";

/** 최근 지시한 표현(피드백이 유저 산출을 판정할 후보) — 최대 5개. */
const recentLimit = 5;

/** 건너뛴 횟수를 기억하는 표현 수의 상한(오래된 것부터 버린다). */
const skipMemoryLimit = 40;

/** 턴 결과에서 화제 상태로 가는 학습 결과: 넣은 표현(칩 · 고른 후보 — 모델이 따르지 못했어도) · 건너뜀 · 준 후보. */
export type LearningResult = {
  readonly target: LearningTarget | null;
  readonly skipped: boolean;
  readonly offered: readonly string[];
};

export const noLearningResult: LearningResult = { target: null, skipped: false, offered: [] };

/**
 * 턴 뒤 화제 상태의 학습 칸. 넣었으면 간격 · 하루 수를 세고 그 표현의 건너뜀을 지운다. 건너뛰었으면 준 후보마다 건너뜀을 하나씩 올리고,
 * `maxSkipStreak`번 이어지면 간격을 새로 센다(`restartGap`).
 */
export function nextLearningState(
  state: TopicState,
  result: LearningResult,
  today: string,
  maxSkipStreak: number = defaultLearningSettings.maxSkipStreak,
): Pick<
  TopicState,
  | "learnDay"
  | "learnToday"
  | "lastExpressionId"
  | "recentTargets"
  | "learnSkipStreak"
  | "learnSkips"
> & { readonly inserted: boolean; readonly restartGap: boolean } {
  const skips = { ...(state.learnSkips ?? {}) };
  const target = result.target;
  if (target === null) {
    const streak = result.skipped ? (state.learnSkipStreak ?? 0) + 1 : (state.learnSkipStreak ?? 0);
    if (result.skipped)
      for (const id of result.offered) {
        const count = (skips[id] ?? 0) + 1;
        delete skips[id];
        skips[id] = count; // 맨 뒤로 — 오래된 것부터 버린다
      }
    const restartGap = result.skipped && streak >= maxSkipStreak;
    return {
      inserted: false,
      restartGap,
      learnDay: state.learnDay ?? null,
      learnToday: state.learnToday ?? 0,
      lastExpressionId: state.lastExpressionId ?? null,
      recentTargets: state.recentTargets ?? [],
      learnSkipStreak: restartGap ? 0 : streak,
      learnSkips: Object.fromEntries(Object.entries(skips).slice(-skipMemoryLimit)),
    };
  }
  delete skips[target.expressionId];
  return {
    inserted: true,
    restartGap: false,
    learnDay: today,
    learnToday: state.learnDay === today ? (state.learnToday ?? 0) + 1 : 1,
    lastExpressionId: target.expressionId,
    recentTargets: [
      ...(state.recentTargets ?? []).filter((id) => id !== target.expressionId),
      target.expressionId,
    ].slice(-recentLimit),
    learnSkipStreak: 0,
    learnSkips: skips,
  };
}
