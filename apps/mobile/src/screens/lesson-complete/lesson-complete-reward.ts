import type { Motion } from "@libitums/ui-lynx/motion";

import type { AssessmentVerdict } from "../assessment/assessment";

/** 배지에 거는 보상 모션. 통과만 성취(정본 motion.md 학습 흐름 표)이고, reduced는 불투명도만. */
export type RewardMotion = "expressive" | "fade" | "none";

/**
 * 판정과 움직임 정책에서 배지의 보상 모션 종류를 고릅니다.
 * ("passed","standard") → "expressive" · ("passed","reduced") → "fade" · ("failed", *) → "none".
 * 던지지 않습니다.
 */
export function rewardMotionFor(verdict: AssessmentVerdict, motion: Motion): RewardMotion {
  if (verdict === "failed") {
    return "none";
  }
  return motion === "reduced" ? "fade" : "expressive";
}

/**
 * 배지 클래스 — base + verdict 변형 + 보상 변형. 토큰 순서가 곧 선언 순서입니다.
 * ("failed","none") → "lesson-complete-screen-badge lesson-complete-screen-badge-failed".
 * ("passed","none")는 만들 수 없는 조합이지만 던지지 않고 base만 돌려줍니다.
 */
export function rewardBadgeClassName(verdict: AssessmentVerdict, reward: RewardMotion): string {
  const base = "lesson-complete-screen-badge";
  const tokens = [base];
  if (verdict === "failed") {
    tokens.push(`${base}-failed`);
  }
  if (reward === "expressive") {
    tokens.push(`${base}-motion-reward`);
  } else if (reward === "fade") {
    tokens.push(`${base}-motion-fade`);
  }
  return tokens.join(" ");
}
