import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { ticketIcon } from "../../components/ticket-icon";
import { useUiCopy } from "../../lib/ui-copy";
import { playSound } from "../../lib/sound-effects";
import type { TicketMoreResult } from "./tickets.contract";

// 「Get more tickets」 버튼과 그 아래 Coming soon 안내입니다 — 머리 모달(E1)과 티켓 없음 대화상자(E6m)가 함께 씁니다.
// 충전 화면이 아직 없어 누르면 안내만 서고, 초기 이벤트로 하루 한 장을 채웁니다(채울지는 부르는 쪽이 정합니다).

export type TicketMoreActionProps = {
  readonly testIdPrefix: string;
  readonly more: TicketMoreResult;
  readonly onGetMore: () => void;
  /** `dark`는 짙은 바탕(E1) 위의 안내 글자색입니다. */
  readonly tone: "dark" | "light";
  /** 참이면 버튼을 숨기고 안내만 둡니다 — 대화상자에서 받은 뒤 「Start lesson」이 그 자리에 섭니다. */
  readonly hideButton?: boolean;
};

export function TicketMoreAction({
  testIdPrefix,
  more,
  onGetMore,
  tone,
  hideButton = false,
}: TicketMoreActionProps): ReactNode {
  const copy = useUiCopy();
  const handleTap = () => {
    "background only";
    playSound("button");
    onGetMore();
  };
  return (
    <view className="ticket-more">
      {hideButton ? null : (
        <view
          className="ticket-button ticket-button-brand"
          data-testid={`${testIdPrefix}-more`}
          accessibility-element={true}
          accessibility-label={copy.tickets.getMore}
          accessibility-traits="button"
          bindtap={handleTap}
        >
          <svg className="ticket-button-icon" content={ticketIcon} current-color={color.white} />
          <text className="ticket-button-label ticket-button-label-brand">
            {copy.tickets.getMore}
          </text>
        </view>
      )}
      {more === null ? null : (
        <text
          className={`ticket-more-notice ticket-more-notice-${tone}`}
          data-testid={`${testIdPrefix}-more-notice`}
        >
          {more.granted ? copy.tickets.moreNotice.granted : copy.tickets.moreNotice.notGranted}
        </text>
      )}
    </view>
  );
}
