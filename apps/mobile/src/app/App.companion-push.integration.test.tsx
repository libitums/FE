import { act, cleanup, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { NotificationEvent } from "../screens/notifications/notifications.contract";
import { App } from "./App";
import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import { resetMessengerChatSourceForTests } from "./messenger-chat-wiring";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import {
  isTabSelected,
  present,
  renderTesterApp,
  resetMessengerChatSource,
  tapId,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { pushOpenedEventName } from "./use-opened-push";

// `integration` 계층(CP-I1 ~ I4): 선톡 푸시(companion-chat, ADR-0127) — 호스트 푸시 모듈 대역 → 결선 → 메신저 탭의 그 인물
// 방 · 열 수 없으면 목록 + 안내, 연 이벤트의 variant. 대역은 경계(`PushNotificationModule` · `fetch`)뿐입니다.
// 기본 씨앗: 미나(열림) · 점원(잠김).

let opened: unknown = null;

beforeEach(async () => {
  // 1.5(ADR-0117 D3)부터 미나 방은 해금 전 잠겨 있어, 이미 해금한 설치로 시작합니다.
  await resetMessengerChatSource({ unlocked: ["mina"] });
  opened = null;
  vi.stubGlobal("NativeModules", {
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) => callback({ permission: "authorized" }),
      register: (callback: (payload: unknown) => void) =>
        callback({ permission: "authorized", token: "d4".repeat(32), environment: "sandbox" }),
      takeOpened: (callback: (payload: unknown) => void) => {
        const target = opened;
        opened = null;
        callback({ target });
      },
      openSettings: () => undefined,
    },
  });
  vi.stubGlobal("fetch", (url: string) =>
    Promise.resolve(
      isContentRequest(url) ? contentNotFoundResponse() : { status: 204, text: async () => "" },
    ),
  );
});
afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function flush(): Promise<void> {
  await act(async () => {
    // 가짜 타이머로 부팅한 케이스는 시계를 0만큼 돌려 대기열을 비웁니다.
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
    else await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function tapPush(target: unknown): Promise<void> {
  opened = target;
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(pushOpenedEventName, []);
  });
  await flush();
}

async function boot(events: NotificationEvent[], fakeTimers = false): Promise<void> {
  await renderTesterApp(
    <App progressSeed={legacyPassedSeed} notificationEventSink={(event) => events.push(event)} />,
    fakeTimers ? { keepFakeTimers: true } : undefined,
  );
  await flush();
}

test("CP-I1 켜진 채 선톡 푸시를 누르면 다른 탭에 있어도 메신저 탭의 미나 방이 열리고, 뒤로 = 채팅 목록", async () => {
  const events: NotificationEvent[] = [];
  await boot(events);
  await tapPush({ kind: "companion-chat", characterId: "mina", variant: "b" });

  expect(present("messenger-chat-screen")).toBe(true);
  expect(textOf("messenger-chat-header")).toContain("미나");
  expect(events.filter((event) => event.name === "push_notification_opened")).toEqual([
    { name: "push_notification_opened", target: "companion-chat", variant: "b" },
  ]);

  tapRound("messenger-chat-back");
  expect(present("messenger-list-screen")).toBe(true);
  expect(isTabSelected("messenger")).toBe(true);
});

test("CP-I2 잠긴 인물이면 메신저 목록 + 안내, 방에 다녀와도 안내는 다시 뜨지 않는다", async () => {
  const events: NotificationEvent[] = [];
  await boot(events, true);
  await tapPush({ kind: "companion-chat", characterId: "clerk" });

  expect(present("messenger-list-screen")).toBe(true);
  expect(present("messenger-chat-screen")).toBe(false);
  expect(textOf("chat-list-notice")).toBe("This chat isn't available right now.");
  expect(events.filter((event) => event.name === "push_notification_opened")).toEqual([
    { name: "push_notification_opened", target: "companion-chat" },
  ]);

  tapId("messenger-list-row-mina");
  tapRound("messenger-chat-back");
  expect(present("messenger-list-screen")).toBe(true);
  expect(present("chat-list-notice")).toBe(false);
});

test("CP-I3 안내는 3초 뒤 사라진다", async () => {
  await boot([], true);
  await tapPush({ kind: "companion-chat", characterId: "nobody" });
  expect(present("chat-list-notice")).toBe(true);
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(present("chat-list-notice")).toBe(false);
});

test("CP-I4 인물 id 형식이 틀리면 열지 않고 이벤트도 내지 않는다", async () => {
  const events: NotificationEvent[] = [];
  await boot(events);
  await tapPush({ kind: "companion-chat", characterId: "../settings" });

  expect(present("journey-map-screen")).toBe(true);
  expect(events.filter((event) => event.name === "push_notification_opened")).toEqual([]);
});

test("CP-I5 앱을 켜기 전에 누른 선톡 푸시는 로그인 구간이 끝난 뒤 그 방을 연다(콜드 스타트)", async () => {
  opened = { kind: "companion-chat", characterId: "mina" };
  const events: NotificationEvent[] = [];
  await boot(events);

  expect(present("messenger-chat-screen")).toBe(true);
  expect(textOf("messenger-chat-header")).toContain("미나");
  expect(events.filter((event) => event.name === "push_notification_opened")).toHaveLength(1);
});

test("CP-I6 연령 제한 방이면 열지 않고 목록 + 안내", async () => {
  resetMessengerChatSourceForTests({
    ...chatFixtureSeed,
    birthYear: { kind: "set", year: 2014 },
    rooms: chatFixtureSeed.rooms.map((room) =>
      room.counterpart.id === "mina" ? { ...room, inputBlock: { kind: "age-restricted" } } : room,
    ),
  });
  await boot([]);
  await tapPush({ kind: "companion-chat", characterId: "mina" });

  expect(present("messenger-chat-screen")).toBe(false);
  expect(textOf("chat-list-notice")).toBe("This chat isn't available right now.");
});

test("CP-I7 시험 계정이 아닌 회원이 선톡 알림을 누르면 방이 아니라 메신저 탭의 「곧 열림」에 선다(ADR-0128 리뷰 W1)", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  await flush();
  await tapPush({ kind: "companion-chat", characterId: "mina" });

  expect(present("messenger-chat-screen")).toBe(false);
  expect(present("chat-list-notice")).toBe(false);
  expect(screen.getByTestId("messenger-access-gate").getAttribute("data-access")).toBe(
    "coming-soon",
  );
});
