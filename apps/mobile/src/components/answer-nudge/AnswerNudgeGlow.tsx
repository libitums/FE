import type { ReactNode } from "@lynx-js/react";
import { useMotion } from "@libitums/ui-lynx/motion";

import "./answer-nudge.css";

/** 힌트가 켜진 조각의 바깥 상자에 붙이는 클래스 — 고요한 그림자. 브랜드 색 테두리는 조각의 CSS가 이 클래스와 묶어 정합니다. */
export const ANSWER_NUDGE_TARGET_CLASS = "answer-nudge-target";

/**
 * 힌트가 켜진 조각 안에 놓는 숨 쉬는 빛(ADR-0177). 그림자를 진 빈 층의 불투명도만 움직입니다 — box-shadow는 iOS keyframe
 * 애니메이터가 읽지 않습니다. 움직임 줄이기에서는 그리지 않고 조각의 고요한 그림자만 남습니다. 낭독하지 않습니다(정답을 읽어 주지 않음).
 */
export function AnswerNudgeGlow(): ReactNode {
  const motion = useMotion();
  if (motion === "reduced") return null;
  return (
    <view
      className="answer-nudge-glow"
      data-testid="answer-nudge-glow"
      accessibility-elements-hidden={true}
    />
  );
}
