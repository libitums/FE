import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  AnalyticsConfig,
  AnalyticsRequestInit,
  AnalyticsResponse,
  AnalyticsTransport,
} from "./analytics.contract";
import { noAnalyticsEventSinks } from "./analytics-events";
import {
  analyticsLibraryId,
  analyticsQueueRetryDelaysMs,
  analyticsQueueStorageKey,
  createAnalyticsSession,
  LynxPostHogClient,
  postHogClientOptions,
  postHogCoreVersion,
  productAnalyticsSession,
  resolveAnalyticsTransport,
} from "./posthog-client";

const config: AnalyticsConfig = {
  projectKey: "phc_unit_test",
  host: "https://us.i.posthog.com",
  environment: "development",
};
const batchUrl = "https://us.i.posthog.com/batch/";

const okResponse: AnalyticsResponse = {
  status: 200,
  text: async () => "",
  json: async () => ({}),
};

type Call = { readonly url: string; readonly init: AnalyticsRequestInit };

function fakeTransport(response: AnalyticsResponse = okResponse) {
  const calls: Call[] = [];
  const transport: AnalyticsTransport = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return { calls, transport };
}

// `NativeModules.StorageModule` 대역 — 키 · 값을 Map에 두고 set · remove 호출을 기록합니다.
function fakeStorage(initial: Readonly<Record<string, string>> = {}) {
  const values = new Map<string, string>(Object.entries(initial));
  const sets: [string, string][] = [];
  const removes: string[] = [];
  const module = {
    get: (key: string) => values.get(key) ?? null,
    set: (key: string, value: string) => {
      sets.push([key, value]);
      values.set(key, value);
    },
    remove: (key: string) => {
      removes.push(key);
      values.delete(key);
    },
  };
  return { module, values, sets, removes };
}

function networkDownThen(response: AnalyticsResponse = okResponse) {
  const calls: Call[] = [];
  let online = false;
  const transport: AnalyticsTransport = async (url, init) => {
    calls.push({ url, init });
    if (!online) {
      throw new Error("network down");
    }
    return response;
  };
  return {
    calls,
    transport,
    goOnline: () => {
      online = true;
    },
  };
}

type BatchEvent = {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
};
type Body = { api_key: string; batch: BatchEvent[] };

const bodyOf = (call: Call): Body => JSON.parse(call.init.body) as Body;
const batchEventsOf = (calls: readonly Call[]): BatchEvent[] =>
  calls.flatMap((call) => bodyOf(call).batch);

const clients: LynxPostHogClient[] = [];
function makeClient(transport: AnalyticsTransport): LynxPostHogClient {
  const client = new LynxPostHogClient(config, transport);
  clients.push(client);
  return client;
}

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const client of clients.splice(0)) {
    try {
      await client.shutdown(100);
    } catch {
      // 정리 실패는 단언 대상이 아닙니다.
    }
  }
});

describe("상수 · 옵션", () => {
  test("PC1: postHogCoreVersion은 package.json의 @posthog/core 버전과 같다", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(postHogCoreVersion).toBe(packageJson.dependencies["@posthog/core"]);
  });

  test("PC1: 라이브러리 ID는 libitums-lynx이다", () => {
    expect(analyticsLibraryId).toBe("libitums-lynx");
  });

  test("PC2: 옵션 14키가 spec §3 표와 같다", () => {
    expect(postHogClientOptions).toStrictEqual({
      host: "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 10000,
      fetchRetryCount: 3,
      fetchRetryDelay: 3000,
      requestTimeout: 10000,
      preloadFeatureFlags: false,
      disableRemoteFeatureFlags: true,
      sendFeatureFlagEvent: false,
      disableSurveys: true,
      disableCompression: true,
      disableGeoip: true,
      personProfiles: "identified_only",
      defaultOptIn: true,
      maxQueueSize: 200,
    });
  });
});

