import { afterEach, expect, test, vi } from "vitest";

import type {
  AnalyticsConfig,
  AnalyticsRequestInit,
  AnalyticsResponse,
  AnalyticsTransport,
} from "./analytics.contract";
import { createAnalyticsSession } from "./posthog-client";

// `integration` 계층: sink → PostHogCore → `/batch/` 요청까지 실제로 지나며, 이벤트마다 앱 버전 셋
// (`platform` · `appVersion` · `appBuild`)이 실리고 식별이 같은 셋을 사람 속성(`$set`)으로 보내는지
// 봅니다(ADR-0110). background `lynx`와 호스트 모듈만 대역입니다.

const config: AnalyticsConfig = {
  projectKey: "phc_integration_test",
  host: "https://us.i.posthog.com",
  environment: "production",
};

const okResponse: AnalyticsResponse = { status: 200, text: async () => "", json: async () => ({}) };

type Call = { readonly url: string; readonly init: AnalyticsRequestInit };
type BatchEvent = { event: string; distinct_id?: string; properties: Record<string, unknown> };

function fakeTransport() {
  const calls: Call[] = [];
  const transport: AnalyticsTransport = async (url, init) => {
    calls.push({ url, init });
    return okResponse;
  };
  return { calls, transport };
}

const eventsOf = (calls: readonly Call[]): BatchEvent[] =>
  calls.flatMap((call) => (JSON.parse(call.init.body) as { batch: BatchEvent[] }).batch);

const androidTriple = { platform: "android", appVersion: "1.2.0", appBuild: "12" };
// 사람 속성의 appBuild는 숫자다 — 코호트가 빌드 번호를 크기로 비교할 수 있게.
const androidPerson = { platform: "android", appVersion: "1.2.0", appBuild: 12 };
const unknownTriple = { platform: "unknown", appVersion: "unknown", appBuild: "unknown" };

function stubAndroidHost(appVersion: unknown = { platform: "android", name: "1.2.0", build: 12 }) {
  vi.stubGlobal("lynx", { __globalProps: { appVersion } });
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "wifi:unmetered" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("AV-I1. sink 이벤트가 앱 버전 셋을 싣고, 이벤트 필드 · environment · network는 그대로다", async () => {
  stubAndroidHost();
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.sinks.entryEventSink?.({ name: "entry_login_method_selected", method: "google" });
  await vi.waitFor(() => expect(calls).toHaveLength(1));

  const [event] = eventsOf(calls);
  expect(event?.event).toBe("entry_login_method_selected");
  expect(event?.properties).toMatchObject({
    method: "google",
    environment: "production",
    network: "wifi",
    networkCost: "unmetered",
    ...androidTriple,
  });
});

test.each<[string, () => void]>([
  ["lynx 없음", () => vi.stubGlobal("lynx", undefined)],
  ["__globalProps 없음", () => vi.stubGlobal("lynx", {})],
  ["appVersion 없음", () => vi.stubGlobal("lynx", { __globalProps: {} })],
])("AV-I2. %s이면 unknown 셋을 싣고 이벤트는 그대로 나간다", async (_label, arrange) => {
  arrange();
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "wifi:unmetered" } });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.sinks.settingsEventSink?.({ name: "settings_opened" });
  await vi.waitFor(() => expect(calls).toHaveLength(1));

  const events = eventsOf(calls);
  expect(events).toHaveLength(1);
  expect(events[0]?.event).toBe("settings_opened");
  expect(events[0]?.properties).toMatchObject({
    environment: "production",
    network: "wifi",
    ...unknownTriple,
  });
});

test("AV-I3. globalProps getter가 던져도 sink는 던지지 않고 이벤트는 unknown 셋으로 나간다", async () => {
  const lynxStub = {};
  Object.defineProperty(lynxStub, "__globalProps", {
    get() {
      throw new Error("bridge");
    },
  });
  vi.stubGlobal("lynx", lynxStub);
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "wifi:unmetered" } });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  expect(() => session.sinks.settingsEventSink?.({ name: "settings_opened" })).not.toThrow();
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  expect(eventsOf(calls)[0]?.properties).toMatchObject(unknownTriple);
});

