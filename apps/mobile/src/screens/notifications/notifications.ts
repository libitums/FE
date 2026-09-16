// 알림 화면의 순수 로직 자리 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// 계약: .agent-harness/work/lib-257/spec.md §2.3(순수 모듈 계약).
//
// LIB-257 (logic): 계약 §2.3이 고정한 동작을 채운다. DOM·컴포넌트·저장소를 만지지
// 않는다(순수 함수뿐). 값을 import하지 않는다 — `import type`은 계약 파일에서만.

import type {
  NotificationItem,
  NotificationItemTappedEvent,
  NotificationDestinationLabel,
  NotificationTargetKind,
} from "./notifications.contract";

// 대상 종류 → 행선지 낱말. export하지 않는다 — 표 자체가 아니라 읽는 함수가 계약이다
// (계약 §2.3 — 종류가 늘면 이 표가 `TS2741`로 선다).
const destinationLabelByKind: Record<NotificationTargetKind, NotificationDestinationLabel> = {
  messenger: "메신저 열기",
  "phone-call": "전화 열기",
  "visual-novel": "비주얼 노벨 열기",
  "roleplay-list": "롤플레이 목록 보기",
};

export function notificationDestinationLabel(
  kind: NotificationTargetKind,
): NotificationDestinationLabel {
  return destinationLabelByKind[kind];
}

export function notificationItemAccessibilityLabel(item: NotificationItem): string {
  return `${item.message}, ${notificationDestinationLabel(item.target.kind)}`;
}

export function notificationTappedEvent(item: NotificationItem): NotificationItemTappedEvent {
  return { name: "notification_item_tapped", notificationId: item.id, target: item.target.kind };
}
