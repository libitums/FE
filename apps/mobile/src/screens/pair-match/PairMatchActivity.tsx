import type { ReactNode } from "@lynx-js/react";

import type { PairMatchActivityProps } from "./pair-match.contract";

import "./pair-match-activity.css";

// 낱말과 뜻을 잇게 하고 확인 한 번에 문항 하나를 판정하는 활동입니다. 지금은 루트만 서는 뼈대입니다.
export function PairMatchActivity(_props: PairMatchActivityProps): ReactNode {
  return <view data-testid="pair-match-content" />;
}
