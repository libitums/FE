import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";

import "./download-sheet.css";

export type AllClearedSheetProps = {
  /** 마지막 확인이 며칠 전인가 — 확인한 적이 없으면 `null`. */
  readonly daysAgo: number | null;
  /** 누르는 순간 오프라인인가 — 탭 처리기에서 읽습니다. */
  readonly isOffline: () => boolean;
  readonly onCheckNow: () => void;
  readonly onLater: () => void;
};

/**
 * 모두 끝낸 뒤 새 편을 확인하게 하는 시트(ADR-0095 D9, 시안 5). 「지금 확인」은 연결돼 있으면 받기를 다시 돌리고,
 * 오프라인이면 닫지 않고 「연결되면 확인해요」만 보입니다 — 연결되면 호스트 신호로 저절로 확인합니다.
 */
export function AllClearedSheet({
  daysAgo,
  isOffline,
  onCheckNow,
  onLater,
}: AllClearedSheetProps): ReactNode {
  const copy = useUiCopy().downloadSheet;
  const text = copy.allCleared;
  const [waiting, setWaiting] = useState(false);
  return (
    <view data-testid="all-cleared-sheet">
      <BottomSheet
        title={text.title}
        description={text.description}
        closeAccessibilityLabel={copy.close}
        actions={[
          {
            id: "check-now",
            label: text.checkNow,
            bindtap: () => (isOffline() ? setWaiting(true) : onCheckNow()),
          },
          { id: "later", label: text.later, bindtap: onLater },
        ]}
        ondismiss={onLater}
      >
        <view className="download-sheet-body">
          <text className="download-sheet-size" data-testid="all-cleared-sheet-status">
            {text.lastChecked(daysAgo)}
          </text>
          {waiting ? (
            <text className="download-sheet-dont-ask-label" data-testid="all-cleared-sheet-hint">
              {text.offlineHint}
            </text>
          ) : null}
          <text className="download-sheet-dont-ask-label" data-testid="all-cleared-sheet-note">
            {text.autoNote}
          </text>
        </view>
      </BottomSheet>
    </view>
  );
}
