// 제품 이벤트 일부를 Airbridge(MMP) 이벤트로 전달하는 계약입니다(ADR-0063). 타입만 둡니다.
// 이벤트를 **새로 만들지 않습니다** — `analytics.contract.ts`가 모은 기존 이벤트 가운데 셋만 고릅니다.
//
// 모듈 셋이 이 타입을 나눠 가집니다.
//   - `lib/airbridge-events.ts`         — 순수. 이벤트 → Airbridge 이벤트 매핑 · sink 합성. 어느 스레드든 안전
//   - `lib/airbridge-events-module.ts`  — `import "background-only"`. 호스트 모듈 해석 · 진입점 조립
//   - 호스트 `AirbridgeEventsModule`     — iOS · Android. 설정이 있을 때만 등록됩니다

import type { AnalyticsEvent, AnalyticsEventName, AnalyticsEventSinks } from "./analytics.contract";
import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";

// ------------------------------------------------------------------ 고르는 이벤트

/** Airbridge로 전달을 검토하는 기존 이벤트 이름 전부입니다. 이 밖의 이벤트는 매핑이 `null`입니다. */
export type AirbridgeSourceEventName =
  | "entry_completed"
  | "messenger_unit_completed"
  | "visual_novel_unit_completed";

// ------------------------------------------------------------------ Airbridge 이벤트

/** Airbridge 표준 이벤트 `AirbridgeCategory.SIGN_UP`의 와이어 값입니다. */
export type AirbridgeSignUpCategory = "airbridge.user.signup";

/** Airbridge 표준 이벤트 `AirbridgeCategory.ACHIEVE_LEVEL`의 와이어 값입니다 — 레슨(유닛) 완료에 씁니다. */
export type AirbridgeAchieveLevelCategory = "airbridge.achieveLevel";

export type AirbridgeEventCategory = AirbridgeSignUpCategory | AirbridgeAchieveLevelCategory;

/** 완료한 유닛의 종류입니다. 시맨틱 속성 `label`(`AirbridgeAttribute.LABEL`)의 값입니다. */
export type AirbridgeLessonContentType = "messenger" | "visual_novel";

/** 유닛 ID는 콘텐츠 식별자입니다 — 사용자 식별 정보가 아닙니다. */
export type AirbridgeLessonUnitId = MessengerUnitId | VisualNovelUnitId;

/**
 * 호스트로 넘기는 한 건입니다. 시맨틱 속성에는 **콘텐츠 식별자만** 싣습니다 — 사용자 ID · 이메일 ·
 * 전화번호 · 로그인 수단은 싣지 않습니다. 커스텀 속성은 쓰지 않습니다.
 */
export type AirbridgeEvent =
  | {
      readonly category: AirbridgeSignUpCategory;
      readonly semanticAttributes: Readonly<Record<string, never>>;
    }
  | {
      readonly category: AirbridgeAchieveLevelCategory;
      readonly semanticAttributes: {
        readonly level: AirbridgeLessonUnitId;
        readonly label: AirbridgeLessonContentType;
      };
    };

/**
 * 순수 매핑입니다. 입력을 고치지 않고, 던지지 않습니다.
 *   - `entry_completed`                                   → `airbridge.user.signup`, 속성 없음
 *   - `messenger_unit_completed` · `entrySource: journey`    → `airbridge.achieveLevel`, `messenger`
 *   - `visual_novel_unit_completed` · `entrySource: journey` → `airbridge.achieveLevel`, `visual_novel`
 *   - 그 밖 전부(롤플레이 출처의 완료 포함)                  → `null`
 */
export type AirbridgeEventFrom = (event: AnalyticsEvent) => AirbridgeEvent | null;

// ------------------------------------------------------------------ 호스트 모듈

export type AirbridgeEventsModuleName = "AirbridgeEventsModule";

/** 호스트 경계를 넘는 시맨틱 속성입니다. 값은 문자열뿐입니다. */
export type AirbridgeSemanticAttributes = { readonly [key: string]: string };

