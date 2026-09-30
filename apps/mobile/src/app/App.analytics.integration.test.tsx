import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import type {
  AnalyticsConfig,
  AnalyticsRequestInit,
  AnalyticsTransport,
} from "../lib/analytics.contract";
import { analyticsConfigFrom } from "../lib/analytics-config";
import { authSessionStorageKey } from "../lib/auth-session";
import { notificationItems } from "../screens/notifications/notification-items";
import { analyticsQueueStorageKey, createAnalyticsSession } from "../lib/posthog-client";

// 알림 동작 검증에만 목업을 주입합니다. 제품의 기본 알림 목록은 비어 있습니다.
vi.mock(
  "../screens/notifications/notification-items",
  () => import("./test-helpers/notification-items"),
);

// 「App의 한 사용자 흐름 → sink → 매핑 → SDK 큐 → 어댑터 → transport 본문」을 한 트리에서
// 봅니다. 대역은 경계 둘뿐입니다 — 가짜 transport(전송)와 `NativeModules.StorageModule`
// (기록하는 저장소). SDK · 어댑터 · 매핑은 진짜입니다.
//
// 제품 진입점(`index.tsx`)은 `root.render`를 부르는 부수효과 모듈이라 여기서 import하지
// 않습니다. 테스트는 진입점이 하는 조립(`createAnalyticsSession(config, transport)`의
// `sinks`를 App에 펼침)을 그대로 따라 합니다 — 그래서 진입점이 sink를 넘기는 결선 자체는
// 이 파일이 잡지 못합니다(`pnpm build` · e2e A1의 몫).

const completedIntros = ["tutorial-intro"] as const;
const batchUrl = "https://us.i.posthog.com/batch/";

function requireConfig(config: AnalyticsConfig | null): AnalyticsConfig {
  if (config === null) throw new Error("test config must be valid");
  return config;
}

const testConfig: AnalyticsConfig = requireConfig(
  analyticsConfigFrom("phc_integration_test", "development"),
);

type Call = { url: string; init: AnalyticsRequestInit };
type SentEvent = { event: string; distinct_id: string; properties: Record<string, unknown> };

type Behavior = "ok" | "reject" | "status-503";

function fakeTransport(behavior: Behavior = "ok"): {
  transport: AnalyticsTransport;
  calls: Call[];
} {
  const calls: Call[] = [];
  const transport: AnalyticsTransport = async (url, init) => {
    calls.push({ url, init });
    if (behavior === "reject") throw new Error("network down");
    return {
      status: behavior === "status-503" ? 503 : 200,
      text: async () => "",
      json: async () => ({}),
    };
  };
  return { transport, calls };
}

function sentEvents(calls: readonly Call[]): SentEvent[] {
  return calls.flatMap((call) => {
    const body: unknown = JSON.parse(call.init.body);
    if (typeof body !== "object" || body === null || !("batch" in body)) return [];
    return (body as { batch: SentEvent[] }).batch;
  });
}

let storageSets: string[] = [];
let unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => void unhandled.push(reason);

