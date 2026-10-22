import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { notificationItems } from "../screens/notifications/notification-items";
import { notificationDestinationLabel } from "../screens/notifications/notifications";
import type {
  NotificationEvent,
  NotificationEventSink,
  NotificationItem,
} from "../screens/notifications/notifications.contract";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { uiCopyEn } from "../lib/ui-copy-en";

// 알림 동작 검증에만 목업을 주입합니다. 제품의 기본 알림 목록은 비어 있습니다.
vi.mock(
  "../screens/notifications/notification-items",
  () => import("./test-helpers/notification-items"),
);

// App · navigation · 여정 맵 머리 알림 버튼 · 알림 화면 · 알림 항목 · 대상 분기(기존
// 여정 콜백 재사용 · tabRootActions)의 실제 결선을 봅니다. 알림 입력만 테스트 픽스처입니다.
// sink는 App prop으로 주입합니다 — 순서를 보는 케이스는 공용 로그 배열
// 하나에 여러 sink가 push하게 합니다.
//
// IN14는 가드라 요소가 없으면 그 항목을 건너뛰므로, 결선 전에도 공허하게
// 통과합니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openNotificationsScreen() {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
}

function tapNotificationItem(item: NotificationItem) {
  fireEvent.tap(screen.getByTestId(`notification-list-item-${item.id}`), {});
}

/** 목록의 n번째 알림입니다(없으면 던집니다). */
function notificationItemAt(index: number): NotificationItem {
  const item = notificationItems()[index];
  if (item === undefined) throw new Error(`no notification item at ${String(index)}`);
  return item;
}

const roleplayListNotificationItem = (): NotificationItem => notificationItemAt(3);
const firstNotificationItem = (): NotificationItem => notificationItemAt(0);
const secondNotificationItem = (): NotificationItem => notificationItemAt(1);

// -------------------------------------------------------------------- IN1 · IN2

// 2026-09-27 개정(ADR-0007): 바텀 네비게이션은 **탭 루트에서만** 섭니다. 알림은 여정
// 탭 위에 쌓인 화면이라 바가 없습니다 — 「탭이 여정 그대로다」는 나간 뒤에 봅니다.
test("[IN1] 여정 맵 알림 버튼을 tap하면 알림 화면이 서고 바가 사라진다", async () => {
  await openNotificationsScreen();

  expect(screen.getByTestId("notifications-screen-title")).toHaveTextContent("Notifications");
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  // 나가기는 라운드 버튼을 감싼 상자입니다(#123) — 탭 대상은 그 안쪽입니다.
  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);
});

test("[IN2] 알림 화면의 맵으로를 tap하면 여정 맵으로 돌아가고 알림 화면이 사라진다", async () => {
  await openNotificationsScreen();
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();

  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("notifications-screen-title")).not.toBeInTheDocument();
});

// -------------------------------------------------------------------------- IN3

test("[IN3] 알림 목록이 실제 데이터의 순서·수·행선지 문구로 선다(데이터 앵커 — 리터럴 4를 쓰지 않는다)", async () => {
  const items = notificationItems();
  await openNotificationsScreen();

  const list = screen.getByTestId("notifications-screen-list");
  const itemTestIds = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(itemTestIds).toEqual(items.map((item) => `notification-list-item-row-${item.id}`));

  items.forEach((item) => {
    expect(screen.getByTestId(`notification-list-item-destination-${item.id}`)).toHaveTextContent(
      notificationDestinationLabel(item.target.kind, uiCopyEn),
    );
  });
});

// ------------------------------------------------------------------- IN8 · IN9

test("[IN8] 롤플레이 대상 항목을 tap하면 롤플레이 탭 루트로 가고, 여정 탭으로 돌아오면 알림 화면이 남아 있다(D-c)", async () => {
  await openNotificationsScreen();
  tapNotificationItem(roleplayListNotificationItem());

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
});

// ----------------------------------------------------------------- IN10~IN13
//
// 여기서부터는 알림 sink를 App prop으로 직접 주입합니다. 이 prop은
// 아직 App의 props 타입에 들어오지 않았습니다 — 지금 App은 `MessengerAppProps &
// VisualNovelAppProps & PhoneCallAppProps`뿐이라 `notificationEventSink`를 받지
// 않습니다. 그래서 아래 네 케이스는 tsc가 그 자리에서 정확히 실패해야 정직합니다
// (`as any`·`@ts-expect-error`로 가리지 않습니다).

