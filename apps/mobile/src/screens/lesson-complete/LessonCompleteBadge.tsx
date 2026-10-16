import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import type { AssessmentVerdict } from "../assessment/assessment";
import {
  lessonCompleteConfettiCount,
  lessonCompleteHasConfetti,
  rewardBadgeClassName,
  type RewardMotion,
} from "./lesson-complete-reward";

import "./lesson-complete-confetti.css";

const confettiColors = [
  "brand-primary",
  "brand-secondary",
  "feedback-warning",
  "brand-gem",
  "feedback-correct",
  "feedback-incorrect",
] as const;
const confettiShapes = ["dot", "strip", "wide"] as const;
const confettiFlights = [
  "mid-cw",
  "far-ccw",
  "near-cw",
  "far-cw",
  "mid-ccw",
  "near-ccw",
  "far-cw",
] as const;
// 각도를 고르게 나누고 조각마다 ±6° 안에서 고정으로 흔듭니다 — 무작위가 아니라 늘 같은 값입니다.
const confettiJitter = [0, 5, -4, 3, -6, 2, -2, 6, -5, 1, 4, -3] as const;

/** 조각 하나의 축 각도 · 모양 · 날기 · 색입니다(`lesson-complete-confetti.css`). */
const confettiPieces = Array.from({ length: lessonCompleteConfettiCount }, (_, index) => ({
  angle: Math.round((index * 360) / lessonCompleteConfettiCount) + confettiJitter[index % 12],
  className: [
    "lesson-complete-confetti-piece",
    `lesson-complete-confetti-${confettiShapes[index % 3]}`,
    `lesson-complete-confetti-${confettiFlights[index % 7]}`,
    `lesson-complete-confetti-${confettiColors[index % 6]}`,
  ].join(" "),
}));

export type LessonCompleteBadgeProps = {
  readonly verdict: AssessmentVerdict;
  readonly rewardMotion: RewardMotion;
};

// 판정 표식 — 장식입니다. 판정은 화면의 제목과 낭독이 말합니다. 그래도 모양을 가르는 것은 색만으로 갈리지 않게
// 하기 위해서입니다(WCAG 1.4.1): 면 색이 안 보이는 환경에서도 ✓ · ✗가 갈립니다.
//
// 통과하면 배지 뒤에서 폭죽이 사방으로 한 번 터집니다(ADR-0064 — 시안 ④A). 장식이라 낭독하지 않고, 배지보다
// 먼저 그려 배지가 조각을 덮습니다.
export function LessonCompleteBadge({
  verdict,
  rewardMotion,
}: LessonCompleteBadgeProps): ReactNode {
  return (
    <view className="lesson-complete-screen-badge-stage">
      {lessonCompleteHasConfetti(rewardMotion) ? (
        <view
          className="lesson-complete-confetti"
          data-testid="lesson-complete-screen-confetti"
          accessibility-elements-hidden={true}
        >
          {confettiPieces.map((piece, index) => (
            <view
              key={index}
              className="lesson-complete-confetti-ray"
              style={{ transform: `rotate(${piece.angle}deg)` }}
            >
              <view className={piece.className} />
            </view>
          ))}
        </view>
      ) : null}
      <view
        className={rewardBadgeClassName(verdict, rewardMotion)}
        data-verdict={verdict}
        {...(rewardMotion === "none" ? {} : { "data-reward": rewardMotion })}
      >
        <svg
          className="lesson-complete-screen-badge-icon"
          content={verdict === "failed" ? cross : tick}
          current-color={color.white}
        />
      </view>
    </view>
  );
}
