// 제품 사용 이벤트를 PostHog로 보내는 계약입니다. 타입만 둡니다 — 구현 · 값은 없습니다.
//
// 결정의 근거는 ADR-0029(분석 전송 · PostHog)입니다. 이 파일은 그 계약의 타입 부분을
// 컴파일되는 모양으로 고정합니다. 이벤트 이름과 필드는 **새로 정하지 않습니다** —
// 각 화면 계약(`entry-flow.ts` · `*.contract.ts`)이 이미 고정한 일곱 union을 그대로
// 모읍니다. 이 파일이 더하는 것은 「그 이벤트가 PostHog 요청의 어디로 가는가」뿐입니다.
//
// 모듈 셋이 이 타입을 나눠 가집니다.
//   - `lib/analytics-config.ts`  — 순수. 키 · 환경 판정 · 호스트 상수. 어느 스레드든 안전
//   - `lib/analytics-events.ts`  — 순수. 이벤트 → capture 매핑 · sink 일곱 만들기. 어느 스레드든 안전
//   - `lib/posthog-client.ts`    — `import "background-only"`. SDK · 어댑터 · 전송 해석
//
// SDK 타입은 **type import만** 합니다 — 값 import는 `posthog-client.ts` 한 파일뿐이라,
// 이 파일은 메인 스레드 번들에 SDK를 끌어들이지 않습니다.

import type { PostHogCore, PostHogCoreOptions } from "@posthog/core";

import type { EntryAppProps, EntryEvent, EntryEventSink } from "./entry-flow";
import type {
  EpisodeIntroAppProps,
  EpisodeIntroEvent,
  EpisodeIntroEventSink,
} from "../screens/episode-intro/episode-intro.contract";
import type {
  MessengerAppProps,
  MessengerEvent,
  MessengerEventSink,
} from "../screens/messenger/messenger.contract";
import type {
  NotificationAppProps,
  NotificationEvent,
  NotificationEventSink,
} from "../screens/notifications/notifications.contract";
import type {
  PhoneCallAppProps,
  PhoneCallEvent,
  PhoneCallEventSink,
} from "../screens/phone-call/phone-call.contract";
import type {
  SettingsAppProps,
  SettingsEvent,
  SettingsEventSink,
} from "../screens/settings/settings.contract";
import type {
  VisualNovelAppProps,
  VisualNovelEvent,
  VisualNovelEventSink,
} from "../screens/visual-novel/visual-novel.contract";

// ------------------------------------------------------------------ 설정

/** 수집 호스트입니다(사용자 결정 U1 — US Cloud). 환경 변수로 바꾸지 않습니다. */
export type PostHogHost = "https://us.i.posthog.com";

/** 이벤트가 난 곳입니다. 프로젝트가 하나라 모든 이벤트에 `environment`로 붙습니다(ADR-0029 D13). */
export type AnalyticsEnvironment = "development" | "production";

/** 순수 판정입니다. 정확히 `"production"`일 때만 운영이고 그 밖은 전부 `"development"`입니다. */
export type AnalyticsEnvironmentFrom = (environment: unknown) => AnalyticsEnvironment;

/**
 * 판정을 통과한 접속 값입니다. `projectKey`는 앞뒤 공백을 걷은 `phc_…` 공개 키입니다.
 * 문자열이 아니거나 · 비었거나 · `phc_`로 시작하지 않거나(개인 키 `phx_` 포함) · 접두 뒤가
 * 비었거나 · 안에 공백이 있으면 판정은 `null`입니다.
 */
export type AnalyticsConfig = {
  readonly projectKey: string;
  readonly host: PostHogHost;
  readonly environment: AnalyticsEnvironment;
};

/** 순수 판정입니다. 규칙을 통과하지 못하면 `null` — 그러면 클라이언트를 만들지 않습니다. */
export type AnalyticsConfigFrom = (
  projectKey: unknown,
  environment: unknown,
) => AnalyticsConfig | null;

// ------------------------------------------------------------------ 이벤트 → capture

/** sink 일곱이 내는 이벤트 전부입니다(이름 23개 · 모양 27개 — 열림 이벤트 셋이 출처별 두 모양). */
export type AnalyticsEvent =
  | EntryEvent
  | MessengerEvent
  | VisualNovelEvent
  | PhoneCallEvent
  | NotificationEvent
  | SettingsEvent
  | EpisodeIntroEvent;

/**
 * PostHog 이벤트 이름입니다. **목록을 손으로 적습니다** — 화면 계약에 이벤트가 늘거나
 * 줄면 아래 `AnalyticsContractChecks`가 컴파일 오류로 서고, 그때 wiki 카탈로그도 함께
 * 고칩니다(ADR-0029).
 */
