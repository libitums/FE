import type { ReactNode } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";

import { coinIcon } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import type { EarlyAccessOffer } from "./friend-catalog.contract";
import { friendProfileTestIds as profileIds } from "./friend-profile.contract";
import type { SuggestedFriendsCopy } from "./suggested-friends.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import { offerBadgeOf } from "./suggested-friends";

// 단추 · 배지 · 둘째 줄을 한 이름으로 읽습니다 — 값의 단위(엽전)와 남은 기간이 그림에만 있지 않게.
function earlyLabel(offer: EarlyAccessOffer, now: number, copy: SuggestedFriendsCopy): string {
  const badge = offerBadgeOf(offer, now);
  return copy.earlyButtonLabel(offer.price, badge.kind === "limited" ? null : badge);
}

function limitedText(offer: EarlyAccessOffer, now: number, copy: SuggestedFriendsCopy): string {
  const badge = offerBadgeOf(offer, now);
  return badge.kind === "limited" ? copy.limited : copy.limitedUntil(badge.days, badge.hours);
}

export type SuggestedSheetActionsProps = {
  readonly name: string;
  /** suggest = 추가 · 먼저 만나기 · Not now, profile = 닫기만(방에서 연 읽기 전용). */
  readonly mode: "suggest" | "profile";
  readonly locked: boolean;
  readonly offer: EarlyAccessOffer | null;
  readonly now: number;
  readonly onStart: () => void;
  readonly onEarly: () => void;
  readonly onClose: () => void;
};

/** 시트 아래 단추들(ADR-0162 R2 · R4 · R6 + 2026-11-19 읽기 전용 프로필). 줄 바깥(여백 · 고정)은 시트가 맡습니다. */
export function SuggestedSheetActions({
  name,
  mode,
  locked,
  offer,
  now,
  onStart,
  onEarly,
  onClose,
}: SuggestedSheetActionsProps): ReactNode {
  const copy = useUiCopy().messengerChat.suggested;
  if (mode === "profile") {
    return (
      <view data-testid={profileIds.close}>
        <Button label={copy.profile.close} variant="text" size="l" width="fill" bindtap={onClose} />
      </view>
    );
  }
  return (
    <>
      {!locked ? (
        <view data-testid={ids.sheetStart}>
          <Button
            label={copy.startChatting}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={onStart}
          />
        </view>
      ) : offer === null ? null : (
        <view
          className="suggested-sheet-early"
          data-testid={ids.sheetEarly}
          flatten={false}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          accessibility-label={earlyLabel(offer, now, copy)}
          bindtap={onEarly}
        >
          <Button
            label={copy.chatNow(offer.price)}
            variant="brand"
            size="xl"
            width="fill"
            icon={coinIcon}
            iconPosition="leading"
          />
          <text className="suggested-sheet-early-note">{copy.launchSpecial(name)}</text>
          <view
            className="suggested-sheet-limited"
            data-testid={ids.sheetLimited}
            accessibility-elements-hidden={true}
          >
            <text className="suggested-tag-text">{limitedText(offer, now, copy)}</text>
          </view>
        </view>
      )}
      <view data-testid={ids.sheetLater}>
        <Button label={copy.notNow} variant="text" size="l" width="fill" bindtap={onClose} />
      </view>
    </>
  );
}