test("[IN10] 알림 sink는 버튼 tap마다 1회이고, 탭을 다녀와도 재마운트로는 늘지 않는다(A3)", async () => {
  const notificationEventSink = vi.fn<NonNullable<NotificationEventSink>>();
  await renderSignedInApp(
    <App progressSeed={legacyPassedSeed} notificationEventSink={notificationEventSink} />,
  );
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  expect(notificationEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "notifications_opened" },
  ]);

  // 알림은 쌓인 화면이라 탭이 없습니다 — 나간 뒤에 탭을 오갑니다. 보는 것은 그대로:
  // **재마운트로는 sink가 늘지 않는다**입니다.
  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(notificationEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "notifications_opened" },
  ]);
});

test("[IN12] 롤플레이 대상 tap은 탭 이벤트 1건뿐이다", async () => {
  const notificationEventSink = vi.fn<NonNullable<NotificationEventSink>>();
  const item = roleplayListNotificationItem();

  await renderSignedInApp(
    <App progressSeed={legacyPassedSeed} notificationEventSink={notificationEventSink} />,
  );
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  tapNotificationItem(item);

  const tappedCalls = notificationEventSink.mock.calls
    .map(([event]) => event)
    .filter((event) => event.name === "notification_item_tapped");
  expect(tappedCalls).toEqual([
    { name: "notification_item_tapped", notificationId: item.id, target: "roleplay-list" },
  ]);
});

// ------------------------------------------------------------------------ IN14

test("[IN14] sink 없이도 버튼·항목 tap이 던지지 않는다(가드)", async () => {
  for (const item of notificationItems()) {
    cleanup();
    await expect(renderSignedInApp(<App progressSeed={legacyPassedSeed} />)).resolves.toBeDefined();
    expect(() => fireEvent.tap(screen.getByTestId("top-bar-notifications"), {})).not.toThrow();

    expect(() => {
      const node = screen.queryByTestId(`notification-list-item-${item.id}`);
      if (node !== null) fireEvent.tap(node, {});
    }).not.toThrow();
  }
});

// ------------------------------------------------------------------ IN14 · IN15 · IN16

function revealDelete(item: NotificationItem) {
  const card = screen.getByTestId(`notification-list-item-${item.id}`);
  fireEvent.touchstart(card, { touches: [{ pageX: 300, pageY: 200 }] });
  fireEvent.touchmove(card, { touches: [{ pageX: 240, pageY: 204 }] });
}

function deleteNotificationItem(item: NotificationItem) {
  revealDelete(item);
  fireEvent.tap(screen.getByTestId(`notification-list-item-delete-${item.id}`), {});
}

test("[IN14] 알림을 지우면 그 항목만 사라지고 알림 화면에 남는다", async () => {
  await openNotificationsScreen();
  const item = firstNotificationItem();

  deleteNotificationItem(item);

  expect(screen.queryByTestId(`notification-list-item-${item.id}`)).not.toBeInTheDocument();
  expect(
    screen.getByTestId(`notification-list-item-${secondNotificationItem().id}`),
  ).toBeInTheDocument();
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
});

test("[IN15] 지운 알림은 화면을 나갔다 돌아와도 돌아오지 않는다", async () => {
  await openNotificationsScreen();
  const item = firstNotificationItem();
  deleteNotificationItem(item);

  fireEvent.tap(
    within(screen.getByTestId("notifications-screen-exit")).getByTestId("ui-lynx-round-button"),
    {},
  );
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});

  expect(screen.queryByTestId(`notification-list-item-${item.id}`)).not.toBeInTheDocument();
});

test("[IN16] 알림을 모두 지우면 빈 상태가 선다", async () => {
  await openNotificationsScreen();

  for (const item of notificationItems()) {
    deleteNotificationItem(item);
  }

  expect(screen.getByTestId("notifications-screen-empty")).toBeInTheDocument();
  expect(screen.queryByTestId("notifications-screen-list")).not.toBeInTheDocument();
});

test("[IN17] 삭제는 공용 로그에 삭제 이벤트 하나를 남기고 화면을 옮기지 않는다", async () => {
  const events: NotificationEvent[] = [];
  await renderSignedInApp(
    <App progressSeed={legacyPassedSeed} notificationEventSink={(event) => events.push(event)} />,
  );
  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  const item = firstNotificationItem();

  deleteNotificationItem(item);

  expect(events).toEqual([
    { name: "notifications_opened" },
    { name: "notification_item_deleted", notificationId: item.id, target: "roleplay-list" },
  ]);
});