test("AV-I4. 이벤트 필드가 자동 속성보다 이긴다 — app_update_required_shown의 platform", async () => {
  stubAndroidHost();
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.sinks.entryEventSink?.({
    name: "app_update_required_shown",
    platform: "ios",
    build: "11",
    minBuild: "13",
  });
  await vi.waitFor(() => expect(calls).toHaveLength(1));

  expect(eventsOf(calls)[0]?.properties).toMatchObject({
    platform: "ios",
    build: "11",
    minBuild: "13",
    appVersion: "1.2.0",
    appBuild: "12",
  });
});

test("AV-I5. 로그아웃(reset) 뒤에도 셋이 실린다", async () => {
  stubAndroidHost();
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.user?.reset("identity");
  session.sinks.settingsEventSink?.({ name: "settings_opened" });
  await vi.waitFor(() => expect(eventsOf(calls).length).toBeGreaterThan(0));

  const opened = eventsOf(calls).find((event) => event.event === "settings_opened");
  expect(opened?.properties).toMatchObject({ environment: "production", ...androidTriple });
});

test("AV-I6. 식별이 앱 버전 셋을 사람 속성($set)으로 보낸다", async () => {
  stubAndroidHost();
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.user?.identify("u-1");
  await vi.waitFor(() => expect(eventsOf(calls).length).toBeGreaterThan(0));

  const identify = eventsOf(calls).filter((event) => event.event === "$identify");
  expect(identify).toHaveLength(1);
  expect(identify[0]?.distinct_id).toBe("u-1");
  expect(identify[0]?.properties.$set).toStrictEqual(androidPerson);
  // AV-I9: SDK가 만드는 $identify 이벤트에도 등록 속성으로 셋이 실린다.
  expect(identify[0]?.properties).toMatchObject(androidTriple);
});

test("AV-I7. 다른 버전으로 다시 식별하면 새 값이 $set으로 간다 — 마지막 값이 이긴다", async () => {
  const appVersion = { platform: "android", name: "1.2.0", build: 12 };
  stubAndroidHost(appVersion);
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.user?.identify("u-1");
  await vi.waitFor(() => expect(eventsOf(calls).length).toBeGreaterThan(0));
  appVersion.name = "1.3.0";
  appVersion.build = 13;
  session.user?.identify("u-1");
  await vi.waitFor(() => expect(eventsOf(calls).length).toBeGreaterThan(1));

  const sets = eventsOf(calls)
    .filter((event) => event.event === "$identify" || event.event === "$set")
    .map((event) => event.properties.$set);
  expect(sets).toStrictEqual([
    androidPerson,
    { platform: "android", appVersion: "1.3.0", appBuild: 13 },
  ]);
});

test("AV-I10. 버전을 모르는 호스트의 식별은 $set을 보내지 않는다 — 실제 값을 unknown으로 덮지 않는다", async () => {
  vi.stubGlobal("lynx", {});
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "wifi:unmetered" } });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.user?.identify("u-1");
  await vi.waitFor(() => expect(eventsOf(calls).length).toBeGreaterThan(0));

  const identify = eventsOf(calls).filter((event) => event.event === "$identify");
  expect(identify).toHaveLength(1);
  expect(identify[0]?.properties.$set).toBeUndefined();
  expect(identify[0]?.properties).toMatchObject(unknownTriple);
});

test("AV-I11. 로그아웃(reset) 뒤의 식별도 등록 속성으로 셋을 싣는다", async () => {
  stubAndroidHost();
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.user?.reset("identity");
  session.user?.identify("u-2");
  await vi.waitFor(() =>
    expect(eventsOf(calls).some((event) => event.event === "$identify")).toBe(true),
  );

  const identify = eventsOf(calls).find((event) => event.event === "$identify");
  expect(identify?.properties).toMatchObject({ environment: "production", ...androidTriple });
});
