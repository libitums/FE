import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import { choiceAccessibilityLabel } from "./listening";

import "./listening-choice.css";

// 상태를 갖지 않고 props에서만 파생합니다 — 판정은 이미 계산돼 `result`로
// 들어옵니다.

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
      // 판정이 클래스로 붙습니다 — 고른 보기의 글자와 테두리가 `feedback-correct` ·
      // `feedback-incorrect`로 갈립니다(2026-09-28). 예약 상태어(ADR-0003 D7의
      // `selected`·`done`·`current`·`locked`)를 늘리지 않습니다: 낱말이 `correct` ·
      // `incorrect`라 그 넷과 겹치지 않고, 값의 정본은 `AnswerResult` 타입입니다.
      className={"listening-choice" + (result === null ? "" : ` listening-choice-${result}`)}
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
      {/* 2026-09-27: **보이는 표식(✓ · ✗)이 걷혔습니다**(Figma 53-14231). 판정은 무대
          카드의 배지 하나가 말하고, 보기는 넷이 같은 모양으로 섭니다.

          판정이 화면에서 아예 사라진 것은 아닙니다 — `accessibility-label`의 접미사가
          그대로 지고(ADR-0016 D3), `data-result`도 그대로입니다. 그래서 스크린리더는
          **어느 보기가 정답이었는지**를 여전히 읽습니다. 눈으로 보는 쪽은 배지가
          「맞았다 · 틀렸다」만 알고 어느 것을 골랐는지는 모릅니다 — 디자인이 그렇게
          정했습니다. */}
    </view>
  );
}
