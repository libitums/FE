import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import type { UiCopy } from "../../lib/ui-copy.contract";

// 다시 도전의 판(Fixed it! · Not quite) 안 Continue입니다(ADR-0058 ⟨2026-10-30⟩) — ui-lynx `Button`(brand · xl)이 행 폭을
// 채웁니다. 껍데기의 `actionButton` 자리에 함수로 들어가 누름을 껍데기의 아래 버튼 동작에 잇습니다.
export function learningReviewContinue(copy: UiCopy): (press: () => void) => ReactNode {
  return (press) => (
    <view className="learning-shell-review-continue" data-testid="learning-shell-review-continue">
      <Button label={copy.common.continue} variant="brand" size="xl" width="fill" bindtap={press} />
    </view>
  );
}
