// `unit` 계층: 어떤 변경이 Android 빌드 잡을 실제로 돌게 하는가.
//
// 빌드는 Kotlin · Gradle · 번들 동기화 · APK에 들어가는 자산이 바뀔 때만 의미가 있습니다. JS 번들의 내용
// (`apps/mobile/src`)은 Gradle 컴파일을 깨지 못하고, 그 빌드는 Build 잡이 이미 봅니다.

import assert from "node:assert/strict";
import test from "node:test";

import { needsAndroidBuild } from "./paths.mjs";

test("AB1. Android 소스 · Gradle 설정이 바뀌면 빌드한다", () => {
  for (const path of [
    "apps/android/app/src/main/java/libitum/duru/android/MainActivity.kt",
    "apps/android/app/build.gradle",
    "apps/android/settings.gradle",
    "apps/android/gradle/wrapper/gradle-wrapper.properties",
    "apps/android/vendor-maven/org/lynxsdk/lynx/lynx/4.0.1/lynx-4.0.1.pom",
  ]) {
    assert.equal(needsAndroidBuild([path]), true, path);
  }
});

test("AB2. 번들 동기화 · APK에 들어가는 호스트 오디오 · 루트 스크립트 · CI 자체가 바뀌면 빌드한다", () => {
  for (const path of [
    "devtools/android-bundle/sync.mjs",
    "apps/ios/Host/audio/intro.m4a",
    "apps/ios/Host/sfx/correct.mp3",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    ".github/workflows/verify.yml",
    ".github/actions/setup/action.yml",
    "devtools/android-build/paths.mjs",
  ]) {
    assert.equal(needsAndroidBuild([path]), true, path);
  }
});

test("AB3. 앱 JS · 문서 · iOS 소스만 바뀌면 빌드하지 않는다", () => {
  assert.equal(
    needsAndroidBuild([
      "apps/mobile/src/app/App.tsx",
      "docs/adr/0021-performance-report-ci-automation.md",
      "apps/ios/Host/AppDelegate.swift",
      "packages/ui-lynx/src/button/Button.tsx",
      "apps/android-notes.md",
    ]),
    false,
  );
});

test("AB4. 빈 목록이면 빌드하지 않고, 하나라도 해당하면 빌드한다", () => {
  assert.equal(needsAndroidBuild([]), false);
  assert.equal(needsAndroidBuild(["docs/screens.md", "apps/android/app/build.gradle"]), true);
});

test("AB5. main push이거나 비교 범위를 모르면 변경과 상관없이 빌드한다", async () => {
  const { androidBuildDecision } = await import("./paths.mjs");
  assert.deepEqual(androidBuildDecision({ event: "push", changedPaths: [] }), {
    build: true,
    reason: "push",
  });
  assert.deepEqual(androidBuildDecision({ event: "pull_request", changedPaths: null }), {
    build: true,
    reason: "unknown-range",
  });
  assert.deepEqual(
    androidBuildDecision({ event: "pull_request", changedPaths: ["apps/mobile/src/app/App.tsx"] }),
    { build: false, reason: "no-android-change" },
  );
  assert.deepEqual(
    androidBuildDecision({
      event: "pull_request",
      changedPaths: ["apps/android/app/build.gradle"],
    }),
    { build: true, reason: "android-change" },
  );
});