/**
 * 호스트 네이티브 모듈입니다(iOS · Android 같은 이름 · 같은 메서드). **Airbridge 설정이 있어 SDK가
 * 시작된 빌드에서만 등록됩니다** — 없는 빌드에서는 `NativeModules`에 이 이름이 없습니다. 응답 · 콜백이 없습니다.
 */
export interface AirbridgeEventsModule {
  trackEvent(category: string, semanticAttributes: AirbridgeSemanticAttributes): void;
  /**
   * ⟨ADR-0079⟩ 추적 허용(ATT)을 아직 정하지 않았으면 시스템 대화상자를 띄웁니다. **iOS에만 있습니다** —
   * Android 모듈에는 이 메서드가 없습니다. 응답 · 콜백이 없습니다(`lib/tracking-authorization.ts`).
   */
  requestTrackingAuthorization?(): void;
}

// ------------------------------------------------------------------ JS 결선

/** 한 건을 호스트 모듈로 넘깁니다. 던질 수 있습니다 — 삼키는 것은 sink 합성입니다. */
export type AirbridgeEventTracker = (event: AirbridgeEvent) => void;

/**
 * `NativeModules.AirbridgeEventsModule.trackEvent`가 함수일 때만 tracker, 아니면 `null`입니다
 * (`NativeModules` 없음 · 모듈 없음 · 메서드 없음). 던지지 않습니다.
 */
export type ResolveAirbridgeEventTracker = () => AirbridgeEventTracker | null;

/** Airbridge 전달이 덧붙는 sink 셋입니다. 나머지 넷은 손대지 않습니다. */
export type AirbridgeForwardedSinkKey =
  | "entryEventSink"
  | "messengerEventSink"
  | "visualNovelEventSink";

/**
 * sink 일곱에 Airbridge 전달을 덧붙입니다.
 *   - `tracker`가 `null`이면 **받은 `sinks`를 그대로**(같은 참조) 돌려줍니다 — 가장하지 않습니다.
 *   - 아니면 `AirbridgeForwardedSinkKey` 셋만 새 함수로 바꿉니다. 새 함수는 ① 원래 sink가 있으면 부르고
 *     ② 매핑이 `null`이 아니면 `tracker`를 부릅니다. ①과 ②는 서로의 예외를 막지 않습니다 —
 *     각각 삼킵니다. 원래 sink가 `null`이어도(PostHog 키 없음) ②는 동작합니다.
 *   - 만든 sink는 던지지 않습니다.
 */
export type WithAirbridgeEvents = (
  sinks: AnalyticsEventSinks,
  tracker: AirbridgeEventTracker | null,
) => AnalyticsEventSinks;

/** 제품 진입점이 부르는 것입니다 — `withAirbridgeEvents(sinks, resolveAirbridgeEventTracker())`. */
export type ProductEventSinks = (sinks: AnalyticsEventSinks) => AnalyticsEventSinks;

// ------------------------------------------------------------------ 컴파일 검사

type Assert<T extends true> = T;

/**
 * 값이 없는 검사 묶음입니다.
 *   ① 고르는 이벤트 이름이 전부 기존 이벤트 이름이다(화면 계약에서 사라지면 섬)
 *   ② 모든 Airbridge 이벤트의 시맨틱 속성이 호스트 경계(`string` 값)를 그대로 넘는다
 *   ③ 덧붙는 sink 키가 전부 sink 일곱 안에 있다
 */
export type AirbridgeEventsContractChecks = [
  Assert<[AirbridgeSourceEventName] extends [AnalyticsEventName] ? true : false>,
  Assert<
    [AirbridgeEvent["semanticAttributes"]] extends [AirbridgeSemanticAttributes] ? true : false
  >,
  Assert<[AirbridgeForwardedSinkKey] extends [keyof AnalyticsEventSinks] ? true : false>,
];
