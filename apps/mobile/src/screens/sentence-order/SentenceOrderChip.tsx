import { useUiCopy } from "../../lib/ui-copy";
import type { ReactNode } from "@lynx-js/react";
import { useMotion } from "@libitums/ui-lynx/motion";

import { chipAccessibilityLabel, sentenceOrderChipClassName } from "./sentence-order";
import { playSound } from "../../lib/sound-effects";

import "./sentence-order-chip.css";

// 낱말 조각 하나입니다(Figma 65-14). 놓인 조각은 답 칸 줄에 주황 칩으로, 창고의 조각은 흰
// 칩으로 섭니다 — 같은 조각이 어느 목록에 있는가로 모양이 갈립니다. 창고에서 빠져나간
// 자리는 이 컴포넌트가 아니라 `SentenceOrderChipPlaceholder`가 지킵니다.
export type SentenceOrderChipProps = {
  /** `chips` 안에서의 인덱스입니다. **안정적 식별자**이지 화면 위치가 아닙니다. */
  index: number;
  text: string;
  /** 배치된 자리(1-based)입니다. `null`이면 창고에 있습니다. **boolean을 두지 않습니다.** */
  placedOrdinal: number | null;
  /** 누를 수 없는 상태입니다 — 채점 뒤이거나, 칸이 다 차 창고의 조각을 더 놓을 수 없을 때. */
  disabled?: boolean;
  onTap: (index: number) => void;
};

export function SentenceOrderChip({
  index,
  text,
  placedOrdinal,
  disabled = false,
  onTap,
}: SentenceOrderChipProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const handleTap = () => {
    "background only";
    playSound("button");
    onTap(index);
  };
  const variant = placedOrdinal === null ? "bank" : "placed";
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};

  return (
    <view
      className={sentenceOrderChipClassName(variant, motion)}
      data-testid={`sentence-order-chip-${index}`}
      {...motionProps}
      data-placed={placedOrdinal ?? "none"}
      accessibility-element={true}
      accessibility-label={chipAccessibilityLabel(text, placedOrdinal, copy)}
      accessibility-traits={disabled ? "disabled" : "button"}
      bindtap={disabled ? undefined : handleTap}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않습니다(ADR-0016 D5) — 접근성 속성이 없습니다. */}
      <text className="sentence-order-chip-label">{text}</text>
    </view>
  );
}

/**
 * 창고에서 조각이 빠져나간 자리입니다. 같은 크기의 회색 칸이 남아 창고의 배치가 흔들리지
 * 않습니다(디자인). 낭독하지 않습니다 — 조작 단위도 정보도 아닙니다.
 */
export function SentenceOrderChipPlaceholder({
  index,
  text,
}: {
  readonly index: number;
  readonly text: string;
}): ReactNode {
  return (
    <view
      className="sentence-order-chip sentence-order-chip-placeholder"
      data-testid={`sentence-order-bank-slot-${index}`}
      accessibility-elements-hidden={true}
    >
      {/* 자리 폭을 조각 글자로 잡되 보이지 않게 둡니다 — 빈칸이 원래 조각과 같은 폭입니다. */}
      <text className="sentence-order-chip-label sentence-order-chip-label-hidden">{text}</text>
    </view>
  );
}