describe("LynxPostHogClient 전송", () => {
  test("PC3: capture 한 건이 /batch/ POST 한 요청이 된다", async () => {
    const { calls, transport } = fakeTransport();
    const client = makeClient(transport);

    client.capture("settings_opened", { note: "kept" });
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe(batchUrl);
    expect(call.init.method).toBe("POST");
    expect(call.init.headers["Content-Type"]).toBe("application/json");
    expect(typeof call.init.body).toBe("string");

    const body = bodyOf(call);
    expect(body.api_key).toBe("phc_unit_test");
    expect(body.batch).toHaveLength(1);
    const [event] = body.batch;
    expect(event!.event).toBe("settings_opened");
    expect(event!.properties).toMatchObject({
      note: "kept",
      $lib: "libitums-lynx",
      $lib_version: "1.55.2",
      $geoip_disable: true,
      $process_person_profile: false,
    });
    expect(typeof event!.distinct_id).toBe("string");
  });

  test("PC3: 요청은 설정의 host로 나간다", async () => {
    const { calls, transport } = fakeTransport();
    const otherHost = "https://collector.test" as AnalyticsConfig["host"];
    const client = new LynxPostHogClient({ ...config, host: otherHost }, transport);
    clients.push(client);

    client.capture("settings_opened", {});
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    expect(calls[0]!.url).toBe("https://collector.test/batch/");
  });

  test("PC4: 같은 클라이언트는 distinct_id가 같고 다른 인스턴스는 다르다", async () => {
    const first = fakeTransport();
    const second = fakeTransport();
    const a = makeClient(first.transport);
    const b = makeClient(second.transport);

    a.capture("settings_opened", {});
    a.capture("profile_opened", {});
    b.capture("settings_opened", {});
    await vi.waitFor(() => expect(batchEventsOf(first.calls)).toHaveLength(2));
    await vi.waitFor(() => expect(batchEventsOf(second.calls)).toHaveLength(1));

    const idsA = new Set(batchEventsOf(first.calls).map((e) => e.distinct_id));
    const idsB = new Set(batchEventsOf(second.calls).map((e) => e.distinct_id));
    expect(idsA.size).toBe(1);
    expect(idsB.size).toBe(1);
    expect([...idsA][0]).not.toBe([...idsB][0]);
  });

  test("PC5: identify 뒤에도 /batch/ 밖 요청은 0건이다", async () => {
    const { calls, transport } = fakeTransport();
    const client = makeClient(transport);

    client.identify("user-1");
    client.capture("settings_opened", {});
    await client.flush();
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));

    for (const call of calls) {
      expect(call.url.endsWith("/batch/")).toBe(true);
      expect(call.url).not.toMatch(/\/flags|\/decide|\/api\/surveys/);
    }
  });

  test("PC6: 익명 ID · 세션은 메모리에만 두고, 저장소에는 대기열 키 하나만 쓴다", async () => {
    const storage = fakeStorage();
    vi.stubGlobal("NativeModules", { StorageModule: storage.module });
    const { calls, transport } = fakeTransport();
    const client = makeClient(transport);

    client.setPersistedProperty("k", "v");
    expect(client.getPersistedProperty("k")).toBe("v");
    client.setPersistedProperty("k", null);
    expect(client.getPersistedProperty("k")).toBeUndefined();

    client.capture("settings_opened", {});
    client.identify("user-1");
    await client.flush();
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));

    const touched = new Set([...storage.sets.map(([key]) => key), ...storage.removes]);
    expect([...touched]).toStrictEqual([analyticsQueueStorageKey]);
  });

  test("PC7: 문자열이 아닌 본문은 거부된 Promise이고 동기로 던지지 않는다", async () => {
    const { calls, transport } = fakeTransport();
    const client = makeClient(transport);

    let pending: Promise<unknown> | undefined;
    expect(() => {
      pending = client.fetch(batchUrl, {
        method: "POST",
        headers: {},
        body: new Uint8Array(),
      } as never);
    }).not.toThrow();
    await expect(pending).rejects.toBeDefined();
    expect(calls).toHaveLength(0);

    // 문자열 본문은 그대로 transport에 닿는다(거부가 스텁의 공허한 거부가 아님을 가른다).
    await client.fetch(batchUrl, { method: "POST", headers: {}, body: "{}" });
    expect(calls).toHaveLength(1);
  });

  test("PC7: transport가 동기로 던지면 거부된 Promise다", async () => {
    const attempts = vi.fn<() => void>();
    const throwing = (() => {
      attempts();
      throw new Error("sync boom");
    }) as unknown as AnalyticsTransport;
    const client = makeClient(throwing);

    let pending: Promise<unknown> | undefined;
    expect(() => {
      pending = client.fetch(batchUrl, { method: "POST", headers: {}, body: "{}" });
    }).not.toThrow();
    await expect(pending).rejects.toBeDefined();
    expect(attempts).toHaveBeenCalledTimes(1);
  });

  test("PC7: transport에는 method · headers · body만 넘기고 signal은 넘기지 않는다", async () => {
    const { calls, transport } = fakeTransport({
      status: 202,
      text: async () => "t",
      json: async () => ({ ok: true }),
    });
    const client = makeClient(transport);

    const response = await client.fetch(batchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: new AbortController().signal,
    } as never);

    expect(calls).toHaveLength(1);
    expect(Object.keys(calls[0]!.init).sort()).toStrictEqual(["body", "headers", "method"]);
    expect(calls[0]!.init).not.toHaveProperty("signal");
    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("t");
    await expect(response.json()).resolves.toStrictEqual({ ok: true });
  });

  test("PC7: 라이브러리 ID · 버전 · User-Agent가 계약과 같다", () => {
    const client = makeClient(fakeTransport().transport);
    expect(client.getLibraryId()).toBe("libitums-lynx");
    expect(client.getLibraryVersion()).toBe("1.55.2");
    expect(client.getCustomUserAgent()).toBeUndefined();
  });
});

