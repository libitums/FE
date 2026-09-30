import { notificationItems } from "../screens/notifications/notification-items";
import type { NotificationItem } from "../screens/notifications/notifications.contract";

// 실제 알림 공급원이 연결되기 전에는 비어 있는 초기 목록입니다.
export const notificationList: readonly NotificationItem[] = notificationItems();