beforeEach(() => {
  storageSets = [];
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// 로그인된 설치로 부팅합니다(공용 `renderSignedInApp` — 세션 저장 + 갱신 응답 대역).
// 부팅이 끝난 뒤 `StorageModule.set`을 감싸 불린 키를 기록합니다 — 부팅 중 세션 갱신이 쓰는
// 키는 IA5의 관심 밖입니다.
async function renderApp(ui: Parameters<typeof render>[0]) {
  const result = await renderSignedInApp(ui);
  const storage = (
    globalThis as unknown as {
      NativeModules: { StorageModule: { set(k: string, v: string): void } };
    }
  ).NativeModules.StorageModule;
  const set = storage.set.bind(storage);
  storage.set = (key: string, value: string) => {
    storageSets.push(key);
    set(key, value);
  };
  return result;
}

function openSettingsTab(): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
}

function settingsCell(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
}

function sessionApp(
  transport: AnalyticsTransport | null,
  config: AnalyticsConfig | null = testConfig,
) {
  const session = createAnalyticsSession(config, transport);
  return <App {...session.sinks} completedEpisodeIntroIds={completedIntros} />;
}

// 설정 탭 → 프로필 열기입니다. 이벤트 둘이 나가야 합니다.
function openProfile(): void {
  openSettingsTab();
  fireEvent.tap(settingsCell("profile"), {});
}

// ------------------------------------------------------------------------- IA1

test("[IA1] 설정 탭 → 프로필 열기이 요청 본문의 이벤트 둘(settings_opened → profile_opened)로 도착한다", async () => {
  const { transport, calls } = fakeTransport();
  await renderApp(sessionApp(transport));

  openProfile();

  await vi.waitFor(() => expect(sentEvents(calls)).toHaveLength(2));
  const events = sentEvents(calls);
  expect(events.map((e) => e.event)).toEqual(["settings_opened", "profile_opened"]);
  expect(events[1]?.properties).not.toHaveProperty("email");
  for (const call of calls) expect(call.url).toBe(batchUrl);
  expect(new Set(events.map((e) => e.distinct_id)).size).toBe(1);
});

// ------------------------------------------------------------------------- IA2

test("[IA2] 알림 버튼 → 첫 알림 항목 tap이 notifications_opened → notification_item_tapped로 도착한다", async () => {
  const item = notificationItems()[0];
  if (item === undefined) throw new Error("no notification item");
  const { transport, calls } = fakeTransport();
  await renderApp(sessionApp(transport));

  fireEvent.tap(screen.getByTestId("top-bar-notifications"), {});
  fireEvent.tap(screen.getByTestId(`notification-list-item-${item.id}`), {});

  // 항목 tap은 대상 화면(스페셜 유닛 열림 등)의 이벤트를 뒤따라 냅니다 — 앞의 둘만 봅니다.
  await vi.waitFor(() => expect(sentEvents(calls).length).toBeGreaterThanOrEqual(2));
  const events = sentEvents(calls);
  expect(events.slice(0, 2).map((e) => e.event)).toEqual([
    "notifications_opened",
    "notification_item_tapped",
  ]);
  expect(events[1]?.properties).toMatchObject({
    notificationId: item.id,
    target: item.target.kind,
  });
});

// ------------------------------------------------------------------------- IA3

test("[IA3] 키가 없으면(config null) transport가 한 번도 불리지 않고 프로필은 정상적으로 열린다", async () => {
  const { transport, calls } = fakeTransport();
  await renderApp(sessionApp(transport, null));

  openProfile();

  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  // 요청이 나간다면 비동기로 나가므로 한 번 흘려 보낸 뒤에도 0건인지 봅니다.
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls).toHaveLength(0);
});

// ------------------------------------------------------------------------- IA4

test.each<Behavior>(["reject", "status-503"])(
  "[IA4] 전송이 실패해도(%s) 화면 동작이 바뀌지 않고 오류 화면 · unhandled rejection이 없다",
  async (behavior) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { transport, calls } = fakeTransport(behavior);
    await renderApp(sessionApp(transport));

    vi.useFakeTimers();
    openProfile();
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(calls.length).toBeGreaterThan(0);
    expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
    expect(screen.queryByTestId("error-boundary-title")).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(unhandled).toEqual([]);
  },
);

// ------------------------------------------------------------------------- IA5

test("[IA5] 분석은 익명 ID를 따로 저장하지 않는다 — 쓰는 키는 인증 세션 · 분석 대기열뿐이다", async () => {
  const { transport, calls } = fakeTransport();
  await renderApp(sessionApp(transport));

  openProfile();
  await vi.waitFor(() => expect(sentEvents(calls)).toHaveLength(2));

  expect(
    storageSets.filter((key) => key !== authSessionStorageKey && key !== analyticsQueueStorageKey),
  ).toEqual([]);
});

// ------------------------------------------------------------------------- IA6

