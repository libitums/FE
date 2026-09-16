import type { ReactNode } from "@lynx-js/react";

import type { NotificationsScreenProps } from "./notifications.contract";
import { NotificationListItem } from "./NotificationListItem";

import "./notifications-screen.css";

// LIB-257 (ui-implementation): 계약(.agent-harness/work/lib-257/spec.md §2.6)의
// 구조·testid·접근성을 채운다 + design.md §3의 값(메신저 레시피 — 나가기 첫 흐름
// 자식 + 제목 `margin-top: spacing-12`, ADR-0023 안 B). 화면은 목록을 계산 · 정렬 ·
// 거르지 않는다. `items`가 비어도 목록 상자는 선다(항목 0개, 계약 §2.6).
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
