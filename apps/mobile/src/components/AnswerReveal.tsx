import type { ReactNode } from "@lynx-js/react";

import type { SurfaceTone } from "../lib/surface-tone";

import "./answer-reveal.css";

export type AnswerRevealProps = {
  readonly testId: string;
  /** 정답을 말하는 한 줄 — 문구는 부르는 화면이 문구표에서 만들어 넘깁니다. */
  readonly text: string;
  /** 놓이는 면입니다. 기본 `light`. */
  readonly surface?: SurfaceTone;
};

// 판정 뒤 정답을 보여 주는 상자입니다. 타자 입력 활동과 최종 테스트가 같은 값을 쓰므로 한 곳에 둡니다
// (ADR-0008). 판정 배지(`AnswerVerdict`)와 섞지 않는 이유: 배지는 상태 표식이고 이것은 내용입니다.
// 글자 하나가 보이는 이름이자 낭독 이름이라 접근성 속성을 따로 달지 않습니다.
export function AnswerReveal({ testId, text }: AnswerRevealProps): ReactNode {
  return (
    <view className="answer-reveal">
      <text className="answer-reveal-text" data-testid={testId}>
        {text}
      </text>
    </view>
  );
}
