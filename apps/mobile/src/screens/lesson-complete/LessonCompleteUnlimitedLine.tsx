import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { infinityIcon } from "../../components/infinity-icon";
import { useUiCopy } from "../../lib/ui-copy";

import "../tickets/tickets.css";

// 결과 화면의 「No ticket used · Unlimited」 알약입니다(ADR-0115). 무제한 계정에서 「N tickets left」 줄 자리에 같은 여백으로
// 섭니다 — 무제한을 산 사람이 가장 자주 보는 화면에서 「티켓을 쓰지 않았다」를 한 번 더 보입니다. 한 요소로 낭독합니다.
export function LessonCompleteUnlimitedLine(): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="ticket-left-line" data-testid="lesson-complete-unlimited-row">
      <view
        className="ticket-unlimited-pill"
        data-testid="lesson-complete-unlimited"
        accessibility-element={true}
        accessibility-label={copy.tickets.unlimitedLine}
      >
        <svg
          className="ticket-unlimited-pill-icon"
          content={infinityIcon}
          current-color={color.brand.secondary}
        />
        <text className="ticket-left-label">{copy.tickets.unlimitedLine}</text>
      </view>
    </view>
  );
}