describe("환경 표시", () => {
  test("PC20: 모든 이벤트에 설정의 environment가 붙는다", async () => {
    const { calls, transport } = fakeTransport();
    const client = new LynxPostHogClient({ ...config, environment: "production" }, transport);
    clients.push(client);

    client.capture("settings_opened", {});
    client.capture("profile_opened", {});
    await vi.waitFor(() => expect(batchEventsOf(calls)).toHaveLength(2));

    expect(batchEventsOf(calls).map((event) => event.properties.environment)).toStrictEqual([
      "production",
      "production",
    ]);
  });

  test("PC20: 설정이 development면 development가 붙는다", async () => {
    const { calls, transport } = fakeTransport();
    const client = makeClient(transport);

    client.capture("settings_opened", {});
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    expect(batchEventsOf(calls)[0]!.properties.environment).toBe("development");
  });
});

describe("전송 실패", () => {
  const failures: readonly [label: string, make: () => AnalyticsTransport][] = [
    [
      "네트워크 거부",
      () => async () => {
        throw new Error("network down");
      },
    ],
    ["HTTP 500", () => async () => ({ ...okResponse, status: 500 })],
  ];

  test.each(failures)(
    "PC8: %s — capture가 던지지 않고 unhandled rejection이 없다",
    async (_label, make) => {
      const unhandled: unknown[] = [];
      const record = (reason: unknown) => void unhandled.push(reason);
      process.on("unhandledRejection", record);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const attempts = vi.fn<() => void>();
      const inner = make();
      const transport: AnalyticsTransport = (url, init) => {
        attempts();
        return inner(url, init);
      };
      vi.useFakeTimers();
      try {
        const client = makeClient(transport);
        expect(() => client.capture("settings_opened", {})).not.toThrow();
        await vi.runAllTimersAsync();
        await vi.runAllTimersAsync();
        vi.useRealTimers();
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(attempts).toHaveBeenCalled();
        expect(unhandled).toStrictEqual([]);
      } finally {
        process.off("unhandledRejection", record);
        consoleError.mockRestore();
      }
    },
  );
});

