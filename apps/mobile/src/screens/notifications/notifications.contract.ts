// LIB-257 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification 재고정이 필요하다.
//
// 세 특별 유닛 계약에서 가져오는 것은 `import type`이고 그 타입의 소유자가 그 화면이다
// (docs/conventions/code.md 「import」가 허용하는 형태).
//
// **읽음·배지 필드가 없다.** `NotificationItem`의 필드는 셋뿐이라 읽음 표식을 그릴 입력이 타입에
// 존재하지 않는다 — 수용 기준 3의 「0건」을 타입이 먼저 진다.
//
// **`NotificationId`는 `string`이다.** 임시 값이 진짜로 바뀌어도 형태가 한 글자도 안 바뀌게 한다
// (「임시 입력값의 이음매」).

import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";

export type NotificationId = string;

export type MessengerNotificationTarget = {
  readonly kind: "messenger";
  readonly unitId: MessengerUnitId;
};

export type PhoneCallNotificationTarget = {
  readonly kind: "phone-call";
  readonly unitId: PhoneCallUnitId;
};

export type VisualNovelNotificationTarget = {
  readonly kind: "visual-novel";
  readonly unitId: VisualNovelUnitId;
};

export type RoleplayListNotificationTarget = {
  readonly kind: "roleplay-list";
};

export type NotificationTarget =
  | MessengerNotificationTarget
  | PhoneCallNotificationTarget
  | VisualNovelNotificationTarget
  | RoleplayListNotificationTarget;

export type NotificationTargetKind = NotificationTarget["kind"];

export type NotificationDestinationLabel =
  | "메신저 열기"
  | "전화 열기"
  | "비주얼 노벨 열기"
  | "롤플레이 목록 보기";

export type NotificationItem = {
  readonly id: NotificationId;
  readonly message: string;
  readonly target: NotificationTarget;
};

export type NotificationsScreenProps = {
  readonly items: readonly NotificationItem[];
  readonly onSelectItem: (item: NotificationItem) => void;
  readonly onExit: () => void;
};

export type NotificationListItemProps = {
  readonly item: NotificationItem;
  readonly onSelect: (item: NotificationItem) => void;
};

export type NotificationsOpenedEvent = {
  readonly name: "notifications_opened";
};

export type NotificationItemTappedEvent = {
  readonly name: "notification_item_tapped";
  readonly notificationId: NotificationId;
  readonly target: NotificationTargetKind;
};

export type NotificationEvent = NotificationsOpenedEvent | NotificationItemTappedEvent;

export type NotificationEventSink = ((event: NotificationEvent) => void) | null;

export type NotificationAppProps = {
  readonly notificationEventSink?: NotificationEventSink;
};

export type NotificationsTestId =
  | "notifications-screen-exit"
  | "notifications-screen-title"
  | "notifications-screen-scroll"
  | "notifications-screen-list"
  | `notification-list-item-${NotificationId}`
  | `notification-list-item-text-${NotificationId}`
  | `notification-list-item-message-${NotificationId}`
  | `notification-list-item-destination-${NotificationId}`;
