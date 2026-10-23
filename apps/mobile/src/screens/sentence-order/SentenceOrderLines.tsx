import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import { SentenceOrderChip } from "./SentenceOrderChip";
import type { SentenceOrderInteraction } from "./sentence-order-layout";

import "./sentence-order-lines.css";

export type SentenceOrderLinesProps = {
  readonly chips: readonly string[];
  readonly placedChipIndexes: readonly number[];
  readonly results: readonly (AnswerResult | null)[] | null;
  readonly interaction: SentenceOrderInteraction;
  readonly onReturn: (chipIndex: number) => void;
  /** 답 줄 위에 서는 윗줄(읽기 · 듣기 조작)입니다. */
  readonly children: ReactNode;
};

// 줄 배치의 위 줄 + 답 줄 둘입니다. 위 줄(`children`)이 답 줄 상자의 **앞 형제**로 서므로 읽는 순서가 위 줄 → 답 줄입니다.
// 놓인 조각은 줄을 따라 접혀 흐르고 줄마다 아래 선이 서며(둘), 세 줄째가 필요하면 상자가 늘고 선은 둘 그대로입니다.
// 조각을 누르면 창고로 돌아갑니다. 채점 뒤에는 자리별 판정 색이 조각에 붙습니다.
export function SentenceOrderLines({
  chips,
  placedChipIndexes,
  results,
  interaction,
  onReturn,
  children,
}: SentenceOrderLinesProps): ReactNode {
  return (
    <view className="sentence-order-lines-block">
      {children}
      <view className="sentence-order-lines" data-testid="sentence-order-lines">
        <view
          className="sentence-order-line sentence-order-line-0"
          data-testid="sentence-order-line-0"
        />
        <view
          className="sentence-order-line sentence-order-line-1"
          data-testid="sentence-order-line-1"
        />
        <view className="sentence-order-lines-chips">
          {placedChipIndexes.map((chipIndex, position) => (
            <SentenceOrderChip
              key={chipIndex}
              index={chipIndex}
              text={chips[chipIndex] ?? ""}
              placedOrdinal={position + 1}
              disabled={interaction === "locked"}
              result={results?.[position] ?? null}
              onTap={onReturn}
            />
          ))}
        </view>
      </view>
    </view>
  );
}
