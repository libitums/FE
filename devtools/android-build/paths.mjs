// Android 빌드 잡이 실제로 빌드할지 정하는 순수 판정입니다. Kotlin · Gradle · 번들 동기화 · APK에 들어가는
// 자산 · 이 잡을 정의하는 CI 파일이 바뀔 때만 참입니다. 앱 JS(`apps/mobile/src`)는 Gradle 컴파일을 깨지
// 못하고 그 빌드는 Build 잡이 봅니다.

const PREFIXES = [
  "apps/android/",
  "devtools/android-bundle/",
  "devtools/android-build/",
  // packaged-assets.gradle이 이 둘을 APK에 동기화합니다(오디오의 단일 출처).
  "apps/ios/Host/audio/",
  "apps/ios/Host/sfx/",
  ".github/workflows/",
  ".github/actions/",
];

// `bundle:android` 스크립트가 루트에 있습니다.
const FILES = new Set(["package.json"]);

/** @param {readonly string[]} changedPaths */
export function needsAndroidBuild(changedPaths) {
  return changedPaths.some(
    (path) => FILES.has(path) || PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
}

/**
 * PR에서만 변경으로 거릅니다. main push는 늘 빌드합니다 — 병합된 결과가 빌드되는지가 그 자리의 질문입니다.
 * 비교 범위를 모르면(`changedPaths === null`) 빌드합니다 — 건너뛰는 쪽의 오차가 깨진 main입니다.
 * @param {{ event: string, changedPaths: readonly string[] | null }} input
 */
export function androidBuildDecision({ event, changedPaths }) {
  if (event !== "pull_request") return { build: true, reason: "push" };
  if (changedPaths === null) return { build: true, reason: "unknown-range" };
  return needsAndroidBuild(changedPaths)
    ? { build: true, reason: "android-change" }
    : { build: false, reason: "no-android-change" };
}
