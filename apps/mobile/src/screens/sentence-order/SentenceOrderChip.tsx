import type { ReactNode } from "@lynx-js/react";

import { chipAccessibilityLabel } from "./sentence-order";

import "./sentence-order-chip.css";

// LIB-229 (ui): 계약(.agent-harness/work/lib-229/spec.md §1.8(d) 표)의 속성 전부를
// 채운다. 상태를 갖지 않고 props에서만 파생한다(§1.8(b)). 조각은 놓였든 안 놓였든
// **같은 상자**다 — 같은 것이 옮겨 다니는 것이지 두 종류가 있는 것이 아니다
// (design.md §4.3).

export type SentenceOrderChipProps = {
  /** `chips` 안에서의 인덱스. **안정적 식별자**이지 화면 위치가 아니다. */
  index: number;
  text: string;
  /** 배치된 자리(1-based). `null`이면 창고에 있다. **boolean을 두지 않는다**(§1.1). */
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
      // 언제나 붙고 값만 갈린다. 조건부로 빼면 "속성을 붙이는 것을 잊었다"와
      // "놓이지 않았다"가 구별되지 않는다(계약 §1.8(d) · 듣기 data-result의 "none"과
      // 같은 형태).
      data-placed={placedOrdinal ?? "none"}
      accessibility-element={true}
      // 상태는 라벨 접미사다. `accessibility-value`를 쓰지 않는다(ADR-0016 D3).
      accessibility-label={chipAccessibilityLabel(text, placedOrdinal)}
      // 채점 뒤에도 "button"이다. `disabled`를 주지 않는다(ADR-0016 D10) — 채점 뒤
      // 조각은 *아직* 못 누르는 것이지 영구히가 아니다. 다음 문항에서 다시 눌린다.
      accessibility-traits="button"
      // 탭 하나가 배치와 해제 둘을 진다. 어느 쪽인지는 컴포넌트가 아니라 리듀서가
      // 판정한다(toggleChip) — 이 컴포넌트는 onTap(index) 하나만 부른다. 채점 뒤
      // (phase === "checked")의 탭을 막는 두 번째 게이트도 여기 두지 않는다 — 리듀서가
      // 같은 참조로 흡수한다(계약 §1.6(a)).
      // `index`는 0일 수 있다 — truthy 분기를 만들지 않는다.
      bindtap={() => onTap(index)}
    >
      {placedOrdinal === null ? null : (
        <view
          className="sentence-order-chip-slot"
          // 가림은 자손을 가진 래퍼가 진다 — 자손 없는 `<text>`에 걸면 무동작이다
          // (계약 §1.8(d) · `docs/e2e/journey-map.md` E1과 같은 자리).
          accessibility-elements-hidden={true}
        >
          <text className="sentence-order-chip-slot-label">{String(placedOrdinal)}</text>
        </view>
      )}
      {/* 보이는 이름을 지는 요소는 가리지 않는다(ADR-0016 D5) — 접근성 속성이 없다. */}
      <text className="sentence-order-chip-label">{text}</text>
    </view>
  );
}
