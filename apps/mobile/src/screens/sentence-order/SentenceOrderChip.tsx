import type { ReactNode } from "@lynx-js/react";

import { chipAccessibilityLabel } from "./sentence-order";

import "./sentence-order-chip.css";

// 상태를 갖지 않고 props에서만 파생합니다. 조각은 놓였든 안 놓였든 **같은
// 상자**입니다 — 같은 것이 옮겨 다니는 것이지 두 종류가 있는 것이 아닙니다.

export type SentenceOrderChipProps = {
  /** `chips` 안에서의 인덱스입니다. **안정적 식별자**이지 화면 위치가 아닙니다. */
  index: number;
  text: string;
  /** 배치된 자리(1-based)입니다. `null`이면 창고에 있습니다. **boolean을 두지 않습니다.** */
  placedOrdinal: number | null;
  onTap: (index: number) => void;
};

export function SentenceOrderChip({
  index,
  text,
  placedOrdinal,
  onTap,
}: SentenceOrderChipProps): ReactNode {
  return (
    <view
      className="sentence-order-chip"
      data-testid={`sentence-order-chip-${index}`}
      // 언제나 붙고 값만 갈립니다. 조건부로 빼면 "속성을 붙이는 것을
      // 잊었다"와 "놓이지 않았다"가 구별되지 않습니다(듣기 data-result의
      // "none"과 같은 형태입니다).
      data-placed={placedOrdinal ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사입니다. `accessibility-value`를 쓰지 않습니다
      // (ADR-0016 D3).
      accessibility-label={chipAccessibilityLabel(text, placedOrdinal)}
      // 채점 뒤에도 "button"입니다. `disabled`를 주지 않습니다(ADR-0016 D10)
      // — 채점 뒤 조각은 *아직* 못 누르는 것이지 영구히가 아닙니다. 다음
      // 문항에서 다시 눌립니다.
      accessibility-traits="button"
      // 탭 하나가 배치와 해제 둘을 집니다. 어느 쪽인지는 컴포넌트가 아니라
      // 리듀서가 판정합니다(toggleChip) — 이 컴포넌트는 onTap(index) 하나만
      // 부릅니다. 채점 뒤(phase === "checked")의 탭을 막는 두 번째 게이트도
      // 여기 두지 않습니다 — 리듀서가 같은 참조로 흡수합니다.
      // `index`는 0일 수 있습니다 — truthy 분기를 만들지 않습니다.
      bindtap={() => onTap(index)}
    >
      {placedOrdinal === null ? null : (
        <view
          className="sentence-order-chip-slot"
          // 가림은 자손을 가진 래퍼가 집니다 — 자손 없는 `<text>`에 걸면
          // 무동작입니다.
          accessibility-elements-hidden={true}
        >
          <text className="sentence-order-chip-slot-label">{String(placedOrdinal)}</text>
        </view>
      )}
      {/* 보이는 이름을 지는 요소는 가리지 않습니다(ADR-0016 D5) — 접근성 속성이 없습니다. */}
      <text className="sentence-order-chip-label">{text}</text>
    </view>
  );
}
