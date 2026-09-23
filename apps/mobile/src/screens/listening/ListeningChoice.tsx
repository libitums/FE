import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { choiceAccessibilityLabel } from "./listening";

import "./listening-choice.css";

// 상태를 갖지 않고 props에서만 파생합니다 — 판정은 이미 계산돼 `result`로
// 들어옵니다.

// 판정별 표식 아이콘입니다. 모양이 **색과 독립인 두 번째 채널**입니다
// (WCAG 1.4.1). 리터럴을 적지 않고 패키지 모듈을 가져옵니다. 전체 index
// (`@libitums/icons/lynx`)를 import하지 않습니다 — 819개가 번들에
// 들어갑니다.
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// `-text` 변형입니다. `feedback.correct`(`#35A66F`)는 행 배경 대비 3.03:1로
// 한 단계만 밝아져도 미달이라 표시한 경계값이고, 여정 맵에 이미 둘 서
// 있습니다 — 세 번째를 들이지 않습니다. `-text` 변형은 6.90 / 6.76입니다.
//
// 색은 CSS가 아니라 `current-color` 속성으로 넘깁니다 — Lynx `<svg>`가 CSS
// `color`를 읽지 않습니다(ADR-0014 D2). 하이픈 키라 대괄호 표기입니다.
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// 세 번째 채널입니다 — 아이콘이 크기를 못 받아 안 보여도 판정이 낱말로
// 남습니다. 낱말은 lib/answer-result.ts의 answerResultLabel이 냅니다.

export type ListeningChoiceProps = {
  index: number;
  text: string;
  result: AnswerResult | null;
  onSelect: (index: number) => void;
};

export function ListeningChoice({
  index,
  text,
  result,
  onSelect,
}: ListeningChoiceProps): ReactNode {
  return (
    <view
      // 상태 클래스는 base 뒤에 더해 붙입니다(짝 CSS가 base 바로 뒤에
      // 선언합니다). 판정(정답/오답)은 클래스가 되지 않습니다 — 예약
      // 상태어를 다섯째로 열지 않습니다(ADR-0003 D7).
      className={"listening-choice" + (result !== null ? " listening-choice-selected" : "")}
      data-testid={`listening-choice-${index}`}
      // 언제나 붙고 값만 갈립니다. 조건부로 빼면 "속성을 붙이는 것을
      // 잊었다"와 "판정이 없다"가 구별되지 않습니다.
      data-result={result ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사입니다. `accessibility-value`를 쓰지 않습니다
      // (ADR-0016 D3).
      accessibility-label={choiceAccessibilityLabel(text, result)}
      // 응답 뒤에도 "button"입니다. ADR-0016 D10의 `disabled`는 **영구히**
      // 조작 불가한 것에만 주는데, 이 요소는 다음 문항이 렌더되는 순간
      // 다시 눌립니다.
      accessibility-traits="button"
      // 게이트를 두지 않습니다 — 이미 응답한 뒤의 탭은 리듀서가 같은
      // 참조를 돌려주며 흡수합니다. 막는 자리가 정확히 하나입니다.
      // `index`는 0일 수 있습니다 — truthy 분기를 만들지 않습니다.
      bindtap={() => onSelect(index)}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않습니다(ADR-0016 D5) — 접근성 속성이 없습니다. */}
      <text className="listening-choice-label">{text}</text>
      {result === null ? null : (
        <view
          className="listening-choice-mark"
          // 가림은 래퍼가 집니다 — 이 속성의 iOS 세터는
          // `view.accessibilityElementsHidden`이라 가리는 대상이
          // **자손**입니다. 자손 없는 `<svg>`에만 붙으면 아무것도 가려지지
          // 않고, 정작 가려야 할 `<text>`는 `LynxUIText`의
          // `enableAccessibilityByDefault`가 `YES`라 기본이 접근성
          // 요소입니다(ADR-0016 D5).
          accessibility-elements-hidden={true}
        >
          <svg
            className="listening-choice-mark-icon"
            data-testid={`listening-choice-icon-${index}`}
            content={markIconByResult[result]}
            current-color={markIconColorByResult[result]}
          />
          <text className="listening-choice-mark-label">{answerResultLabel(result)}</text>
        </view>
      )}
    </view>
  );
}
