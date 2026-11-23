import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { coinIcon } from "../../components/coin-icon";
import { ticketIcon } from "../../components/ticket-icon";
import { ticketPriceCoins } from "../../lib/learning-tickets";
import { useUiCopy } from "../../lib/ui-copy";
import { playSound } from "../../lib/sound-effects";
import type { TicketMoreResult, TicketsCopy } from "./tickets.contract";

// 「Get 1 ticket」 버튼(엽전 값 알약)과 그 아래 결과 안내입니다 — 머리 모달(E1)과 티켓 없음 대화상자(E6m)가 함께 씁니다.
// 엽전으로 1장을 삽니다(사용자 결정 2026-11-23 — 하루 한 장 무료를 갈음). 사는 일은 부르는 쪽이 하고, 응답을 기다리는
// 동안(`buying`)은 버튼이 눌리지 않습니다 — 두 번 빠지지 않게.

function noticeOf(more: TicketMoreResult, copy: TicketsCopy["moreNotice"]): string | null {
  if (more === null) return null;
  switch (more.kind) {
    case "buying":
      return null;
    case "bought":
      return copy.bought;
    case "short":
      return copy.short(more.shortBy);
    case "full":
      return copy.full;
    case "sign-in":
      return copy.signIn;
    case "failed":
      return copy.failed;
  }
}

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
  const busy = more?.kind === "buying";
  const notice = noticeOf(more, copy.tickets.moreNotice);
  const handleTap = () => {
    "background only";
    if (busy) return;
    playSound("button");
    onGetMore();
  };
  return (
    <view className="ticket-more">
      {/* 안내는 버튼 위입니다 — 머리 모달(E1)은 버튼이 화면 아래 끝이라 아래 줄은 작은 화면(360×640)에서 잘렸습니다(2026-11-23). */}
      {notice === null ? null : (
        <text
          className={`ticket-more-notice ticket-more-notice-${tone}`}
          data-testid={`${testIdPrefix}-more-notice`}
        >
          {notice}
        </text>
      )}
      {hideButton ? null : (
        <view
          className={`ticket-button ticket-button-brand${busy ? " ticket-button-busy" : ""}`}
          data-testid={`${testIdPrefix}-more`}
          data-busy={busy ? "true" : "false"}
          accessibility-element={true}
          accessibility-label={copy.tickets.getMoreLabel(ticketPriceCoins)}
          accessibility-traits="button"
          bindtap={handleTap}
        >
          <svg className="ticket-button-icon" content={ticketIcon} current-color={color.white} />
          <text className="ticket-button-label ticket-button-label-brand">
            {copy.tickets.getMore}
          </text>
          <view className="ticket-price" data-testid={`${testIdPrefix}-more-price`}>
            <svg className="ticket-price-icon" content={coinIcon} />
            <text className="ticket-price-label">{String(ticketPriceCoins)}</text>
          </view>
        </view>
      )}
    </view>
  );
}
