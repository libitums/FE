import type { ReactNode } from "@lynx-js/react";

import type { PairMatchTileProps } from "./pair-match.contract";

import "./pair-match-tile.css";

// 짝 맞추기 타일 하나입니다 — 받은 표식을 그리고 눌림을 올립니다(상태 없음). 지금은 루트만 서는 뼈대입니다.
export function PairMatchTile({ side, index }: PairMatchTileProps): ReactNode {
  const testId = side === "word" ? `pair-match-word-${index}` : `pair-match-meaning-${index}`;
  return <view data-testid={testId} />;
}
