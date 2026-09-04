import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { answerResultLabel, type AnswerResult } from "../../lib/answer-result";
import { optionAccessibilityLabel } from "./word-choice";

import "./word-choice-option.css";

// LIB-229 (ui-c): 계약(.agent-harness/work/lib-229/spec.md §1.8(e) 「WordChoiceOption」
// 표 · §3.2 `ui` 테스트 계획)의 속성 전부를 채운다. 형태는 `ListeningChoice`를 잇되
// (§1.8(e) 「그 형태를 그대로 잇되 제시 채널에서 오디오가 빠진다」) 그대로 베끼지
// 않는 자리 둘이 있다 — 아래 두 주석이 그 자리다. 상태를 갖지 않고 props에서만
// 파생한다(§1.6(a) — 판정은 화면이 순수 함수로 이미 계산해 `result`로 내린다).

// design.md §3.3 · §10의 표 — 판정별 표식 아이콘. 모양이 색과 독립인 채널이다
// (WCAG 1.4.1). 전체 index를 import하지 않는다(§10 「819개가 번들에 들어간다」).
const markIconByResult: Record<AnswerResult, string> = {
  correct: tick,
  incorrect: cross,
};

// design.md §3.3 · §7.2 — `-text` 변형(6.90 / 6.76). 색은 CSS가 아니라
// `current-color` 속성으로 넘긴다(ADR-0014 D2).
const markIconColorByResult: Record<AnswerResult, string> = {
  correct: color.feedback["correct-text"],
  incorrect: color.feedback["incorrect-text"],
};

// 세 번째 채널 — 아이콘이 크기를 못 받아 안 보여도 판정이 낱말로 남는다
// (design.md §3.2). 낱말은 lib/answer-result.ts의 answerResultLabel이 낸다
// (계약 §1.4(d)).

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
      // 상태 클래스는 base 바로 뒤, 같은 파일에 선언한다 — 특이도가 같아 순서가
      // 결과를 가른다(docs/conventions/code.md · ADR-0003 D7). 판정(정답/오답)은
      // 클래스가 되지 않는다 — `selected`는 예약 목록에 이미 있는 낱말이라 다섯째가
      // 아니다(계약 §1.12).
      className={"word-choice-option" + (result !== null ? " word-choice-option-selected" : "")}
      data-testid={`word-choice-option-${index}`}
      // 언제나 붙고 값만 갈린다. 조건부로 빼면 "속성을 잊었다"와 "판정이 없다"가
      // 구별되지 않는다(계약 §2.2).
      data-result={result ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사다. `accessibility-value`를 쓰지 않는다(ADR-0016 D3).
      accessibility-label={optionAccessibilityLabel(text, result)}
      // 응답 뒤에도 "button"이다. ADR-0016 D10의 `disabled`는 영구히 조작 불가한
      // 것에만 주는데, 이 요소는 다음 문항이 렌더되는 순간 다시 눌린다.
      accessibility-traits="button"
      // 게이트를 두지 않는다 — 이미 응답한 뒤의 탭은 리듀서가 같은 참조를 돌려주며
      // 흡수한다(계약 §1.6(a) 「막는 자리가 하나다」). `index`는 0일 수 있다 —
      // truthy 분기를 만들지 않는다.
      bindtap={() => onSelect(index)}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않는다(ADR-0016 D5) — 접근성 속성이 없다. */}
      <text className="word-choice-option-label">{text}</text>
      {result === null ? null : (
        <view
          className="word-choice-option-mark"
          // 표식 래퍼에 가림이 붙는 것이 여기서는 맞다 — 보기 행이 조작 단위이고
          // 이름을 이미 라벨이 진다(계약 §1.8(e)). 가리는 대상은 자손이다
          // (view.accessibilityElementsHidden) — 그래서 잎 `<svg>`가 아니라 자손을
          // 가진 이 래퍼에 붙인다. 자손 없는 잎에 붙이면 무동작이다
          // (`ListeningChoice`의 같은 자리 · `docs/e2e/journey-map.md` E1).
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
