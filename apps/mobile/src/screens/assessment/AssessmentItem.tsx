import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { assessmentItemAccessibilityLabel, assessmentItemTitle } from "./assessment";

import "./assessment-item.css";

// LIB-227 (ui): 계약(.agent-harness/work/lib-227/spec.md §1.7 「AssessmentItem의 요소와
// 속성」 표)의 속성 전부를 채운다. 형태의 정본은 `ListeningChoice` — 정오 표시 부분과
// 같은 형태이지만 이 행은 조작 단위가 아니다(§1.7). 상태를 갖지 않고 props에서만
// 파생한다(계약 §1.3).

// design.md §10 · §3.3과 같은 표 — 판정별 표식 아이콘. 모양이 색과 독립인 채널이다
// (WCAG 1.4.1). 전체 index를 import하지 않는다(계약 §1.10-1 · `ListeningChoice`와 같은
// 판단).
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// design.md §10 · §4.2 — `-text` 변형(6.90 / 6.76). 색은 CSS가 아니라 `current-color`
// 속성으로 넘긴다(ADR-0014 D2).
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// 세 번째 채널 — 아이콘이 크기를 못 받아 안 보여도 판정이 낱말로 남는다(design.md §4.2).
// 낱말은 lib/answer-result.ts의 answerResultLabel이 낸다 (LIB-229 계약 §1.4(d)).

export type AssessmentItemProps = {
  index: number;
  result: AnswerResult;
};

export function AssessmentItem({ index, result }: AssessmentItemProps): ReactNode {
  return (
    <view
      className="assessment-item"
      data-testid={`assessment-item-${index}`}
      // 언제나 붙고 값만 갈린다. "none" 값이 없다 — 평가 행은 판정을 반드시 진다
      // (계약 §2.2).
      data-result={result}
      accessibility-element={true}
      // 상태는 라벨 접미사다. `accessibility-value`를 쓰지 않는다(ADR-0016 D3).
      accessibility-label={assessmentItemAccessibilityLabel(index, result)}
      // `accessibility-traits`를 붙이지 않는다 — 이 행은 누를 수 없다(D8 범위 밖).
      // `bindtap`도 없다.
    >
      {/* 보이는 이름을 지는 요소는 가리지 않는다(ADR-0016 D5) — 접근성 속성이 없다. */}
      <text className="assessment-item-label">{assessmentItemTitle(index)}</text>
      <view
        className="assessment-item-mark"
        // 가림은 자손을 가진 래퍼가 진다 — 자손 없는 `<svg>`에만 붙이면 아무것도
        // 가려지지 않고, 정작 가려야 할 `<text>`는 기본이 접근성 요소다(계약 §1.7).
        accessibility-elements-hidden={true}
      >
        <svg
          className="assessment-item-mark-icon"
          data-testid={`assessment-item-icon-${index}`}
          content={markIconByResult[result]}
          current-color={markIconColorByResult[result]}
        />
        <text className="assessment-item-mark-label">{answerResultLabel(result)}</text>
      </view>
    </view>
  );
}
