// 알림 이동·삭제 테스트에서만 주입하는 입력입니다. 제품 번들은 import하지 않습니다.
import type { NotificationItem } from "../../screens/notifications/notifications.contract";

const items: readonly NotificationItem[] = [
  {
    id: "notification-messenger",
    message: "Minseo sent you an appointment message",
    target: { kind: "messenger", unitId: "appointment-confirmation" },
  },
  {
    id: "notification-phone-call",
    message: "Minseo is calling about your appointment",
    target: { kind: "phone-call", unitId: "appointment-confirmation-phone-call" },
  },
  {
    id: "notification-visual-novel",
    message: "Minseo has arrived at the café",
    target: { kind: "visual-novel", unitId: "cafe-arrival-visual-novel" },
  },
  {
    id: "notification-roleplay-list",
    message: "Practice what you learned in a roleplay",
    target: { kind: "roleplay-list" },
  },
];

export function notificationItems(): readonly NotificationItem[] {
  return items;
}
