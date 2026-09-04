import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { choiceAccessibilityLabel } from "./listening";

import "./listening-choice.css";

// LIB-223 (ui): 계약(.agent-harness/work/lib-223/spec.md §1.7 「ListeningChoice」)의
// 속성 전부를 채운다. 상태를 갖지 않고 props에서만 파생한다 — 판정은 이미 계산돼
// `result`로 들어온다 (§1.6).

// design.md §3.3 · §8의 표 — 판정별 표식 아이콘. 모양이 **색과 독립인 두 번째
// 채널**이다 (WCAG 1.4.1 · 계약 §1.7.1). 리터럴을 적지 않고 패키지 모듈을 가져온다.
// 전체 index(`@libitums/icons/lynx`)를 import하지 않는다 — 819개가 번들에 들어간다.
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// design.md §3.3 · §8이 계약 §1.7.1 표의 `(design 확정)` 자리를 채우며 **`-text`
// 변형으로 정정**했다. `feedback.correct`(`#35A66F`)는 행 배경 대비 3.03:1로
// lib-222가 *"한 단계만 밝아져도 미달"* 이라 표시한 경계값이고, 여정 맵에 이미 둘
// 서 있다 — 세 번째를 들이지 않는다. `-text` 변형은 6.90 / 6.76이다.
//
// 색은 CSS가 아니라 `current-color` 속성으로 넘긴다 — Lynx `<svg>`가 CSS `color`를
// 읽지 않는다 (ADR-0014 D2). 하이픈 키라 대괄호 표기다.
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// 세 번째 채널 — 아이콘이 크기를 못 받아 안 보여도 판정이 낱말로 남는다
// (design.md §4.3-c · `docs/e2e/design-token-rendering.md`의 선례). 낱말은
// lib/answer-result.ts의 answerResultLabel이 낸다 (LIB-229 계약 §1.4(d)).

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
      // 상태 클래스는 base 뒤에 더해 붙인다 (짝 CSS가 base 바로 뒤에 선언한다).
      // 판정(정답/오답)은 클래스가 되지 않는다 — 예약 상태어를 다섯째로 열지 않는다
      // (계약 §1.7.1 · ADR-0003 D7).
      className={"listening-choice" + (result !== null ? " listening-choice-selected" : "")}
      data-testid={`listening-choice-${index}`}
      // 언제나 붙고 값만 갈린다. 조건부로 빼면 "속성을 붙이는 것을 잊었다"와
      // "판정이 없다"가 구별되지 않는다 (계약 §1.7).
      data-result={result ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사다. `accessibility-value`를 쓰지 않는다 (ADR-0016 D3).
      accessibility-label={choiceAccessibilityLabel(text, result)}
      // 응답 뒤에도 "button"이다. ADR-0016 D10의 `disabled`는 **영구히** 조작
      // 불가한 것에만 주는데, 이 요소는 다음 문항이 렌더되는 순간 다시 눌린다.
      accessibility-traits="button"
      // 게이트를 두지 않는다 — 이미 응답한 뒤의 탭은 리듀서가 같은 참조를 돌려주며
      // 흡수한다 (계약 §1.5). 막는 자리가 정확히 하나다.
      // `index`는 0일 수 있다 — truthy 분기를 만들지 않는다.
      bindtap={() => onSelect(index)}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않는다 (ADR-0016 D5) — 접근성 속성이 없다. */}
      <text className="listening-choice-label">{text}</text>
      {result === null ? null : (
        <view
          className="listening-choice-mark"
          // 가림은 래퍼가 진다 — 이 속성의 iOS 세터는 `view.accessibilityElementsHidden`
          // 이라 가리는 대상이 **자손**이다. 자손 없는 `<svg>`에만 붙으면 아무것도
          // 가려지지 않고, 정작 가려야 할 `<text>`는 `LynxUIText`의
          // `enableAccessibilityByDefault`가 `YES`라 기본이 접근성 요소다
          // (계약 §1.7 · `docs/e2e/journey-map.md` E1 · ADR-0016 D5).
          accessibility-elements-hidden={true}
        >
          <svg
            className="listening-choice-mark-icon"
            data-testid={`listening-choice-icon-${index}`}
            content={markIconByResult[result]}
            current-color={markIconColorByResult[result]}
            accessibility-elements-hidden={true}
          />
          <text className="listening-choice-mark-label">{answerResultLabel(result)}</text>
        </view>
      )}
    </view>
  );
}
