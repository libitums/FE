import type { NotificationItem } from "./notifications.contract";

// 실제 알림 목록의 공급원이 연결되기 전까지는 빈 상태로 시작합니다.
export function notificationItems(): readonly NotificationItem[] {
  return [];
}
