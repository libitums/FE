// 모든 PostHog 이벤트에 실리는 앱 버전 속성 셋입니다(ADR-0110). 호스트 globalProps `appVersion`을
// `appVersionFrom`으로 좁혀 문자열 셋으로 바꿉니다. 순수 변환 + 조회뿐이고 던지지 않습니다 — 모르면 셋 모두 `unknown`입니다.

import { appVersionFrom } from "./app-version";
import type { AppPlatform, AppVersion } from "./app-version";

export type AppVersionProperties = {
  readonly platform: AppPlatform | "unknown";
  readonly appVersion: string;
  readonly appBuild: string;
};

export const unknownAppVersionProperties: AppVersionProperties = {
  platform: "unknown",
  appVersion: "unknown",
  appBuild: "unknown",
};

/** 좁힌 버전을 속성 셋으로 바꿉니다. `null`이면 `unknownAppVersionProperties`입니다. */
export function appVersionPropertiesFrom(version: AppVersion | null): AppVersionProperties {
  if (version === null) return unknownAppVersionProperties;
  return {
    platform: version.platform,
    appVersion: version.name,
    appBuild: String(version.build),
  };
}

/**
 * 지금 앱 버전 속성입니다. background 스레드에서 capture 직전에 부릅니다. 모르거나 실패하면
 * `unknownAppVersionProperties`입니다. 값을 쌓아 두지 않고 부를 때마다 읽습니다.
 *
 * `lynx`는 맨 식별자로 읽습니다 — `globalThis.lynx`는 기기에서 없습니다(`posthog-client.ts`의 전송 해석과 같은 이유).
 * `__globalProps`는 ReactLynx `useGlobalProps`가 읽는 바로 그 값입니다. 속성 접근으로만 읽습니다(`Reflect.get` 금지, ADR-0086).
 */
export function readAppVersionProperties(): AppVersionProperties {
  try {
    if (typeof lynx === "undefined" || lynx === null) return unknownAppVersionProperties;
    const globalProps = (lynx as { __globalProps?: unknown }).__globalProps;
    return appVersionPropertiesFrom(appVersionFrom(globalProps));
  } catch {
    return unknownAppVersionProperties;
  }
}
