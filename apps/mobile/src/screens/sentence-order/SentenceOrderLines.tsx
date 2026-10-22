import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import type { SentenceOrderInteraction } from "./sentence-order-layout";

export type SentenceOrderLinesProps = {
  readonly chips: readonly string[];
  readonly placedChipIndexes: readonly number[];
  readonly results: readonly (AnswerResult | null)[] | null;
  readonly interaction: SentenceOrderInteraction;
  readonly onReturn: (chipIndex: number) => void;
  /** 답 줄 위에 서는 윗줄(읽기 · 듣기 조작)입니다. */
  readonly children: ReactNode;
};

// 줄 배치의 위 줄 + 답 줄 둘입니다. 껍데기만 있는 단계입니다 — 줄을 그리지 않습니다.
export function SentenceOrderLines({ children }: SentenceOrderLinesProps): ReactNode {
  return <view data-testid="sentence-order-lines">{children}</view>;
}
