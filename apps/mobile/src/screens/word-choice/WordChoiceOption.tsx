import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import { optionAccessibilityLabel } from "./word-choice";

import "./word-choice-option.css";

// 형태는 `ListeningChoice`를 잇되 제시 채널에서 오디오가 빠집니다. 상태를
// 갖지 않고 props에서만 파생합니다 — 판정은 화면이 순수 함수로 이미
// 계산해 `result`로 내립니다.

// ⟨2026-09-28, Figma 65-327⟩ **보기에서 표식(✓ · ✗)이 걷혔습니다.** 판정은 무대 카드의
// 배지 하나가 말하고, 보기는 고른 것만 테두리와 글자 색이 갈립니다 — 듣기가 먼저 간
// 자리입니다.
//
// 판정이 화면에서 사라진 것은 아닙니다: `accessibility-label`의 접미사와 `data-result`가
// 그대로라, 스크린리더는 **어느 보기가 정답이었는지**를 여전히 읽습니다.

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
    </view>
  );
}
