import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { notificationItems } from "../screens/notifications/notification-items";
import { notificationDestinationLabel } from "../screens/notifications/notifications";
import type {
  NotificationEventSink,
  NotificationItem,
  NotificationTarget,
  NotificationTargetKind,
} from "../screens/notifications/notifications.contract";
import type { MessengerEventSink } from "../screens/messenger/messenger.contract";
import type { PhoneCallEventSink } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelEventSink } from "../screens/visual-novel/visual-novel.contract";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// App · navigation · 여정 맵 머리 알림 버튼 · 알림 화면 · 알림 항목 · 대상 분기(기존
// 여정 콜백 재사용 · tabRootActions)의 실제 결선을 봅니다. 목킹하지 않습니다(외부
// IO 없음). sink는 App prop으로 주입합니다 — 순서를 보는 케이스는 공용 로그 배열
// 하나에 여러 sink가 push하게 합니다.
//
// IN14는 가드라 요소가 없으면 그 항목을 건너뛰므로, 결선 전에도 공허하게
// 통과합니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>();
  tokenStore.set(authTokenStorageKey, "existing-token");
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

function openNotificationsScreen() {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});
}

function tapNotificationItem(item: NotificationItem) {
  fireEvent.tap(screen.getByTestId(`notification-list-item-${item.id}`), {});
}

// `NotificationItem`의 `target`은 판별 유니언이지만, `item.target.kind`로만 좁히면
// 그 좁힘이 `item` 변수 자신(그래서 `return item`의 타입)에는 옮지 않습니다 —
// `item.target`이라는 표현식에만 적용됩니다. 그래서 `.find`에 사용자 정의 타입
// 가드를 줘 반환 항목 자체의 타입을 좁힙니다(형 변환(`as`)을 쓰지 않습니다).
type NotificationItemWithTarget<K extends NotificationTargetKind> = NotificationItem & {
  readonly target: Extract<NotificationTarget, { kind: K }>;
};

function notificationItemWithTargetKind<K extends NotificationTargetKind>(
  kind: K,
): NotificationItemWithTarget<K> {
  const item = notificationItems().find(
    (candidate): candidate is NotificationItemWithTarget<K> => candidate.target.kind === kind,
  );
  if (item === undefined) throw new Error(`no notification item for target kind: ${kind}`);
  return item;
}

function messengerNotificationItem() {
  return notificationItemWithTargetKind("messenger");
}

function phoneCallNotificationItem() {
  return notificationItemWithTargetKind("phone-call");
}

function visualNovelNotificationItem() {
  return notificationItemWithTargetKind("visual-novel");
}

function roleplayListNotificationItem() {
  return notificationItemWithTargetKind("roleplay-list");
}

function finishMessengerConversation() {
  fireEvent.tap(screen.getByTestId("messenger-reply-self-accept"), {});
  fireEvent.tap(screen.getByTestId("messenger-reply-self-thanks"), {});
}

// -------------------------------------------------------------------- IN1 · IN2

test("[IN1] 여정 맵 알림 버튼을 tap하면 알림 화면이 서고 탭은 여정 그대로다", () => {
  openNotificationsScreen();

  expect(screen.getByTestId("notifications-screen-title")).toHaveTextContent("알림");
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.queryAllByTestId(/^bottom-navigator-tab-/)).toHaveLength(3);
});

