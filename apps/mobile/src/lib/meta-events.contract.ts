// 제품 이벤트 일부를 Meta(Facebook) 앱 이벤트로 전달하는 계약입니다(ADR-0057). 타입만 둡니다.
// 이벤트를 **새로 만들지 않습니다** — `analytics.contract.ts`가 모은 기존 이벤트 가운데 셋만 고릅니다.
//
// 모듈 셋이 이 타입을 나눠 가집니다.
//   - `lib/meta-events.ts`             — 순수. 이벤트 → Meta 이벤트 매핑 · sink 합성. 어느 스레드든 안전
//   - `lib/meta-app-events-module.ts`  — `import "background-only"`. 호스트 모듈 해석 · 진입점 조립
//   - 호스트 `MetaAppEventsModule`      — iOS · Android. 설정이 있을 때만 등록됩니다

import type { AnalyticsEvent, AnalyticsEventName, AnalyticsEventSinks } from "./analytics.contract";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";

// ------------------------------------------------------------------ 고르는 이벤트

/** Meta로 전달을 검토하는 기존 이벤트 이름 전부입니다. 이 밖의 이벤트는 매핑이 `null`입니다. */
export type MetaSourceEventName =
  | "entry_completed"
  | "messenger_unit_completed"
  | "visual_novel_unit_completed";

// ------------------------------------------------------------------ Meta 이벤트

/** Meta 표준 이벤트 「Complete Registration」의 와이어 이름입니다. */
export type MetaRegistrationEventName = "fb_mobile_complete_registration";

/** Meta 표준 이벤트 「Achieve Level」의 와이어 이름입니다 — 레슨(유닛) 완료에 씁니다. */
export type MetaLessonEventName = "fb_mobile_level_achieved";

export type MetaAppEventName = MetaRegistrationEventName | MetaLessonEventName;

/** 완료한 유닛의 종류입니다. Meta 표준 파라미터 `fb_content_type`의 값입니다. */
export type MetaLessonContentType = "messenger" | "visual_novel";

/** 유닛 ID는 콘텐츠 식별자입니다 — 사용자 식별 정보가 아닙니다. */
export type MetaLessonUnitId = MessengerUnitId | VisualNovelUnitId;

/**
 * 호스트로 넘기는 한 건입니다. 파라미터에는 **콘텐츠 식별자만** 싣습니다 — 사용자 ID · 이메일 ·
 * 전화번호 · 로그인 수단은 싣지 않습니다.
 */
export type MetaAppEvent =
  | {
      readonly name: MetaRegistrationEventName;
      readonly parameters: Readonly<Record<string, never>>;
    }
  | {
      readonly name: MetaLessonEventName;
      readonly parameters: {
        readonly fb_level: MetaLessonUnitId;
        readonly fb_content_type: MetaLessonContentType;
      };
    };

/**
 * 순수 매핑입니다. 입력을 고치지 않고, 던지지 않습니다.
 *   - `entry_completed`                                   → `fb_mobile_complete_registration`, 파라미터 없음
 *   - `messenger_unit_completed` · `entrySource: journey`    → `fb_mobile_level_achieved`, `messenger`
 *   - `visual_novel_unit_completed` · `entrySource: journey` → `fb_mobile_level_achieved`, `visual_novel`
 *   - 그 밖 전부(롤플레이 출처의 완료 포함)                  → `null`
 */
export type MetaAppEventFrom = (event: AnalyticsEvent) => MetaAppEvent | null;

// ------------------------------------------------------------------ 호스트 모듈

export type MetaAppEventsModuleName = "MetaAppEventsModule";

/** 호스트 경계를 넘는 파라미터입니다. 값은 문자열뿐입니다. */
export type MetaAppEventParameters = { readonly [key: string]: string };

/**
 * 호스트 네이티브 모듈입니다(iOS · Android 같은 이름 · 같은 메서드). **Meta 설정이 있는 빌드에서만
 * 등록됩니다** — 없는 빌드에서는 `NativeModules`에 이 이름이 없습니다. 응답 · 콜백이 없습니다.
 */
export interface MetaAppEventsModule {
  logEvent(name: string, parameters: MetaAppEventParameters): void;
}

// ------------------------------------------------------------------ JS 결선

/** 한 건을 호스트 모듈로 넘깁니다. 던질 수 있습니다 — 삼키는 것은 sink 합성입니다. */
export type MetaAppEventLogger = (event: MetaAppEvent) => void;

/**
 * `NativeModules.MetaAppEventsModule.logEvent`가 함수일 때만 logger, 아니면 `null`입니다
 * (`NativeModules` 없음 · 모듈 없음 · 메서드 없음). 던지지 않습니다.
 */
export type ResolveMetaAppEventLogger = () => MetaAppEventLogger | null;

/** Meta 전달이 덧붙는 sink 셋입니다. 나머지 넷은 손대지 않습니다. */
export type MetaForwardedSinkKey = "entryEventSink" | "messengerEventSink" | "visualNovelEventSink";

/**
 * sink 일곱에 Meta 전달을 덧붙입니다.
 *   - `logger`가 `null`이면 **받은 `sinks`를 그대로**(같은 참조) 돌려줍니다 — 가장하지 않습니다.
 *   - 아니면 `MetaForwardedSinkKey` 셋만 새 함수로 바꿉니다. 새 함수는 ① 원래 sink가 있으면 부르고
 *     ② 매핑이 `null`이 아니면 `logger`를 부릅니다. ①과 ②는 서로의 예외를 막지 않습니다 —
 *     각각 삼킵니다. 원래 sink가 `null`이어도(PostHog 키 없음) ②는 동작합니다.
 *   - 만든 sink는 던지지 않습니다.
 */
export type WithMetaAppEvents = (
  sinks: AnalyticsEventSinks,
  logger: MetaAppEventLogger | null,
) => AnalyticsEventSinks;

/** 제품 진입점이 부르는 것입니다 — `withMetaAppEvents(sinks, resolveMetaAppEventLogger())`. */
export type ProductEventSinks = (sinks: AnalyticsEventSinks) => AnalyticsEventSinks;

// ------------------------------------------------------------------ 컴파일 검사

type Assert<T extends true> = T;

/**
 * 값이 없는 검사 묶음입니다.
 *   ① 고르는 이벤트 이름이 전부 기존 이벤트 이름이다(화면 계약에서 사라지면 섬)
 *   ② 모든 Meta 이벤트의 파라미터가 호스트 경계(`string` 값)를 그대로 넘는다
 *   ③ 덧붙는 sink 키가 전부 sink 일곱 안에 있다
 */
export type MetaEventsContractChecks = [
  Assert<[MetaSourceEventName] extends [AnalyticsEventName] ? true : false>,
  Assert<[MetaAppEvent["parameters"]] extends [MetaAppEventParameters] ? true : false>,
  Assert<[MetaForwardedSinkKey] extends [keyof AnalyticsEventSinks] ? true : false>,
];