export type AnalyticsEventName =
  | "entry_screen_viewed"
  | "entry_login_method_selected"
  | "entry_completed"
  | "messenger_unit_opened"
  | "messenger_unit_completed"
  | "messenger_unit_exited_incomplete"
  | "visual_novel_unit_opened"
  | "visual_novel_unit_completed"
  | "visual_novel_unit_exited_incomplete"
  | "visual_novel_unit_replay_started"
  | "phone_call_unit_opened"
  | "notifications_opened"
  | "notification_item_tapped"
  | "notification_item_deleted"
  | "settings_opened"
  | "profile_opened"
  | "legal_document_opened"
  | "session_option_changed"
  | "episode_intro_viewed"
  | "episode_intro_skipped"
  | "episode_intro_continued"
  | "episode_intro_exited"
  | "episode_prologue_completed";

/** 이벤트 필드 값은 문자열 · 불리언뿐입니다. 숫자 필드가 생기면 검사가 섭니다. */
export type AnalyticsPropertyValue = string | boolean;

export type AnalyticsProperties = { readonly [key: string]: AnalyticsPropertyValue };

/**
 * PostHog `capture(event, properties)`에 넘길 한 쌍입니다. `properties`는 이벤트에서
 * `name` **하나만** 뺀 나머지 필드 그대로입니다 — 키를 더하지도 바꾸지도 않습니다.
 */
export type AnalyticsCapture = {
  readonly event: AnalyticsEventName;
  readonly properties: AnalyticsProperties;
};

/** 순수 매핑입니다. 입력을 고치지 않고, 던지지 않습니다. */
export type AnalyticsCaptureFrom = (event: AnalyticsEvent) => AnalyticsCapture;

// ------------------------------------------------------------------ 클라이언트 · sink

/**
 * sink가 쓰는 클라이언트 표면입니다 — `PostHogCore`의 부분집합이고, unit이 가짜로 바꿔
 * 끼우는 자리입니다. 실제 구현은 `posthog-client.ts`의 어댑터 하나뿐입니다.
 */
export type AnalyticsCaptureClient = {
  capture(event: AnalyticsEventName, properties: AnalyticsProperties): void;
  identify(distinctId: string): void;
};

/**
 * App이 받는 sink 일곱입니다. 키 이름이 App props 이름과 같습니다. **옵셔널이 없습니다**
 * (ADR-0007 D5) — 보내지 않을 때는 각 값이 `null`입니다. no-op 함수로 수집을 가장하지
 * 않는다는 기존 sink 규약(`MessengerEventSink` 주석)을 그대로 따릅니다.
 */
export type AnalyticsEventSinks = {
  readonly entryEventSink: EntryEventSink;
  readonly messengerEventSink: MessengerEventSink;
  readonly visualNovelEventSink: VisualNovelEventSink;
  readonly phoneCallEventSink: PhoneCallEventSink;
  readonly notificationEventSink: NotificationEventSink;
  readonly settingsEventSink: SettingsEventSink;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
};

/**
 * 클라이언트가 있으면 일곱 모두 그 클라이언트로 `capture`하는 함수, 없으면 일곱 모두
 * `null`입니다. 만든 sink는 **던지지 않습니다** — 매핑 · capture의 예외를 안에서 삼킵니다.
 */
export type AnalyticsEventSinksFrom = (
  client: AnalyticsCaptureClient | null,
) => AnalyticsEventSinks;

/** 로그인 사용자 식별입니다(ADR-0029 D8). 로그인 · 세션 갱신 직후 진입 결선이 부릅니다. */
export type AnalyticsIdentify = (userId: string) => void;

/** App이 받는 식별 자리입니다. sink와 같이 보내지 않을 때는 `null`입니다. */
export type AnalyticsIdentifyAppProps = {
  readonly analyticsIdentify?: AnalyticsIdentify | null;
};

/** 진입점이 한 번 만들어 쥐는 묶음입니다. 클라이언트가 없으면 `identify`도 `null`입니다. */
export type AnalyticsSession = {
  readonly sinks: AnalyticsEventSinks;
  readonly identify: AnalyticsIdentify | null;
};

// ------------------------------------------------------------------ 전송(어댑터 ↔ Lynx fetch)

/**
 * 어댑터가 Lynx `fetch`에 넘기는 요청입니다. 본문은 **항상 문자열**입니다 — 압축을 끄므로
 * (`disableCompression: true`) SDK가 `Blob` · 바이트를 만들지 않습니다. `signal`은
 * 넘기지 않습니다 — `@lynx-js/types`의 `RequestInit`에 없는 필드입니다.
 */
