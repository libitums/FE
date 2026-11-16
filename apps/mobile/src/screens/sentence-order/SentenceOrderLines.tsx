import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";

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
  /** 힌트 「정답 보기」로 답 줄에 흐리게 까는 정답 문장입니다(ADR-0153). */
  readonly ghost?: string;
  /** 작은 화면에서 창고가 커지면 답 줄을 하나로 줄입니다 — 버튼이 밀리기 전에 답 줄 영역부터 줄입니다(#448 기준). */
  readonly compact?: boolean;
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
  ghost,
  compact = false,
  children,
}: SentenceOrderLinesProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="sentence-order-lines-block">
      {children}
      <view
        className={
          compact ? "sentence-order-lines sentence-order-lines-compact" : "sentence-order-lines"
        }
        data-testid="sentence-order-lines"
        data-compact={compact ? "true" : "false"}
      >
        <view
          className="sentence-order-line sentence-order-line-0"
          data-testid="sentence-order-line-0"
        />
        {compact ? null : (
          <view
            className="sentence-order-line sentence-order-line-1"
            data-testid="sentence-order-line-1"
          />
        )}
        {ghost === undefined ? null : (
          <text
            className="sentence-order-lines-ghost"
            data-testid="sentence-order-lines-ghost"
            accessibility-element={true}
            accessibility-label={copy.assembledHint.shown(ghost)}
          >
            {ghost}
          </text>
        )}
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
