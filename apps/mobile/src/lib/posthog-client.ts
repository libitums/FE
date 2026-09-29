import "background-only";

// PostHog 어댑터 — background 스레드 전용(SDK 값 import는 PostHogCore 하나뿐). 계약: spec §3.
import { PostHogCore } from "@posthog/core";
import type { PostHogFetchOptions, PostHogFetchResponse } from "@posthog/core";

import type {
  AnalyticsConfig,
  AnalyticsTransport,
  CreateAnalyticsSession,
  PostHogClientOptions,
  ProductAnalyticsSession,
  ResolveAnalyticsTransport,
} from "./analytics.contract";
import { analyticsConfig } from "./analytics-config";
import { analyticsEventSinksFrom, noAnalyticsSession } from "./analytics-events";

export const postHogCoreVersion = "1.55.2" as const;

export const analyticsLibraryId = "libitums-lynx" as const;

export const postHogClientOptions: PostHogClientOptions = {
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
};

export class LynxPostHogClient extends PostHogCore {
  private readonly transport: AnalyticsTransport;
  // 익명 ID · 세션 같은 영속 속성은 메모리에만 둡니다(실행마다 새 ID — 스토리지 참조 0).
  private readonly persisted = new Map<string, unknown>();

  constructor(config: AnalyticsConfig, transport: AnalyticsTransport) {
    super(config.projectKey, postHogClientOptions);
    this.transport = transport;
  }

  fetch(url: string, options: PostHogFetchOptions): Promise<PostHogFetchResponse> {
    if (typeof options.body !== "string") {
      return Promise.reject(new Error("PostHog request body must be a string"));
    }
    try {
      return this.transport(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
      }).then((response) => ({
        status: response.status,
        text: () => response.text(),
        json: () => response.json(),
      }));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  getLibraryId(): string {
    return analyticsLibraryId;
  }

  getLibraryVersion(): string {
    return postHogCoreVersion;
  }

  getCustomUserAgent(): string | void {
    return undefined;
  }

  getPersistedProperty<T>(key: string): T | undefined {
    return this.persisted.get(key) as T | undefined;
  }

  setPersistedProperty<T>(key: string, value: T | null): void {
    if (value === null) {
      this.persisted.delete(key);
      return;
    }
    this.persisted.set(key, value);
  }
}

// globalThis.fetch → lynx.fetch → null. signal은 넘기지 않습니다.
//
// `lynx`는 **맨 식별자**로 읽습니다(PR #149의 로그인 전송 해석과 같은 방식). Lynx는 `lynx`를 카드 모듈 범위에
// 주입할 뿐 `globalThis`에 두지 않아, `globalThis.lynx`로 읽으면 기기에서 늘 없음이 됩니다 —
// iOS 시뮬레이터 관찰(2026-09-29): `globalThis.fetch` · `globalThis.lynx` 둘 다 undefined,
// 맨 `lynx.fetch`는 function.
export const resolveAnalyticsTransport: ResolveAnalyticsTransport = () => {
  const globalFetch = (globalThis as unknown as { fetch?: AnalyticsTransport }).fetch;
  if (typeof globalFetch === "function") {
    return (url, init) => globalFetch(url, init);
  }
  if (typeof lynx !== "undefined" && typeof lynx.fetch === "function") {
    const lynxFetch = lynx.fetch.bind(lynx) as unknown as AnalyticsTransport;
    return (url, init) => lynxFetch(url, init);
  }
  return null;
};

export const createAnalyticsSession: CreateAnalyticsSession = (config, transport) => {
  if (config === null || transport === null) {
    return noAnalyticsSession;
  }
  const client = new LynxPostHogClient(config, transport);
  return {
    sinks: analyticsEventSinksFrom(client),
    identify: (userId) => {
      try {
        client.identify(userId);
      } catch {
        // 식별 실패는 화면에 드러내지 않습니다.
      }
    },
  };
};

export const productAnalyticsSession: ProductAnalyticsSession = () =>
  createAnalyticsSession(analyticsConfig(), resolveAnalyticsTransport());