export type AnalyticsRequestInit = {
  readonly method: "GET" | "POST" | "PUT" | "PATCH";
  readonly headers: { readonly [name: string]: string };
  readonly body: string;
};

/** SDK가 읽는 응답의 최소 모양입니다. */
export type AnalyticsResponse = {
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

export type AnalyticsTransport = (
  url: string,
  init: AnalyticsRequestInit,
) => Promise<AnalyticsResponse>;

/** `globalThis.fetch` → `lynx.fetch` → 없음(`null`). 호출할 때마다 해석합니다. */
export type ResolveAnalyticsTransport = () => AnalyticsTransport | null;

/**
 * 설정과 전송이 **둘 다** 있을 때만 클라이언트를 하나 만듭니다. 하나라도 `null`이면
 * 클라이언트를 만들지 않고 sink 일곱 `null` · `identify` `null`을 돌려줍니다 — 요청 0건.
 */
export type CreateAnalyticsSession = (
  config: AnalyticsConfig | null,
  transport: AnalyticsTransport | null,
) => AnalyticsSession;

/** 제품 진입점이 부르는 것입니다 — 환경 변수와 전역 전송을 읽어 `CreateAnalyticsSession`에 넘깁니다. */
export type ProductAnalyticsSession = () => AnalyticsSession;

// ------------------------------------------------------------------ SDK 옵션

/**
 * 어댑터가 `PostHogCore` 생성자에 넘기는 옵션입니다. **이름은 `@posthog/core` 1.55.2의
 * `PostHogCoreOptions`에서 뽑습니다** — 오탈자나 없는 옵션이면 여기서 컴파일 오류가
 * 납니다. 값과 근거는 ADR-0029의 옵션 표가 정본입니다.
 */
export type PostHogClientOptions = Required<
  Pick<
    PostHogCoreOptions,
    | "host"
    | "flushAt"
    | "flushInterval"
    | "fetchRetryCount"
    | "fetchRetryDelay"
    | "requestTimeout"
    | "preloadFeatureFlags"
    | "disableRemoteFeatureFlags"
    | "sendFeatureFlagEvent"
    | "disableSurveys"
    | "disableCompression"
    | "disableGeoip"
    | "personProfiles"
    | "defaultOptIn"
    | "maxQueueSize"
  >
> & { readonly host: PostHogHost };

// ------------------------------------------------------------------ 대기열 보존

/**
 * 보내지 못한 이벤트 대기열을 담는 저장소 키입니다(`StorageModule`이 `libitum.` 접두를 붙입니다).
 * 저장소에 두는 분석 값은 이것 하나뿐입니다 — 익명 ID · 세션은 메모리에만 둡니다(ADR-0029).
 */
export type AnalyticsQueueStorageKey = "analytics.queue";

/**
 * 네트워크 오류 뒤 새 이벤트 없이 스스로 다시 보내는 간격(ms)입니다. 차례로 쓰고 다 쓰면
 * 멈춥니다 — 남은 대기열은 다음 이벤트나 다음 실행이 보냅니다.
 */
export type AnalyticsQueueRetryDelaysMs = readonly number[];

// ------------------------------------------------------------------ 컴파일 검사

type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * 값이 없는 검사 묶음입니다. 하나라도 거짓이 되면 `tsc`가 이 줄에서 멈춥니다.
 *   ① 화면 계약의 이벤트 이름 집합 = `AnalyticsEventName`(늘거나 줄면 섬)
 *   ② 모든 이벤트가 `name` + 스칼라 필드뿐이다(PostHog properties로 그대로 갈 수 있다)
 *   ③ sink 일곱 = App이 받는 sink props 일곱(키와 값 타입 모두, 옵셔널을 걷은 모양)
 *   ④ `PostHogCore` 인스턴스가 `AnalyticsCaptureClient` 자리에 그대로 들어간다
 */
export type AnalyticsContractChecks = [
  Assert<Same<AnalyticsEvent["name"], AnalyticsEventName>>,
  Assert<
    [AnalyticsEvent] extends [{ readonly [key: string]: AnalyticsPropertyValue }] ? true : false
  >,
  Assert<
    Same<
      AnalyticsEventSinks,
      Required<
        EntryAppProps &
          MessengerAppProps &
          VisualNovelAppProps &
          PhoneCallAppProps &
          NotificationAppProps &
          SettingsAppProps &
          EpisodeIntroAppProps
      >
    >
  >,
  Assert<[PostHogCore] extends [AnalyticsCaptureClient] ? true : false>,
];