test("[IN2] 알림 화면의 맵으로를 tap하면 여정 맵으로 돌아가고 알림 화면이 사라진다", () => {
  openNotificationsScreen();
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("notifications-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("notifications-screen-title")).not.toBeInTheDocument();
});

// -------------------------------------------------------------------------- IN3

test("[IN3] 알림 목록이 실제 데이터의 순서·수·행선지 문구로 선다(데이터 앵커 — 리터럴 4를 쓰지 않는다)", () => {
  const items = notificationItems();
  openNotificationsScreen();

  const list = screen.getByTestId("notifications-screen-list");
  const itemTestIds = Array.from(list.children).map((el) => el.getAttribute("data-testid"));
  expect(itemTestIds).toEqual(items.map((item) => `notification-list-item-${item.id}`));

  items.forEach((item) => {
    expect(screen.getByTestId(`notification-list-item-destination-${item.id}`)).toHaveTextContent(
      notificationDestinationLabel(item.target.kind),
    );
  });
});

// ------------------------------------------------------------------- IN4~IN7

test("[IN4] 메신저 대상 항목을 tap하면 메신저 화면이 열리고 나가기(맵으로)가 여정 맵에 닿는다", () => {
  openNotificationsScreen();
  tapNotificationItem(messengerNotificationItem());

  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("messenger-screen-exit")).toHaveTextContent("맵으로");

  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("notifications-screen-title")).not.toBeInTheDocument();
});

test("[IN5] 전화 대상 항목을 tap하면 전화 화면이 열리고 나가기(맵으로)가 여정 맵에 닿는다", () => {
  openNotificationsScreen();
  tapNotificationItem(phoneCallNotificationItem());

  expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
  expect(screen.getByTestId("phone-call-exit-button")).toHaveTextContent("맵으로");

  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
});

test("[IN6] 비주얼 노벨 대상 항목을 tap하면 비주얼 노벨 화면이 열리고 나가기(맵으로)가 여정 맵에 닿는다", () => {
  openNotificationsScreen();
  tapNotificationItem(visualNovelNotificationItem());

  expect(screen.getByTestId("visual-novel-screen")).toBeInTheDocument();
  expect(screen.getByTestId("visual-novel-exit-button")).toHaveTextContent("맵으로");

  fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
});

test("[IN7] 알림에서 연 메신저를 끝까지 마치면 여정 모드로 완료가 맵에 기록된다(D-a)", () => {
  const item = messengerNotificationItem();
  openNotificationsScreen();
  tapNotificationItem(item);
  finishMessengerConversation();
  fireEvent.tap(screen.getByTestId("messenger-screen-exit"), {});

  const mapItemTestId = `journey-messenger-item-${item.target.unitId}`;
  expect(screen.getByTestId(mapItemTestId)).toHaveAttribute("data-status", "completed");
  expect(screen.getByTestId(mapItemTestId)).toHaveTextContent(", 완료됨");
});

// ------------------------------------------------------------------- IN8 · IN9

test("[IN8] 롤플레이 대상 항목을 tap하면 롤플레이 탭 루트로 가고, 여정 탭으로 돌아오면 알림 화면이 남아 있다(D-c)", () => {
  openNotificationsScreen();
  tapNotificationItem(roleplayListNotificationItem());

  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
});

test("[IN9] 연습 메신저를 연 채 알림의 롤플레이 대상을 tap하면 롤플레이 스택이 목록 루트로 걷힌다(D-c, 연속 dispatch 둘의 합성)", () => {
  const messengerItem = messengerNotificationItem();
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  fireEvent.tap(screen.getByTestId(`roleplay-list-item-${messengerItem.target.unitId}`), {});
  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});
  tapNotificationItem(roleplayListNotificationItem());

  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();
});

// ----------------------------------------------------------------- IN10~IN13
//
// 여기서부터는 알림 sink를 App prop으로 직접 주입합니다. 이 prop은
// 아직 App의 props 타입에 들어오지 않았습니다 — 지금 App은 `MessengerAppProps &
// VisualNovelAppProps & PhoneCallAppProps`뿐이라 `notificationEventSink`를 받지
// 않습니다. 그래서 아래 네 케이스는 tsc가 그 자리에서 정확히 실패해야 정직합니다
// (`as any`·`@ts-expect-error`로 가리지 않습니다).

test("[IN10] 알림 sink는 버튼 tap마다 1회이고, 탭을 다녀와도 재마운트로는 늘지 않는다(A3)", () => {
  const notificationEventSink = vi.fn<NonNullable<NotificationEventSink>>();
  renderApp(<App notificationEventSink={notificationEventSink} />);
  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});

  expect(notificationEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "notifications_opened" },
  ]);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(notificationEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "notifications_opened" },
  ]);
});

