import { journeySeedBefore } from "./test-helpers/journey-seed";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { resetPushWiringForTests } from "./push-wiring";
import { pushOpenedEventName } from "./use-opened-push";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import type { NotificationEvent } from "../screens/notifications/notifications.contract";
import type { SettingsEvent } from "../screens/settings/settings.contract";

// 「호스트 푸시 모듈 대역 → 결선 → 화면 전환 · 기기 등록 요청」을 한 트리에서 봅니다(IP1~IP6, ADR-0034).
// 대역은 경계뿐입니다 — `PushNotificationModule` · `fetch`(Supabase RPC).

const completedIntros = ["tutorial-intro"] as const;
const token = "d4".repeat(32);

type PushHost = {
  permission: string;
  opened: unknown;
  register: ReturnType<typeof vi.fn>;
  openSettings: ReturnType<typeof vi.fn>;
};

function stubPushHost(options: { permission?: string; opened?: unknown } = {}): PushHost {
  const host: PushHost = {
    permission: options.permission ?? "authorized",
    opened: options.opened ?? null,
    register: vi.fn((callback: (payload: unknown) => void) => {
      host.permission = "authorized";
      callback({ permission: "authorized", token, environment: "sandbox" });
    }),
    openSettings: vi.fn(),
  };
  vi.stubGlobal("NativeModules", {
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) =>
        callback({ permission: host.permission }),
      register: host.register,
      takeOpened: (callback: (payload: unknown) => void) => {
        const target = host.opened;
        host.opened = null;
        callback({ target });
      },
      openSettings: host.openSettings,
    },
  });
  return host;
}

function recordFetch(): { url: string; body: string }[] {
  const calls: { url: string; body: string }[] = [];
  vi.stubGlobal("fetch", (url: string, init: { body: string }) => {
    calls.push({ url, body: init.body });
    return Promise.resolve({ status: 204, text: async () => "" });
  });
  return calls;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const cell = (id: string): HTMLElement =>
  within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
const openSettings = (): void =>
  void fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("[IP1] 이미 허용한 설치는 부팅 때 묻지 않고 토큰을 받는다 — 미요청이면 받지 않는다", async () => {
  const allowed = stubPushHost({ permission: "authorized" });
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} />);
  await flush();
  expect(allowed.register).toHaveBeenCalledTimes(1);
  cleanup();
  vi.unstubAllGlobals();

  const undecided = stubPushHost({ permission: "not-determined" });
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} />);
  await flush();
  expect(undecided.register).not.toHaveBeenCalled();
});

test("[IP2] 알림을 눌러 켜진 앱은 여정에 들어선 뒤 그 유닛을 열고 이벤트를 한 번 낸다", async () => {
  stubPushHost({ opened: { kind: "messenger", unitId: "appointment-confirmation" } });
  const events: NotificationEvent[] = [];
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("appointment-confirmation")}
      completedEpisodeIntroIds={completedIntros}
      notificationEventSink={(event) => events.push(event)}
    />,
  );
  await flush();

  expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  expect(events.filter((event) => event.name === "push_notification_opened")).toEqual([
    { name: "push_notification_opened", target: "messenger" },
  ]);
});

test("[IP3] 켜진 채 누르면 호스트 이벤트로 알림 목록이 열린다 — 다른 탭에 있어도", async () => {
  const host = stubPushHost();
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} />);
  await flush();
  openSettings();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  host.opened = { kind: "notifications" };
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(pushOpenedEventName, []);
  });
  await flush();

  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();
});

test("[IP4] 모르는 목적지는 열지 않고 이벤트도 내지 않는다", async () => {
  stubPushHost({ opened: { kind: "url", url: "https://example.com" } });
  const events: NotificationEvent[] = [];
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={completedIntros}
      notificationEventSink={(event) => events.push(event)}
    />,
  );
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(events).toHaveLength(0);
});

test("[IP5] 설정의 Notifications — 이미 물었으면 iOS 설정을 열고 설정 화면에 남는다", async () => {
  const host = stubPushHost({ permission: "denied" });
  const events: SettingsEvent[] = [];
  await renderSignedInApp(
    <App completedEpisodeIntroIds={completedIntros} settingsEventSink={(e) => events.push(e)} />,
  );
  openSettings();
  fireEvent.tap(cell("notifications"), {});
  await flush();

  expect(host.openSettings).toHaveBeenCalledTimes(1);
  expect(host.register).not.toHaveBeenCalled();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(events).toContainEqual({ name: "notification_settings_opened" });
});

test("[IP6] 설정에서 허용해 등록한 기기는 로그아웃 때 해제된다", async () => {
  const host = stubPushHost({ permission: "not-determined" });
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} />);
  const calls = recordFetch();

  openSettings();
  fireEvent.tap(cell("notifications"), {});
  await flush();
  expect(host.register).toHaveBeenCalledTimes(1);
  expect(calls.map((call) => call.url)).toEqual([
    "https://test.supabase.co/rest/v1/rpc/register_push_device",
  ]);

  fireEvent.tap(cell("sign-out"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-sign-out")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();

  const unregister = calls.find((call) => call.url.endsWith("/rpc/unregister_push_device"));
  expect(unregister?.body).toBe(JSON.stringify({ p_token: token }));
});

test("선행 학습을 완료하지 않으면 푸시로 켜져도 잠긴 메신저 대신 맵에 남는다", async () => {
  stubPushHost({ opened: { kind: "messenger", unitId: "appointment-confirmation" } });
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} />);
  await flush();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("messenger-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
    "data-status",
    "default",
  );
});
