import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import prohibited02 from "@libitums/icons/lynx/prohibited-02";
import { color } from "@libitums/design-tokens";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import type {
  NotificationId,
  NotificationItem,
  NotificationsScreenProps,
} from "./notifications.contract";
import { NotificationListItem } from "./NotificationListItem";

import "./notifications-screen.css";

/**
 * 알림 화면입니다(Figma 64-1745 빈 상태 · 64-1793 목록 · 79-6024 삭제 자리). 화면은
 * 목록을 계산 · 정렬 · 거르지 않습니다 — 지우는 것도 위(`App`)가 하고, 여기서는 어느
 * 항목의 삭제 자리가 열려 있는지만 집니다.
 */
export function NotificationsScreen({
  items,
  onSelectItem,
  onDeleteItem,
  onExit,
}: NotificationsScreenProps): ReactNode {
  const copy = useUiCopy();
  // 삭제 자리는 한 번에 하나만 열립니다 — 다른 항목을 밀면 앞의 것이 닫힙니다.
  const [revealedId, setRevealedId] = useState<NotificationId | null>(null);

  // 삭제 자리가 어디든 열려 있으면 카드 탭은 그것을 닫는 데 쓰입니다 — 열어 둔 채 다른
  // 카드를 스친 손가락이 알림을 열어 버리지 않습니다.
  const handleSelect = (item: NotificationItem) => {
    "background only";
    if (revealedId !== null) {
      setRevealedId(null);
      return;
    }
    onSelectItem(item);
  };

  // 지운 항목의 id를 들고 있지 않습니다 — 같은 id의 알림이 다시 오면 삭제 자리가 열린
  // 채로 섭니다.
  const handleDelete = (item: NotificationItem) => {
    "background only";
    setRevealedId(null);
    onDeleteItem(item);
  };

  return (
    <view className="notifications-screen">
      {/* 머리 — 나가기가 첫 자식입니다(낭독 순서 `나가기 → 알림 → 항목들`). 제목은
          나가기 옆이 아니라 줄 가운데에 섭니다. */}
      <view className="notifications-screen-header">
        <view className="notifications-screen-exit" data-testid="notifications-screen-exit">
          <RoundButton
            accessibilityLabel={copy.common.exitTo.journey}
            icon={arrowLeft03}
            variant="neutral"
            size="xl"
            bindtap={onExit}
          />
        </view>
        <text
          className="notifications-screen-title"
          data-testid="notifications-screen-title"
          accessibility-traits="header"
        >
          {copy.notifications.title}
        </text>
      </view>
      <scroll-view
        className="notifications-screen-scroll"
        data-testid="notifications-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {items.length === 0 ? (
          <view className="notifications-screen-empty" data-testid="notifications-screen-empty">
            <view className="notifications-screen-empty-mark" accessibility-elements-hidden={true}>
              <svg
                className="notifications-screen-empty-icon"
                content={prohibited02}
                current-color={color.brand.secondary}
              />
            </view>
            <view className="notifications-screen-empty-text">
              <text
                className="notifications-screen-empty-title"
                data-testid="notifications-screen-empty-title"
              >
                {copy.notifications.emptyTitle}
              </text>
              <text
                className="notifications-screen-empty-description"
                data-testid="notifications-screen-empty-description"
              >
                {copy.notifications.emptyBody}
              </text>
            </view>
          </view>
        ) : (
          <view className="notifications-screen-list" data-testid="notifications-screen-list">
            {items.map((item) => (
              <NotificationListItem
                key={item.id}
                item={item}
                deleteRevealed={revealedId === item.id}
                onSelect={handleSelect}
                onRevealDelete={setRevealedId}
                onHideDelete={() => setRevealedId(null)}
                onDelete={handleDelete}
              />
            ))}
          </view>
        )}
      </scroll-view>
    </view>
  );
}
