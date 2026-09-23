import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { optionAccessibilityLabel } from "./culture-quiz";

import "./culture-quiz-option.css";

// `WordChoiceOption`의 형태를 그대로 잇되 import는 하지 않습니다 — 이 화면
// 자신의 모듈(culture-quiz.ts)만 씁니다(승격하지 않고 셋째 복사본을
// 만듭니다). 상태를 갖지 않고 props에서만 파생합니다.

// 판정별 표식 아이콘입니다. 모양이 색과 독립인 채널입니다(WCAG 1.4.1). 전체
// index를 import하지 않습니다 — 아이콘 하나씩 경로로 가져옵니다.
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// 색은 CSS가 아니라 current-color 속성으로 넘깁니다(ADR-0014 D2).
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// 셋째 채널입니다 — 아이콘이 안 보여도 판정이 낱말로 남습니다. 낱말의 정본은
// lib/answer-result.ts의 answerResultLabel 하나입니다.

export type CultureQuizOptionProps = {
  index: number;
  text: string;
  result: AnswerResult | null;
  onSelect: (index: number) => void;
};

export function CultureQuizOption({
  index,
  text,
  result,
  onSelect,
}: CultureQuizOptionProps): ReactNode {
  return (
    <view
      // 상태 클래스는 base 바로 뒤에 선언합니다 — 특이도가 같아 순서가
      // 결과를 가릅니다. 판정(정답/오답)은 클래스가 되지 않습니다 — 예약
      // 상태어를 다섯째로 열지 않습니다(ADR-0003 D7).
      className={"culture-quiz-option" + (result !== null ? " culture-quiz-option-selected" : "")}
      data-testid={`culture-quiz-option-${index}`}
      // 언제나 붙고 값만 갈립니다 — 조건부로 빼면 「속성을 잊었다」와 「판정이
      // 없다」가 구별되지 않습니다.
      data-result={result ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사입니다(ADR-0016 D3). accessibility-value를 쓰지
      // 않습니다.
      accessibility-label={optionAccessibilityLabel(text, result)}
      // 응답 뒤에도 그대로 "button"입니다 — ADR-0016 D10의 disabled는 영구히
      // 조작 불가한 것에만 줍니다.
      accessibility-traits="button"
      // 게이트 없음 — 막는 자리는 리듀서 하나입니다. index가 0일 수 있어
      // truthy 분기를 만들지 않습니다.
      bindtap={() => onSelect(index)}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않습니다(ADR-0016 D5) — 접근성 속성 0건. */}
      <text className="culture-quiz-option-label">{text}</text>
      {result === null ? null : (
        <view
          className="culture-quiz-option-mark"
          // 가림은 자손을 가진 래퍼가 집니다. 이 래퍼의 자손은 <svg> + <text>이고
          // <text>는 기본이 접근성 요소라 무동작이 아닙니다. 잎 <svg>에 붙이면
          // 무동작입니다.
          accessibility-elements-hidden={true}
        >
          <svg
            className="culture-quiz-option-mark-icon"
            data-testid={`culture-quiz-option-icon-${index}`}
            content={markIconByResult[result]}
            current-color={markIconColorByResult[result]}
          />
          <text className="culture-quiz-option-mark-label">{answerResultLabel(result)}</text>
        </view>
      )}
    </view>
  );
}