describe("createAnalyticsSession", () => {
  test("PC9: config가 null이면 없음 세션이고 transport를 부르지 않는다", () => {
    const { calls, transport } = fakeTransport();
    const session = createAnalyticsSession(null, transport);
    expect(session.sinks).toStrictEqual(noAnalyticsEventSinks);
    expect(session.identify).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test("PC9: transport가 null이면 없음 세션이다", () => {
    const session = createAnalyticsSession(config, null);
    expect(session.sinks).toStrictEqual(noAnalyticsEventSinks);
    expect(session.identify).toBeNull();
  });

  test("PC10: 여섯 sink가 함수이고 sink 호출이 요청 한 건이 된다", async () => {
    const { calls, transport } = fakeTransport();
    const session = createAnalyticsSession(config, transport);
    const sinks = Object.values(session.sinks);
    expect(sinks).toHaveLength(6);
    for (const sink of sinks) {
      expect(sink).toBeTypeOf("function");
    }

    session.sinks.settingsEventSink?.({ name: "settings_opened" });
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(batchEventsOf(calls).map((e) => e.event)).toStrictEqual(["settings_opened"]);

    expect(session.identify).toBeTypeOf("function");
    expect(() => session.identify?.("user-1")).not.toThrow();
  });
});

describe("resolveAnalyticsTransport", () => {
  const init: AnalyticsRequestInit = { method: "POST", headers: {}, body: "{}" };

  test("PC11: 전역 fetch가 있으면 그것을 부른다", async () => {
    const globalFetch = vi.fn<(url: string, init: unknown) => Promise<AnalyticsResponse>>(
      async () => okResponse,
    );
    vi.stubGlobal("fetch", globalFetch);
    const transport = resolveAnalyticsTransport();
    expect(transport).not.toBeNull();
    await transport!(batchUrl, init);
    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(globalFetch).toHaveBeenCalledWith(batchUrl, expect.objectContaining({ body: "{}" }));
  });

  test("PC11: 전역 fetch는 globalThis에 묶어 부른다", async () => {
    let receiver: unknown;
    const globalFetch = vi.fn<(this: unknown) => Promise<AnalyticsResponse>>(
      async function (this: unknown) {
        receiver = this;
        return okResponse;
      },
    );
    vi.stubGlobal("fetch", globalFetch);
    const transport = resolveAnalyticsTransport();
    await transport!(batchUrl, init);
    expect(receiver).toBe(globalThis);
  });

  test("PC11: 전역 fetch가 없으면 lynx.fetch를 lynx에 묶어 부른다", async () => {
    let receiver: unknown;
    const lynxFake = {
      fetch: vi.fn<(this: unknown) => Promise<AnalyticsResponse>>(async function (this: unknown) {
        receiver = this;
        return okResponse;
      }),
    };
    vi.stubGlobal("fetch", undefined);
    vi.stubGlobal("lynx", lynxFake);
    const transport = resolveAnalyticsTransport();
    expect(transport).not.toBeNull();
    await transport!(batchUrl, init);
    expect(lynxFake.fetch).toHaveBeenCalledTimes(1);
    expect(receiver).toBe(lynxFake);
  });

  test("PC11: 둘 다 없으면 null이다", () => {
    vi.stubGlobal("fetch", undefined);
    vi.stubGlobal("lynx", undefined);
    expect(resolveAnalyticsTransport()).toBeNull();
  });

  // 기기의 background 런타임에는 `globalThis.lynx`가 없고 맨 `lynx`만 있다(ADR-0029 D10).
  // vitest에서는 둘이 같은 객체라 위 동작 케이스로는 가를 수 없어 원문을 잽니다.
  test("PC13: lynx를 globalThis가 아니라 맨 식별자로 읽는다", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/posthog-client.ts"), "utf8")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    expect(source).not.toMatch(/globalThis[^;]*\blynx\b/);
    expect(source).toContain('typeof lynx !== "undefined"');
  });
});

describe("productAnalyticsSession", () => {
  test("PC12: 키가 비면 없음 세션이고 요청이 없다", () => {
    const globalFetch = vi.fn<(url: string, init: unknown) => Promise<AnalyticsResponse>>(
      async () => okResponse,
    );
    vi.stubGlobal("fetch", globalFetch);
    vi.stubEnv("PUBLIC_POSTHOG_KEY", "");
    const session = productAnalyticsSession();
    expect(session.identify).toBeNull();
    expect(session.sinks).toStrictEqual(noAnalyticsEventSinks);
    expect(globalFetch).not.toHaveBeenCalled();
  });

  test("PC12: 합성 키가 있으면 sink가 함수이고 이벤트가 전송된다", async () => {
    const globalFetch = vi.fn<(url: string, init: unknown) => Promise<AnalyticsResponse>>(
      async () => okResponse,
    );
    vi.stubGlobal("fetch", globalFetch);
    vi.stubEnv("PUBLIC_POSTHOG_KEY", "phc_unit_test");
    const session = productAnalyticsSession();
    expect(session.sinks.settingsEventSink).toBeTypeOf("function");
    session.sinks.settingsEventSink?.({ name: "settings_opened" });
    await vi.waitFor(() => expect(globalFetch).toHaveBeenCalledTimes(1));
    expect(globalFetch.mock.calls[0]![0]).toBe(batchUrl);
  });
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("대기열 · 재시도 · 보존", () => {
  const sentAfter = (calls: readonly Call[], from: number) =>
    calls.slice(from).flatMap((call) => {
      try {
        return bodyOf(call).batch.map((event) => event.event);
      } catch {
        return [];
      }
    });

  test("PC14: 네트워크 오류면 이벤트가 대기열에 남고, 다음 이벤트 때 함께 나간다", async () => {
    vi.useFakeTimers();
    const net = networkDownThen();
    const client = makeClient(net.transport);

    client.capture("settings_opened", {});
    await vi.advanceTimersByTimeAsync(10_000);
    expect(net.calls.length).toBeGreaterThan(0);
    const failedAttempts = net.calls.length;

    net.goOnline();
    client.capture("terms_opened", {});
    await vi.advanceTimersByTimeAsync(1_000);

    expect(sentAfter(net.calls, failedAttempts)).toStrictEqual(["settings_opened", "terms_opened"]);
  });

  test("PC15: 네트워크 오류 뒤 새 이벤트가 없어도 정해진 간격 뒤 스스로 다시 보낸다", async () => {
    vi.useFakeTimers();
    const net = networkDownThen();
    const client = makeClient(net.transport);

    client.capture("settings_opened", {});
    // SDK 자체 재시도(첫 시도 + fetchRetryCount회)가 모두 끝난 시점부터 잰다.
    const sdkAttempts = 1 + postHogClientOptions.fetchRetryCount;
    for (let i = 0; i < 60 && net.calls.length < sdkAttempts; i += 1) {
      await vi.advanceTimersByTimeAsync(500);
    }
    await vi.advanceTimersByTimeAsync(0);
    const failedAttempts = net.calls.length;
    expect(failedAttempts).toBe(sdkAttempts);
    net.goOnline();

    await vi.advanceTimersByTimeAsync(analyticsQueueRetryDelaysMs[0]! - 1_000);
    expect(net.calls.length).toBe(failedAttempts);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(sentAfter(net.calls, failedAttempts)).toStrictEqual(["settings_opened"]);
  });

  test("PC16: 스스로 다시 보내기는 간격 표의 횟수만큼만 하고 멈춘다", async () => {
    vi.useFakeTimers();
    const net = networkDownThen();
    const client = makeClient(net.transport);

    client.capture("settings_opened", {});
    await vi.advanceTimersByTimeAsync(10_000);
    const afterFirst = net.calls.length;
    const total = analyticsQueueRetryDelaysMs.reduce((sum, ms) => sum + ms, 0);
    await vi.advanceTimersByTimeAsync(total + 60_000);
    const afterRetries = net.calls.length;
    expect(afterRetries).toBeGreaterThan(afterFirst);

    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(net.calls.length).toBe(afterRetries);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("PC17: 대기열은 저장소에 적히고, 보내고 나면 지워진다", async () => {
    vi.useFakeTimers();
    const storage = fakeStorage();
    vi.stubGlobal("NativeModules", { StorageModule: storage.module });
    const net = networkDownThen();
    const client = makeClient(net.transport);

    client.capture("settings_opened", {});
    await vi.advanceTimersByTimeAsync(10_000);
    const saved = storage.values.get(analyticsQueueStorageKey);
    expect(saved).toBeTypeOf("string");
    expect(JSON.parse(saved!)).toMatchObject([{ message: { event: "settings_opened" } }]);

    net.goOnline();
    client.capture("terms_opened", {});
    await vi.advanceTimersByTimeAsync(1_000);
    expect(storage.values.has(analyticsQueueStorageKey)).toBe(false);
  });

  test("PC18: 저장소에 남은 대기열은 새 실행이 시작하자마자 보낸다", async () => {
    const leftover = JSON.stringify([
      {
        message: {
          type: "capture",
          event: "settings_opened",
          distinct_id: "previous-run",
          properties: { $lib: "libitums-lynx" },
          timestamp: "2026-09-29T00:00:00.000Z",
          uuid: "01a0eacf-0000-7000-8000-000000000000",
        },
      },
    ]);
    const storage = fakeStorage({ [analyticsQueueStorageKey]: leftover });
    vi.stubGlobal("NativeModules", { StorageModule: storage.module });
    const { calls, transport } = fakeTransport();

    makeClient(transport);

    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(batchEventsOf(calls).map((event) => [event.event, event.distinct_id])).toStrictEqual([
      ["settings_opened", "previous-run"],
    ]);
    await vi.waitFor(() => expect(storage.values.has(analyticsQueueStorageKey)).toBe(false));
  });

  test("PC18: 저장된 값이 깨져 있으면 버리고 던지지 않는다", () => {
    const storage = fakeStorage({ [analyticsQueueStorageKey]: "{not json" });
    vi.stubGlobal("NativeModules", { StorageModule: storage.module });
    const { transport } = fakeTransport();

    expect(() => makeClient(transport)).not.toThrow();
    expect(storage.values.has(analyticsQueueStorageKey)).toBe(false);
  });

  // 기기 관찰(2026-09-29): Lynx `fetch`는 연결 실패를 거부하지 않고 status 499 응답으로 돌려준다.
  test.each([499, 0])(
    "PC19: 전송이 status %i로 끝나면 네트워크 실패로 보고 대기열에 남긴다",
    async (status) => {
      vi.useFakeTimers();
      const storage = fakeStorage();
      vi.stubGlobal("NativeModules", { StorageModule: storage.module });
      const calls: Call[] = [];
      const transport: AnalyticsTransport = async (url, init) => {
        calls.push({ url, init });
        return { ...okResponse, status };
      };
      const client = makeClient(transport);

      client.capture("settings_opened", {});
      await vi.advanceTimersByTimeAsync(10_000);

      expect(calls).toHaveLength(1 + postHogClientOptions.fetchRetryCount);
      const saved = storage.values.get(analyticsQueueStorageKey);
      expect(saved).toBeTypeOf("string");
      expect(JSON.parse(saved!)).toMatchObject([{ message: { event: "settings_opened" } }]);
    },
  );
});