test("[IA6] 앱을 다시 띄우면(새 세션) distinct_id가 달라진다", async () => {
  const first = fakeTransport();
  const view = await renderApp(sessionApp(first.transport));
  openSettingsTab();
  await vi.waitFor(() => expect(sentEvents(first.calls)).toHaveLength(1));
  view.unmount();

  const second = fakeTransport();
  await renderApp(sessionApp(second.transport));
  openSettingsTab();
  await vi.waitFor(() => expect(sentEvents(second.calls)).toHaveLength(1));

  const firstId = sentEvents(first.calls)[0]?.distinct_id;
  const secondId = sentEvents(second.calls)[0]?.distinct_id;
  expect(typeof firstId).toBe("string");
  expect(typeof secondId).toBe("string");
  expect(firstId).not.toBe(secondId);
});

// ------------------------------------------------------------------------- IA-EI

test("[IA-EI] 서사 표지를 열고 건너뛰면 표지 이벤트 둘이 environment와 함께 도착한다", async () => {
  const { transport, calls } = fakeTransport();
  const session = createAnalyticsSession(testConfig, transport);
  await renderApp(<App {...session.sinks} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-tutorial-intro"), {});
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-skip")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-skip")).getByTestId("ui-lynx-button"),
    {},
  );

  await vi.waitFor(() => expect(sentEvents(calls)).toHaveLength(2));
  const events = sentEvents(calls);
  expect(events.map((event) => event.event)).toEqual([
    "episode_intro_viewed",
    "episode_intro_skipped",
  ]);
  expect(events[0]!.properties).toMatchObject({
    episodeId: "tutorial",
    environment: "development",
  });
});

// ------------------------------------------------------------------------- IA-ID

function accessTokenFor(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId })}.signature`;
}

test("[IA-ID1] 로그인된 설치는 부팅 뒤 이벤트가 그 사용자의 distinct_id로 도착한다", async () => {
  const { transport, calls } = fakeTransport();
  const session = createAnalyticsSession(testConfig, transport);
  await renderSignedInApp(
    <App
      {...session.sinks}
      analyticsUser={session.user}
      completedEpisodeIntroIds={completedIntros}
    />,
    { refreshedAccessToken: accessTokenFor("user-1") },
  );

  openSettingsTab();

  await vi.waitFor(() =>
    expect(sentEvents(calls).map((event) => event.event)).toContain("settings_opened"),
  );
  const events = sentEvents(calls);
  expect(events.map((event) => event.event)).toEqual(["$identify", "settings_opened"]);
  expect(events.map((event) => event.distinct_id)).toEqual(["user-1", "user-1"]);
  expect(events[1]!.properties).toMatchObject({
    $process_person_profile: true,
    environment: "development",
  });
});

test("[IA-ID2] 같은 사용자는 앱을 다시 켜도 같은 distinct_id다", async () => {
  const first = fakeTransport();
  const firstSession = createAnalyticsSession(testConfig, first.transport);
  const view = await renderSignedInApp(
    <App
      {...firstSession.sinks}
      analyticsUser={firstSession.user}
      completedEpisodeIntroIds={completedIntros}
    />,
    { refreshedAccessToken: accessTokenFor("user-1") },
  );
  openSettingsTab();
  await vi.waitFor(() => expect(sentEvents(first.calls).length).toBeGreaterThanOrEqual(2));
  view.unmount();

  const second = fakeTransport();
  const secondSession = createAnalyticsSession(testConfig, second.transport);
  await renderSignedInApp(
    <App
      {...secondSession.sinks}
      analyticsUser={secondSession.user}
      completedEpisodeIntroIds={completedIntros}
    />,
    { refreshedAccessToken: accessTokenFor("user-1") },
  );
  openSettingsTab();
  await vi.waitFor(() => expect(sentEvents(second.calls).length).toBeGreaterThanOrEqual(2));

  const distinctIds = [...sentEvents(first.calls), ...sentEvents(second.calls)]
    .filter((event) => event.event === "settings_opened")
    .map((event) => event.distinct_id);
  expect(distinctIds).toEqual(["user-1", "user-1"]);
});
