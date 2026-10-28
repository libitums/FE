// 호스트가 globalProps `appVersion`으로 보내는 앱 버전을 읽는 순수 함수입니다(ADR-0086).
// iOS는 `CFBundleShortVersionString` · `CFBundleVersion`, Android는 `versionName` · `versionCode`를
// 같은 모양 `{ platform, name, build }`로 싣습니다. 값이 없거나(Explorer · 테스트) 모양이 틀리면 `null`입니다.

import type { UiCopy } from "./ui-copy.contract";

export type AppPlatform = "ios" | "android";

/** 호스트가 보내는 플랫폼 이름 둘 — 정책 파일의 `min_build` 키이기도 합니다. */
export const appPlatforms: readonly AppPlatform[] = ["ios", "android"];

export type AppVersion = {
  readonly platform: AppPlatform;
  /** 사람이 읽는 버전(`1.0`). */
  readonly name: string;
  /** 스토어가 비교하는 정수(iOS 빌드 번호 · Android versionCode). */
  readonly build: number;
};

function isPlatform(value: unknown): value is AppPlatform {
  return typeof value === "string" && (appPlatforms as readonly string[]).includes(value);
}

/** 정수 0 이상만 빌드 번호입니다. */
export function isBuildNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** globalProps의 `appVersion`을 좁힙니다. 던지지 않습니다. */
export function appVersionFrom(globalProps: unknown): AppVersion | null {
  if (typeof globalProps !== "object" || globalProps === null) return null;
  const raw: unknown = Reflect.get(globalProps, "appVersion");
  if (typeof raw !== "object" || raw === null) return null;
  const { platform, name, build } = raw as Record<string, unknown>;
  if (!isPlatform(platform)) return null;
  if (typeof name !== "string" || name.length === 0) return null;
  if (!isBuildNumber(build)) return null;
  return { platform, name, build };
}

/** 설정 끝 줄의 문구입니다 — `Version 1.0 (11)`. */
export function appVersionLabel(version: AppVersion, copy: UiCopy): string {
  return copy.settings.version(version.name, version.build);
}
