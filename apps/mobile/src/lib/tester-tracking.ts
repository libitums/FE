// 시험 계정은 PostHog · Airbridge로 추적하지 않습니다(ADR-0085 D4). Sentry는 이 경로 밖이라 그대로입니다.
//
// 두 겹입니다.
//   - JS: 이벤트가 나가는 순간 `isTester()`를 읽어 sink 넷과 식별을 버립니다(`withoutTesterEvents` · `withoutTesterIdentify`).
//   - 호스트: 표시가 바뀌면 `AirbridgeEventsModule.setTrackingEnabled`로 SDK 추적을 멈추거나 다시 켭니다 —
//     설치 · 실행처럼 SDK가 스스로 재는 이벤트까지 멈춥니다. 호스트가 값을 기억해 다음 실행도 멈춘 채로 시작합니다.
// 표시를 켜기 전에 나간 이벤트(가입 등)는 되돌리지 못합니다.
// 백그라운드 전용 표시를 두지 않습니다 — 호스트는 effect(백그라운드)에서만 부르고, 모듈을 import 시점에 읽지 않습니다.

import type { AirbridgeEventsModule, AirbridgeEventsModuleName } from "./airbridge-events.contract";
import type { AnalyticsEventSinks } from "./analytics.contract";
import type { AnalyticsUser } from "./analytics-user.contract";

const moduleName: AirbridgeEventsModuleName = "AirbridgeEventsModule";

type IsTester = () => boolean;

function gate<T>(
  sink: ((event: T) => void) | null,
  isTester: IsTester,
): ((event: T) => void) | null {
  if (sink === null) return null;
  return (event) => {
    if (isTester()) return;
    sink(event);
  };
}

/** sink 넷을 감쌉니다 — 부를 때마다 `isTester()`를 읽어 참이면 버립니다. 없는 sink는 `null` 그대로입니다. */
export function withoutTesterEvents(
  sinks: AnalyticsEventSinks,
  isTester: IsTester,
): AnalyticsEventSinks {
  return {
    entryEventSink: gate(sinks.entryEventSink, isTester),
    notificationEventSink: gate(sinks.notificationEventSink, isTester),
    settingsEventSink: gate(sinks.settingsEventSink, isTester),
    episodeIntroEventSink: gate(sinks.episodeIntroEventSink, isTester),
  };
}

/** 시험 계정이면 식별하지 않습니다. 되돌리기(로그아웃 · 계정 삭제)는 늘 넘깁니다. */
export function withoutTesterIdentify(
  user: AnalyticsUser | null,
  isTester: IsTester,
): AnalyticsUser | null {
  if (user === null) return null;
  return {
    identify: (userId) => {
      if (isTester()) return;
      user.identify(userId);
    },
    reset: (scope) => user.reset(scope),
  };
}

/** 호스트 SDK 추적을 켜거나 멈춥니다. 불렀으면 `true`, 부를 곳이 없거나 호스트가 던졌으면 `false`. 던지지 않습니다. */
export function setHostTrackingEnabled(enabled: boolean): boolean {
  if (typeof NativeModules === "undefined" || NativeModules === null) return false;
  const host = (NativeModules as Record<string, unknown>)[moduleName] as
    | Partial<AirbridgeEventsModule>
    | undefined;
  if (typeof host?.setTrackingEnabled !== "function") return false;
  try {
    host.setTrackingEnabled(enabled);
    return true;
  } catch {
    return false;
  }
}

/**
 * 표시가 **바뀔 때만** 호스트를 부르는 함수를 만듭니다(첫 판정도 바뀜으로 칩니다). 켜지면 PostHog 대기열 · 식별을
 * 버립니다 — 표시가 실리기 전에 쌓였거나 로그인 때 식별한 것이 나가지 않게 합니다.
 */
export function createTesterTrackingSync(): (active: boolean, user: AnalyticsUser | null) => void {
  let last: boolean | undefined;
  return (active, user) => {
    if (active === last) return;
    last = active;
    if (active) user?.reset("identity-and-queue");
    setHostTrackingEnabled(!active);
  };
}
