import type { ReactNode } from "@lynx-js/react";

import type { NotificationsScreenProps } from "./notifications.contract";
import { NotificationListItem } from "./NotificationListItem";

import "./notifications-screen.css";

/**
 * 메신저 레시피를 따릅니다 — 나가기 첫 흐름 자식 + 제목 `margin-top: spacing-12`
 * (ADR-0023 안 B). 화면은 목록을 계산 · 정렬 · 거르지 않습니다. `items`가 비어도
 * 목록 상자는 섭니다(항목 0개).
 */
export function NotificationsScreen({
  items,
  onSelectItem,
  onExit,
}: NotificationsScreenProps): ReactNode {
  return (
    <view className="notifications-screen">
      <view className="notifications-screen-header">
        <view
          className="notifications-screen-exit"
          data-testid="notifications-screen-exit"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="맵으로"
          bindtap={onExit}
        >
          <text className="notifications-screen-exit-label">맵으로</text>
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
        <view className="notifications-screen-list" data-testid="notifications-screen-list">
          {items.map((item) => (
            <NotificationListItem key={item.id} item={item} onSelect={onSelectItem} />
          ))}
        </view>
      </scroll-view>
    </view>
  );
}
