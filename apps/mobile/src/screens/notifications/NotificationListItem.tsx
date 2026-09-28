import { useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { TouchEvent } from "@lynx-js/types";
import book from "@libitums/icons/lynx/no-padding/book";
import message02 from "@libitums/icons/lynx/no-padding/message-02";
import phone from "@libitums/icons/lynx/no-padding/phone";
import userGroup from "@libitums/icons/lynx/no-padding/user-group";
import { color } from "@libitums/design-tokens";

import {
  notificationDestinationLabel,
  notificationItemAccessibilityLabel,
  swipeIntent,
} from "./notifications";
import type {
  NotificationListItemProps,
  NotificationTargetKind,
  SwipePoint,
} from "./notifications.contract";

import "./notification-list-item.css";

// 컴포넌트는 로직을 다시 짓지 않습니다 — 두 문구는 `notifications.ts` 결과를
// 그대로 그립니다.

// export하지 않는 사상 표입니다 — 대상 종류 → 목적지 아이콘입니다. 특별 유닛 셋은
// 여정 맵 항목 · 롤플레이 항목과 같은 아이콘이고, 롤플레이 목록은 롤플레이 탭
// 아이콘과 같습니다 — 목적지가 이미 입고 있는 아이콘을 그대로 쓰고, 새 아이콘을
// 고르지 않습니다. 여백 없는 판(`no-padding`)을 씁니다 — 디자인의 아이콘이 자리(32)를
// 꽉 채웁니다. 디자인(Figma 64-1793)의 불꽃은 연속 학습 알림의 아이콘이고, 그
// 종류의 알림은 아직 없습니다.
const notificationItemIconByTargetKind: Record<NotificationTargetKind, string> = {
  messenger: message02,
  "phone-call": phone,
  "visual-novel": book,
  "roleplay-list": userGroup,
};

// 타입은 `touches`를 반드시 준다고 적지만 **런타임의 부재를 TS가 막아 주지
// 않습니다**(`DrawingSurface`와 같은 자리). 없으면 조용히 버립니다.
function swipePoint(event: TouchEvent): SwipePoint | undefined {
  const [touch] = event.touches ?? [];
  return touch === undefined ? undefined : { x: touch.pageX, y: touch.pageY };
}

/**
 * 알림 한 줄입니다(Figma 64-1793 · 79-6024). 카드를 왼쪽으로 밀면 오른쪽에 삭제 자리가
 * 열리고 카드는 그만큼 좁아집니다. 길게 눌러도 열립니다 — 밀기는 스크린리더로 할 수
 * 없는 동작이라, 같은 자리에 닿는 다른 길을 둡니다.
 */
export function NotificationListItem({
  item,
  deleteRevealed,
  onSelect,
  onRevealDelete,
  onHideDelete,
  onDelete,
}: NotificationListItemProps): ReactNode {
  const swipeStart = useRef<SwipePoint | undefined>(undefined);
  // 밀기가 끝난 손가락이 떨어지며 탭까지 내는 것을 막습니다 — 삭제 자리를 열려던
  // 손가락이 알림을 열어 버립니다.
  const swiped = useRef(false);

  const handleTouchStart = (event: TouchEvent) => {
    "background only";
    // oxlint-disable-next-line react/immutability
    swipeStart.current = swipePoint(event);
    // oxlint-disable-next-line react/immutability
    swiped.current = false;
  };

  const handleTouchMove = (event: TouchEvent) => {
    "background only";
    const current = swipePoint(event);
    if (swipeStart.current === undefined || current === undefined || swiped.current) {
      return;
    }
    const intent = swipeIntent(swipeStart.current, current);
    if (intent === null) {
      return;
    }
    // oxlint-disable-next-line react/immutability
    swiped.current = true;
    if (intent === "reveal") {
      onRevealDelete(item.id);
    } else {
      onHideDelete();
    }
  };

  const handleTap = () => {
    "background only";
    if (swiped.current) {
      // oxlint-disable-next-line react/immutability
      swiped.current = false;
      return;
    }
    // 삭제 자리가 열린 채의 탭은 닫기입니다 — 열어 둔 채 알림으로 넘어가면 돌아왔을 때
    // 삭제 자리가 그대로 남습니다.
    if (deleteRevealed) {
      onHideDelete();
      return;
    }
    onSelect(item);
  };

  const handleLongPress = () => {
    "background only";
    // oxlint-disable-next-line react/immutability
    swiped.current = true;
    onRevealDelete(item.id);
  };

  return (
    <view
      className="notification-list-item-row"
      data-testid={`notification-list-item-row-${item.id}`}
    >
      <view
        className="notification-list-item"
        data-testid={`notification-list-item-${item.id}`}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={notificationItemAccessibilityLabel(item)}
        bindtap={handleTap}
        bindlongpress={handleLongPress}
        bindtouchstart={handleTouchStart}
        bindtouchmove={handleTouchMove}
      >
        <svg
          className="notification-list-item-icon"
          content={notificationItemIconByTargetKind[item.target.kind]}
          current-color={color.brand.primary}
        />
        <view
          className="notification-list-item-text"
          data-testid={`notification-list-item-text-${item.id}`}
        >
          <text
            className="notification-list-item-message"
            data-testid={`notification-list-item-message-${item.id}`}
            text-maxline="2"
          >
            {item.message}
          </text>
          <text
            className="notification-list-item-destination"
            data-testid={`notification-list-item-destination-${item.id}`}
            text-maxline="2"
          >
            {notificationDestinationLabel(item.target.kind)}
          </text>
        </view>
      </view>
      {deleteRevealed ? (
        <view
          className="notification-list-item-delete"
          data-testid={`notification-list-item-delete-${item.id}`}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={`${item.message}, 삭제`}
          bindtap={() => onDelete(item)}
        >
          <text className="notification-list-item-delete-label">삭제</text>
        </view>
      ) : null}
    </view>
  );
}
