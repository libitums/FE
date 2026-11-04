import { afterEach, expect, test, vi } from "vitest";

import type {
  AnalyticsConfig,
  AnalyticsRequestInit,
  AnalyticsResponse,
  AnalyticsTransport,
} from "./analytics.contract";
import { createAnalyticsSession } from "./posthog-client";

// `integration` 계층: sink → PostHogCore → `/batch/` 요청까지 실제로 지나며, 이벤트마다 그때의 연결 종류가
// `network` · `networkCost`로 실리는지 봅니다(ADR-0096 D2). 호스트 모듈만 대역입니다.

const config: AnalyticsConfig = {
  projectKey: "phc_integration_test",
  host: "https://us.i.posthog.com",
  environment: "production",
};

const okResponse: AnalyticsResponse = { status: 200, text: async () => "", json: async () => ({}) };

type Call = { readonly url: string; readonly init: AnalyticsRequestInit };
type BatchEvent = { event: string; properties: Record<string, unknown> };

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

afterEach(() => {
  vi.unstubAllGlobals();
});

test("PN1. sink 이벤트가 그때의 network · networkCost를 싣고, 이벤트 필드 · environment는 그대로다", async () => {
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "cellular:metered" } });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.sinks.entryEventSink?.({ name: "entry_login_method_selected", method: "google" });
  await vi.waitFor(() => expect(calls).toHaveLength(1));

  const [event] = eventsOf(calls);
  expect(event?.event).toBe("entry_login_method_selected");
  expect(event?.properties).toMatchObject({
    method: "google",
    environment: "production",
    network: "cellular",
    networkCost: "metered",
  });
});

test("PN2. 이벤트마다 다시 읽는다 — Wi-Fi에서 난 것과 오프라인에서 난 것이 다르게 실린다", async () => {
  let raw = "wifi:unmetered";
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => raw } });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.sinks.settingsEventSink?.({ name: "settings_opened" });
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  raw = "offline:unknown";
  session.sinks.settingsEventSink?.({ name: "settings_opened" });
  await vi.waitFor(() => expect(eventsOf(calls)).toHaveLength(2));

  expect(eventsOf(calls).map((event) => event.properties.network)).toStrictEqual([
    "wifi",
    "offline",
  ]);
});

test.each([
  ["모듈 없음(옛 호스트)", {}],
  ["NativeModules 없음", undefined],
])("PN3. %s이면 unknown 둘을 싣고 이벤트는 그대로 나간다", async (_label, modules) => {
  vi.stubGlobal("NativeModules", modules);
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.sinks.settingsEventSink?.({ name: "settings_opened" });
  await vi.waitFor(() => expect(calls).toHaveLength(1));

  expect(eventsOf(calls)[0]?.properties).toMatchObject({
    network: "unknown",
    networkCost: "unknown",
  });
});

test("PN4. 모듈이 던져도 sink는 던지지 않고 이벤트는 unknown으로 나간다", async () => {
  vi.stubGlobal("NativeModules", {
    NetworkStatusModule: {
      current: () => {
        throw new Error("bridge");
      },
    },
  });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  expect(() => session.sinks.settingsEventSink?.({ name: "settings_opened" })).not.toThrow();
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  expect(eventsOf(calls)[0]?.properties.network).toBe("unknown");
});

test("PN5. 로그아웃(reset) 뒤에도 실린다", async () => {
  vi.stubGlobal("NativeModules", { NetworkStatusModule: { current: () => "wifi:unmetered" } });
  const { calls, transport } = fakeTransport();
  const session = createAnalyticsSession(config, transport);

  session.user?.reset("identity");
  session.sinks.settingsEventSink?.({ name: "settings_opened" });
  await vi.waitFor(() => expect(eventsOf(calls).length).toBeGreaterThan(0));

  const opened = eventsOf(calls).find((event) => event.event === "settings_opened");
  expect(opened?.properties).toMatchObject({ network: "wifi", environment: "production" });
});
