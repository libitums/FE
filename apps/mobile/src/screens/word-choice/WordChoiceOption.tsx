import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { optionAccessibilityLabel } from "./word-choice";

import "./word-choice-option.css";

// 형태는 `ListeningChoice`를 잇되 제시 채널에서 오디오가 빠집니다. 상태를
// 갖지 않고 props에서만 파생합니다 — 판정은 화면이 순수 함수로 이미
// 계산해 `result`로 내립니다.

// 판정별 표식 아이콘입니다. 모양이 색과 독립인 채널입니다(WCAG 1.4.1). 전체
// index를 import하지 않습니다.
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// `-text` 변형(6.90 / 6.76)입니다. 색은 CSS가 아니라 `current-color` 속성으로
// 넘깁니다(ADR-0014 D2).
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// 세 번째 채널입니다 — 아이콘이 크기를 못 받아 안 보여도 판정이 낱말로
// 남습니다. 낱말은 lib/answer-result.ts의 answerResultLabel이 냅니다.

export type WordChoiceOptionProps = {
  index: number;
  text: string;
  result: AnswerResult | null;
  onSelect: (index: number) => void;
};

export function WordChoiceOption({
  index,
  text,
  result,
  onSelect,
}: WordChoiceOptionProps): ReactNode {
  return (
    <view
      // 상태 클래스는 base 바로 뒤, 같은 파일에 선언합니다 — 특이도가 같아
      // 순서가 결과를 가릅니다(ADR-0003 D7). 판정(정답/오답)은 클래스가
      // 되지 않습니다 — `selected`는 예약 목록에 이미 있는 낱말이라
      // 다섯째가 아닙니다.
      className={"word-choice-option" + (result !== null ? " word-choice-option-selected" : "")}
      data-testid={`word-choice-option-${index}`}
      // 언제나 붙고 값만 갈립니다. 조건부로 빼면 "속성을 잊었다"와 "판정이
      // 없다"가 구별되지 않습니다.
      data-result={result ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사입니다. `accessibility-value`를 쓰지 않습니다
      // (ADR-0016 D3).
      accessibility-label={optionAccessibilityLabel(text, result)}
      // 응답 뒤에도 "button"입니다. ADR-0016 D10의 `disabled`는 영구히
      // 조작 불가한 것에만 주는데, 이 요소는 다음 문항이 렌더되는 순간
      // 다시 눌립니다.
      accessibility-traits="button"
      // 게이트를 두지 않습니다 — 이미 응답한 뒤의 탭은 리듀서가 같은
      // 참조를 돌려주며 흡수합니다. `index`는 0일 수 있습니다 — truthy
      // 분기를 만들지 않습니다.
      bindtap={() => onSelect(index)}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않습니다(ADR-0016 D5) — 접근성 속성이 없습니다. */}
      <text className="word-choice-option-label">{text}</text>
      {result === null ? null : (
        <view
          className="word-choice-option-mark"
          // 표식 래퍼에 가림이 붙는 것이 여기서는 맞습니다 — 보기 행이
          // 조작 단위이고 이름을 이미 라벨이 집니다. 가리는 대상은
          // 자손입니다(view.accessibilityElementsHidden) — 그래서 잎
          // `<svg>`가 아니라 자손을 가진 이 래퍼에 붙입니다. 자손 없는
          // 잎에 붙이면 무동작입니다(`ListeningChoice`의 같은 자리).
          accessibility-elements-hidden={true}
        >
          <svg
            className="word-choice-option-mark-icon"
            data-testid={`word-choice-option-icon-${index}`}
            content={markIconByResult[result]}
            current-color={markIconColorByResult[result]}
          />
          <text className="word-choice-option-mark-label">{answerResultLabel(result)}</text>
        </view>
      )}
    </view>
  );
}