test("[IN11] 메신저 대상 tap의 공용 로그 순서는 알림 탭 이벤트 → 메신저 열림 이벤트다(D-b)", () => {
  const log: unknown[] = [];
  const notificationEventSink: NonNullable<NotificationEventSink> = (event) => log.push(event);
  const messengerEventSink: NonNullable<MessengerEventSink> = (event) => log.push(event);
  const item = messengerNotificationItem();

  renderApp(
    <App notificationEventSink={notificationEventSink} messengerEventSink={messengerEventSink} />,
  );
  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});
  tapNotificationItem(item);

  expect(log).toEqual([
    { name: "notifications_opened" },
    { name: "notification_item_tapped", notificationId: item.id, target: "messenger" },
    {
      name: "messenger_unit_opened",
      unitId: item.target.unitId,
      entrySource: "journey",
      entryStatus: "available",
    },
  ]);
});

test("[IN12] 롤플레이 대상 tap은 탭 이벤트 1건뿐이고 세 특별 유닛 sink는 안 불린다", () => {
  const notificationEventSink = vi.fn<NonNullable<NotificationEventSink>>();
  const messengerEventSink = vi.fn<NonNullable<MessengerEventSink>>();
  const phoneCallEventSink = vi.fn<NonNullable<PhoneCallEventSink>>();
  const visualNovelEventSink = vi.fn<NonNullable<VisualNovelEventSink>>();
  const item = roleplayListNotificationItem();

  renderApp(
    <App
      notificationEventSink={notificationEventSink}
      messengerEventSink={messengerEventSink}
      phoneCallEventSink={phoneCallEventSink}
      visualNovelEventSink={visualNovelEventSink}
    />,
  );
  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});
  tapNotificationItem(item);

  const tappedCalls = notificationEventSink.mock.calls
    .map(([event]) => event)
    .filter((event) => event.name === "notification_item_tapped");
  expect(tappedCalls).toEqual([
    { name: "notification_item_tapped", notificationId: item.id, target: "roleplay-list" },
  ]);
  expect(messengerEventSink).not.toHaveBeenCalled();
  expect(phoneCallEventSink).not.toHaveBeenCalled();
  expect(visualNovelEventSink).not.toHaveBeenCalled();
});

test("[IN13] 비주얼 노벨 대상 tap의 공용 로그 순서는 알림 탭 이벤트 → 비주얼 노벨 열림(여정 변형)이다(D-b)", () => {
  const log: unknown[] = [];
  const notificationEventSink: NonNullable<NotificationEventSink> = (event) => log.push(event);
  const visualNovelEventSink: NonNullable<VisualNovelEventSink> = (event) => log.push(event);
  const item = visualNovelNotificationItem();

  renderApp(
    <App
      notificationEventSink={notificationEventSink}
      visualNovelEventSink={visualNovelEventSink}
    />,
  );
  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});
  tapNotificationItem(item);

  expect(log).toHaveLength(3);
  expect(log[1]).toEqual({
    name: "notification_item_tapped",
    notificationId: item.id,
    target: "visual-novel",
  });
  expect(log[2]).toMatchObject({
    name: "visual_novel_unit_opened",
    unitId: item.target.unitId,
    entrySource: "journey",
  });
  // 여정 변형의 필드 집합과 같습니다 — entryStatus · entryBeatId까지.
  expect(Object.keys(log[2] as object).sort()).toEqual(
    ["name", "unitId", "entrySource", "entryStatus", "entryBeatId"].sort(),
  );
});

// ------------------------------------------------------------------------ IN14

test("[IN14] sink 없이도 버튼·항목 tap이 던지지 않는다(가드)", () => {
  notificationItems().forEach((item) => {
    cleanup();
    expect(() => renderApp(<App />)).not.toThrow();
    expect(() =>
      fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {}),
    ).not.toThrow();

    expect(() => {
      const node = screen.queryByTestId(`notification-list-item-${item.id}`);
      if (node !== null) fireEvent.tap(node, {});
    }).not.toThrow();
  });
});
