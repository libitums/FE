import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import prohibited02 from "@libitums/icons/lynx/prohibited-02";
import { color } from "@libitums/design-tokens";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import type { NotificationId, NotificationsScreenProps } from "./notifications.contract";
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
  // 삭제 자리는 한 번에 하나만 열립니다 — 다른 항목을 밀면 앞의 것이 닫힙니다.
  const [revealedId, setRevealedId] = useState<NotificationId | null>(null);

  return (
    <view className="notifications-screen">
      {/* 머리 — 나가기가 첫 자식입니다(낭독 순서 `맵으로 → 알림 → 항목들`). 제목은
          나가기 옆이 아니라 줄 가운데에 섭니다. */}
      <view className="notifications-screen-header">
        <view className="notifications-screen-exit" data-testid="notifications-screen-exit">
          <RoundButton
            accessibilityLabel="맵으로"
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
          알림
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
                아직 알림이 없어요
              </text>
              <text
                className="notifications-screen-empty-description"
                data-testid="notifications-screen-empty-description"
              >
                새 소식이 오면 여기에서 알려 드릴게요.
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
                onSelect={onSelectItem}
                onRevealDelete={setRevealedId}
                onHideDelete={() => setRevealedId(null)}
                onDelete={onDeleteItem}
              />
            ))}
          </view>
        )}
      </scroll-view>
    </view>
  );
}
