// 알림 화면의 순수 로직 자리입니다(ADR-0006 D4 — 순수 로직은 unit 계층 대상).
// DOM·컴포넌트·저장소를 만지지 않습니다(순수 함수뿐). 값을 import하지 않습니다 —
// `import type`은 계약 파일에서만입니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  NotificationId,
  NotificationItem,
  NotificationItemDeletedEvent,
  NotificationItemTappedEvent,
  SwipeIntent,
  SwipePoint,
  NotificationTargetKind,
} from "./notifications.contract";

// 대상 종류 → 행선지 낱말입니다. 표는 문구표(`copy.notifications.destination`)에 있고
// 읽는 함수가 계약입니다(종류가 늘면 문구표 타입이 `TS2741`로 섭니다).
export function notificationDestinationLabel(kind: NotificationTargetKind, copy: UiCopy): string {
  return copy.notifications.destination[kind];
}

export function notificationItemAccessibilityLabel(item: NotificationItem, copy: UiCopy): string {
  return `${item.message}, ${notificationDestinationLabel(item.target.kind, copy)}`;
}

export function notificationTappedEvent(item: NotificationItem): NotificationItemTappedEvent {
  return { name: "notification_item_tapped", notificationId: item.id, target: item.target.kind };
}

export function notificationDeletedEvent(item: NotificationItem): NotificationItemDeletedEvent {
  return { name: "notification_item_deleted", notificationId: item.id, target: item.target.kind };
}

/** 없는 id면 같은 참조를 돌려줍니다 — 바뀐 것이 없으면 다시 그릴 이유도 없습니다. */
export function withoutNotification(
  items: readonly NotificationItem[],
  id: NotificationId,
): readonly NotificationItem[] {
  return items.some((item) => item.id === id) ? items.filter((item) => item.id !== id) : items;
}

/** 이만큼은 가로로 밀어야 밀기로 칩니다. 이보다 짧으면 탭하다 흔들린 손가락입니다. */
const swipeDistance = 32;

/**
 * 손가락이 움직인 자리에서 뜻을 읽습니다. 왼쪽으로 밀면 삭제 자리를 열고, 오른쪽으로
 * 밀면 닫습니다. 세로로 더 많이 움직였으면 목록을 스크롤하는 중이므로 아무 뜻도 읽지
 * 않습니다.
 */
export function swipeIntent(start: SwipePoint, current: SwipePoint): SwipeIntent | null {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  if (Math.abs(dx) < swipeDistance || Math.abs(dx) <= Math.abs(dy)) {
    return null;
  }
  return dx < 0 ? "reveal" : "hide";
}
