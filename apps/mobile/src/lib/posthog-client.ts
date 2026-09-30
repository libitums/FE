import "background-only";

// PostHog 어댑터 — background 스레드 전용(SDK 값 import는 PostHogCore 하나뿐). 계약: spec §3.
import { PostHogCore } from "@posthog/core";
import type { PostHogFetchOptions, PostHogFetchResponse } from "@posthog/core";

import type {
  AnalyticsConfig,
  AnalyticsQueueRetryDelaysMs,
  AnalyticsQueueStorageKey,
  AnalyticsTransport,
  CreateAnalyticsSession,
  PostHogClientOptions,
  ProductAnalyticsSession,
  ResolveAnalyticsTransport,
} from "./analytics.contract";
import { analyticsConfig } from "./analytics-config";
import { getItem, removeItem, setItem } from "./storage";
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
  disableGeoip: false,
  personProfiles: "identified_only",
  defaultOptIn: true,
  maxQueueSize: 200,
};

export const analyticsQueueStorageKey: AnalyticsQueueStorageKey = "analytics.queue";

export const analyticsQueueRetryDelaysMs: AnalyticsQueueRetryDelaysMs = [
  15_000, 30_000, 60_000, 120_000, 300_000,
];

// Lynx `fetch`는 연결 실패를 거부하지 않고 이 status의 응답으로 돌려준다(iOS 시뮬레이터 관찰
// 2026-09-29: 닫힌 포트 → 499). 그대로 넘기면 SDK가 HTTP 오류로 보고 이벤트를 버리므로, 거부로
// 바꿔 네트워크 실패(대기열에 남기고 재시도)로 다룬다. PostHog 서버는 이 둘을 돌려주지 않는다.
const lynxNetworkFailureStatuses: readonly number[] = [0, 499];

// SDK가 보내지 못한 이벤트를 담는 영속 속성 이름입니다(`PostHogPersistedProperty.Queue`).
// 값 import는 `PostHogCore` 하나뿐이라는 규칙 때문에 열거형 대신 문자열로 적습니다.
const sdkQueueProperty = "queue";

export class LynxPostHogClient extends PostHogCore {
  private readonly transport: AnalyticsTransport;
  // 익명 ID · 세션 같은 영속 속성은 메모리에만 둡니다(실행마다 새 ID). 저장소로 나가는 것은
  // 보내지 못한 이벤트 대기열 하나뿐입니다(ADR-0029).
  private readonly persisted = new Map<string, unknown>();
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private retryAttempt = 0;

  constructor(config: AnalyticsConfig, transport: AnalyticsTransport) {
    super(config.projectKey, { ...postHogClientOptions, host: config.host });
    this.transport = transport;
    // 프로젝트가 하나라 개발 · 운영을 이 속성으로 가릅니다(ADR-0029 D13). 되살린 대기열의
    // 이벤트는 만들어질 때의 값을 그대로 갖습니다.
    this.register({ environment: config.environment });
    this.on("error", () => this.scheduleRetry());
    this.on("flush", () => {
      this.retryAttempt = 0;
    });
    this.restoreQueue();
  }

  // 지난 실행이 남긴 대기열을 메모리로 올리고 곧바로 보냅니다. 깨진 값은 버립니다.
  private restoreQueue(): void {
    const saved = getItem(analyticsQueueStorageKey);
    if (saved === null) {
      return;
    }
    let queue: unknown;
    try {
      queue = JSON.parse(saved);
    } catch {
      queue = null;
    }
    if (!Array.isArray(queue) || queue.length === 0) {
      removeItem(analyticsQueueStorageKey);
      return;
    }
    this.persisted.set(sdkQueueProperty, queue);
    this.flush().catch(() => undefined);
  }

  // 네트워크 오류로 대기열이 남으면 간격 표대로 스스로 다시 보냅니다. 표를 다 쓰면 멈춥니다 —
  // 남은 대기열은 다음 이벤트나 다음 실행이 보냅니다. 그 밖 오류는 SDK가 대기열을 이미 비웠습니다.
  private scheduleRetry(): void {
    const queue = this.persisted.get(sdkQueueProperty);
    if (this.retryTimer !== undefined || !Array.isArray(queue) || queue.length === 0) {
      return;
    }
    const delay = analyticsQueueRetryDelaysMs[this.retryAttempt];
    if (delay === undefined) {
      return;
    }
    this.retryAttempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.flush().catch(() => undefined);
    }, delay);
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
      })
        .then((response) => {
          if (lynxNetworkFailureStatuses.includes(response.status)) {
            throw new Error(`Lynx fetch network failure (status ${String(response.status)})`);
          }
          return response;
        })
        .then((response) => ({
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
    } else {
      this.persisted.set(key, value);
    }
    if (key === sdkQueueProperty) {
      this.saveQueue(value);
    }
  }

  /** 재시도 타이머를 풀고 메모리 · 저장소 대기열을 비웁니다. */
  discardQueue(): void {
    if (this.retryTimer !== undefined) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
    this.retryAttempt = 0;
    this.setPersistedProperty(sdkQueueProperty, null);
  }

  private saveQueue(queue: unknown): void {
    try {
      if (Array.isArray(queue) && queue.length > 0) {
        setItem(analyticsQueueStorageKey, JSON.stringify(queue));
      } else {
        removeItem(analyticsQueueStorageKey);
      }
    } catch {
      // 저장 실패는 메모리 대기열만 남깁니다.
    }
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
    return (url, init) => globalFetch.call(globalThis, url, init);
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
    user: {
      identify: (userId) => {
        try {
          client.identify(userId);
        } catch {
          // 식별 실패는 화면에 드러내지 않습니다.
        }
      },
      reset: (scope) => {
        try {
          // 대기열을 먼저 버려 reset 중 flush가 옛 대기열을 보내는 창을 없앱니다.
          if (scope === "identity-and-queue") {
            client.discardQueue();
          }
          client.reset();
          // reset이 등록 속성을 지우므로 D13 속성을 다시 겁니다.
          client.register({ environment: config.environment });
        } catch {
          // 되돌리기 실패는 화면에 드러내지 않습니다.
        }
      },
    },
  };
};

export const productAnalyticsSession: ProductAnalyticsSession = () =>
  createAnalyticsSession(analyticsConfig(), resolveAnalyticsTransport());
