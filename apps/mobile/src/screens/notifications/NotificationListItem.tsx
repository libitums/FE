import type { ReactNode } from "@lynx-js/react";
import book from "@libitums/icons/lynx/book";
import message02 from "@libitums/icons/lynx/message-02";
import phone from "@libitums/icons/lynx/phone";
import userGroup from "@libitums/icons/lynx/user-group";
import { color } from "@libitums/design-tokens";

import { notificationDestinationLabel, notificationItemAccessibilityLabel } from "./notifications";
import type { NotificationListItemProps, NotificationTargetKind } from "./notifications.contract";

import "./notification-list-item.css";

// 컴포넌트는 로직을 다시 짓지 않습니다 — 두 문구는 `notifications.ts` 결과를
// 그대로 그립니다.

// export하지 않는 사상 표입니다 — 대상 종류 → 목적지 아이콘입니다. 특별 유닛 셋은
// 여정 맵 항목 · 롤플레이 항목과 같은 아이콘이고, 롤플레이 목록은 롤플레이 탭
// 아이콘과 같습니다 — 목적지가 이미 입고 있는 아이콘을 그대로 쓰고, 새 아이콘을
// 고르지 않습니다.
const notificationItemIconByTargetKind: Record<NotificationTargetKind, string> = {
  messenger: message02,
  "phone-call": phone,
  "visual-novel": book,
  "roleplay-list": userGroup,
};

export function NotificationListItem({ item, onSelect }: NotificationListItemProps): ReactNode {
  return (
    <view
      className="notification-list-item"
      data-testid={`notification-list-item-${item.id}`}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={notificationItemAccessibilityLabel(item)}
      bindtap={() => onSelect(item)}
    >
      <svg
        className="notification-list-item-icon"
        content={notificationItemIconByTargetKind[item.target.kind]}
        current-color={color.fg.brand}
      />
      <view
        className="notification-list-item-text"
        data-testid={`notification-list-item-text-${item.id}`}
      >
        <text
          className="notification-list-item-message"
          data-testid={`notification-list-item-message-${item.id}`}
        >
          {item.message}
        </text>
        <text
          className="notification-list-item-destination"
          data-testid={`notification-list-item-destination-${item.id}`}
        >
          {notificationDestinationLabel(item.target.kind)}
        </text>
      </view>
    </view>
  );
}
