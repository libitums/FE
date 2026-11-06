// 앱 정책(`app-policy.json`) — 플랫폼별 최소 빌드 번호입니다(ADR-0086). 디코드 · 판정 · 저장소 읽기는
// 순수이고 던지지 않습니다. 받기는 `app-policy-refresh.ts`가 집니다.

import { appPlatforms, isBuildNumber } from "./app-version";
import type { AppPlatform, AppVersion } from "./app-version";
import type { ContentStore } from "./episode-cache";
import { entryLoginMethods } from "./entry-flow";
import type { EntryLoginMethod } from "./entry-flow";
import { getItem } from "./storage";

/** 콘텐츠 버킷 기준 상대 경로입니다. */
export const APP_POLICY_PATH = "app-policy.json";
/** 검증을 통과한 원문을 두는 저장소 키입니다. */
export const APP_POLICY_KEY = "libitum.app-policy";

/** 사용 불가로 안내하는 로그인 수단 — `all`은 모든 플랫폼, `android`는 Android만. */
export type UnavailableLoginMethods = {
  readonly all: readonly EntryLoginMethod[];
  readonly android: readonly EntryLoginMethod[];
};

export type AppPolicy = {
  /** 플랫폼별 최소 빌드. 키가 없으면 그 플랫폼은 제한이 없습니다. */
  readonly minBuild: Partial<Record<AppPlatform, number>>;
  /** 사용 불가 로그인 수단. 칸이 없으면 필드가 없고 앱 상수 기본값을 씁니다. */
  readonly unavailableLoginMethods?: UnavailableLoginMethods;
};

export type AppUpdateDecision = "required" | "none";

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 원문을 정책으로 좁힙니다. 스키마 · 정수 검사에 걸리면 `null`. 모르는 키는 버립니다. */
export function decodeAppPolicy(text: string): AppPolicy | null {
  const parsed = parseJson(text);
  if (!isPlainRecord(parsed) || parsed["schema"] !== "app-policy-1") return null;
  const raw = parsed["min_build"];
  if (!isPlainRecord(raw)) return null;
  const minBuild: Partial<Record<AppPlatform, number>> = {};
  for (const platform of appPlatforms) {
    if (!Object.prototype.hasOwnProperty.call(raw, platform)) continue;
    const value = raw[platform];
    if (!isBuildNumber(value)) return null;
    minBuild[platform] = value;
  }
  const unavailableLoginMethods = decodeUnavailableLoginMethods(
    parsed["unavailable_login_methods"],
  );
  return unavailableLoginMethods === undefined
    ? { minBuild }
    : { minBuild, unavailableLoginMethods };
}

/** 문자열 배열에서 아는 수단만 어휘 순서로 — 배열이 아니면 `[]`. */
function knownLoginMethods(value: unknown): readonly EntryLoginMethod[] {
  if (!Array.isArray(value)) return [];
  return entryLoginMethods.filter((method) => value.includes(method));
}

/**
 * `unavailable_login_methods` 칸(ADR-0111 개정 3). 키가 없거나 모양이 틀리면 **칸만** 없는 것으로 — 정책 전체(최소 빌드)는
 * 그대로 산다. 모르는 수단 이름은 버린다.
 */
function decodeUnavailableLoginMethods(raw: unknown): UnavailableLoginMethods | undefined {
  if (!isPlainRecord(raw)) return undefined;
  return { all: knownLoginMethods(raw["all"]), android: knownLoginMethods(raw["android"]) };
}

/** 버전 · 정책 둘 다 있고 그 플랫폼의 최소 빌드보다 낮으면 `required`. */
export function appUpdateDecision(
  version: AppVersion | null,
  policy: AppPolicy | null,
): AppUpdateDecision {
  if (version === null || policy === null) return "none";
  const min = policy.minBuild[version.platform];
  if (min === undefined) return "none";
  return version.build < min ? "required" : "none";
}

/** 저장소의 마지막 정책입니다. 없거나 틀리면 `null`. 던지지 않습니다. */
export function loadAppPolicy(store: ContentStore): AppPolicy | null {
  let text: string | null;
  try {
    text = store.get(APP_POLICY_KEY);
  } catch {
    return null;
  }
  return text === null ? null : decodeAppPolicy(text);
}

/**
 * 호스트 저장소의 마지막 정책입니다 — 스플래시가 나가는 순간 결선이 읽습니다. `episode-cache.ts`는
 * `background-only`라 렌더 경로의 결선이 import할 수 없어, 같은 저장소 함수(`storage.ts`)를 직접 감쌉니다.
 */
export function loadStoredAppPolicy(): AppPolicy | null {
  return loadAppPolicy({
    available: () => true,
    get: getItem,
    set: () => undefined,
    remove: () => undefined,
  });
}
