import type { ReactNode } from "@lynx-js/react";

import { SentenceOrderChip, SentenceOrderChipPlaceholder } from "./SentenceOrderChip";
import type { SentenceOrderInteraction } from "./sentence-order-layout";

import "./sentence-order-screen.css";

export type SentenceOrderLinesBankProps = {
  readonly chips: readonly string[];
  readonly placedChipIndexes: readonly number[];
  /** 칸이 다 찼거나 채점 뒤면 `locked`입니다 — 조각 전부가 같은 상태입니다. */
  readonly interaction: SentenceOrderInteraction;
  readonly onTap: (index: number) => void;
};

// 줄 배치(듣고 조립 · 문장 순서)의 창고입니다 — 조각이 빠져나가도 그 자리에 회색 칸이 남아 배치가 흔들리지 않습니다.
export function SentenceOrderLinesBank({
  chips,
  placedChipIndexes,
  interaction,
  onTap,
}: SentenceOrderLinesBankProps): ReactNode {
  return (
    <view className="sentence-order-screen-bank" data-testid="sentence-order-screen-bank">
      {chips.map((text, chipIndex) =>
        placedChipIndexes.includes(chipIndex) ? (
          <SentenceOrderChipPlaceholder key={chipIndex} index={chipIndex} text={text} />
        ) : (
          <SentenceOrderChip
            key={chipIndex}
            index={chipIndex}
            text={text}
            placedOrdinal={null}
            disabled={interaction === "locked"}
            onTap={onTap}
          />
        ),
      )}
    </view>
  );
}
