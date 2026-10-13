import type { ReactNode } from "@lynx-js/react";

import type { VocabCardActivityProps } from "./vocab-card.contract";

import "./vocab-card-activity.css";

// 낱말 카드를 한 장씩 보이고 넘기는 활동입니다 — 판정하지 않고 빈 결과를 한 번 올립니다. 지금은 루트만
// 서는 뼈대입니다.
export function VocabCardActivity(_props: VocabCardActivityProps): ReactNode {
  return <view data-testid="vocab-card-content" />;
}
