import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";
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

/** 통과 폭죽의 조각 수입니다(ADR-0064 — 시안 ④A). 조각마다 축 각도를 360° / 수로 나눕니다(`LessonCompleteBadge`). */
export const lessonCompleteConfettiCount = 28;

/** 폭죽은 성취 모션이 선 때만 터집니다 — 미통과(`none`)와 움직임 줄이기(`fade`)에는 없습니다. */
export function lessonCompleteHasConfetti(reward: RewardMotion): boolean {
  return reward === "expressive";
}

/**
 * 제목 묶음 · 보상 카드가 배지 뒤에 올라오는 클래스입니다. 성취면 아래에서 올라오고(`-rise`), 줄이기면 페이드만
 * (`-rise-fade`), 미통과면 움직이지 않습니다(undefined).
 */
export function lessonCompleteRiseClassName(
  reward: RewardMotion,
  slot: "summary" | "rewards",
): string | undefined {
  if (reward === "none") return undefined;
  return reward === "expressive"
    ? `lesson-complete-screen-rise lesson-complete-screen-rise-${slot}`
    : "lesson-complete-screen-rise-fade";
}

/**
 * 머리 칩이 오르기 전에 기다리는 시간입니다(시안 ③ 「배지 뒤에」). 성취면 배지(`reward`)가 자리 잡고 제목이
 * 올라오기 시작한 뒤(`d4`), 줄이기면 배지 페이드(`d2`) 뒤, 미통과면 기다리지 않습니다.
 */
export function lessonCompleteChipBumpDelayMs(reward: RewardMotion): number {
  if (reward === "expressive") {
    return motionDurationMs(motion.duration.reward) + motionDurationMs(motion.duration.d4);
  }
  return reward === "fade" ? motionDurationMs(motion.duration.d2) : 0;
}
