// android-abi-minify 단위 검사 (U1~U12). 계약: spec.md `## r02`, 계획: test-plan.md `## r02`.
// release-shrink.mjs의 순수 함수 다섯의 입출력만 본다 — 파일 · 프로세스를 건드리지 않는다.
// pnpm test:android-bundle / pnpm verify 안에서 돈다.
import assert from "node:assert/strict";
import test from "node:test";

import { survivalIssues } from "./mapping-survival.mjs";
import {
  buildTypeSettings,
  lynxModuleMethods,
  mappingIssues,
  packagedAbis,
  uncoveredNativeCallbackAnnotations,
} from "./release-shrink.mjs";

// ---------------------------------------------------------------------------------------------------------------
// buildTypeSettings (U1 ~ U4)

/** 계약 r02.1이 고른 `build.gradle`의 모양: release 두 줄 + 그대로인 `bundled`. */
const R02_GRADLE = `plugins { id 'com.android.application' }

android {
  namespace 'com.libitum.host'
  compileSdk 36

  defaultConfig {
    applicationId 'libitum.duru.android'
    minSdk 26
    testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner'
  }

  buildTypes {
    release {
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
    bundled {
      initWith release
      signingConfig signingConfigs.debug
      matchingFallbacks = ['release']
    }
  }

  buildFeatures {
    buildConfig true
  }
}
`;

/** 지금(HEAD)의 모양: minify가 꺼져 있다. */
const HEAD_GRADLE = R02_GRADLE.replace(
  `      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
`,
  "      minifyEnabled false\n",
);

test("U1: release of the r02 build.gradle shape is minified with the default optimize file plus the app rules", () => {
  assert.deepEqual(buildTypeSettings(R02_GRADLE, "release"), {
    declared: true,
    minifyEnabled: true,
    shrinkResources: null,
    proguardFiles: ["default:proguard-android-optimize.txt", "proguard-rules.pro"],
    initWith: null,
  });
});

test("U2: bundled reports initWith release and does not resolve the inherited values", () => {
  assert.deepEqual(buildTypeSettings(R02_GRADLE, "bundled"), {
    declared: true,
    minifyEnabled: null,
    shrinkResources: null,
    proguardFiles: null,
    initWith: "release",
  });
});

test("U3: HEAD shape tells minifyEnabled false apart from no declaration", () => {
  assert.deepEqual(buildTypeSettings(HEAD_GRADLE, "release"), {
    declared: true,
    minifyEnabled: false,
    shrinkResources: null,
    proguardFiles: null,
    initWith: null,
  });
});

test("U4: a commented-out line and a sibling block never leak into release; an unknown name is not declared", () => {
  const gradle = `android {
  buildTypes {
    debug {
      shrinkResources true
      proguardFiles 'debug-only.pro'
    }
    release {
      // minifyEnabled true
      minifyEnabled false
    }
  }
}
`;
  assert.deepEqual(buildTypeSettings(gradle, "release"), {
    declared: true,
    minifyEnabled: false,
    shrinkResources: null,
    proguardFiles: null,
    initWith: null,
  });
  assert.deepEqual(buildTypeSettings(gradle, "debug"), {
    declared: true,
    minifyEnabled: null,
    shrinkResources: true,
    proguardFiles: ["debug-only.pro"],
    initWith: null,
  });
});

test("U4: a build type that is not declared reports declared false with empty values (guard: the stub agrees)", () => {
  assert.deepEqual(buildTypeSettings(R02_GRADLE, "staging"), {
    declared: false,
    minifyEnabled: null,
    shrinkResources: null,
    proguardFiles: null,
    initWith: null,
  });
});

test("U1 edge: shrinkResources, plain quoted files and double-quoted default files are read in order", () => {
  const gradle = `android {
  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile("proguard-android.txt"), 'a.pro', "b.pro"
    }
  }
}
`;
  assert.deepEqual(buildTypeSettings(gradle, "release"), {
    declared: true,
    minifyEnabled: true,
    shrinkResources: true,
    proguardFiles: ["default:proguard-android.txt", "a.pro", "b.pro"],
    initWith: null,
  });
});

// ---------------------------------------------------------------------------------------------------------------
// packagedAbis (U5)

test("U5: only lib/<abi>/*.so entries under lib/ or base/lib/ are counted per ABI", () => {
  assert.deepEqual(
    packagedAbis([
      "base/lib/arm64-v8a/a.so",
      "base/lib/arm64-v8a/b.so",
      "lib/x86_64/c.so",
      "base/assets/x.so",
      "base/lib/arm64-v8a/readme.txt",
    ]),
    { abis: ["arm64-v8a", "x86_64"], libraries: { "arm64-v8a": 2, x86_64: 1 } },
  );
});

test("U5 edge: an archive without native libraries reports none (guard: the stub agrees)", () => {
  assert.deepEqual(packagedAbis(["base/dex/classes.dex", "base/assets/main.lynx.bundle"]), {
    abis: [],
    libraries: {},
  });
});

test("U5 edge: abis come back sorted", () => {
  assert.deepEqual(
    packagedAbis(["lib/x86/z.so", "lib/arm64-v8a/y.so", "lib/armeabi-v7a/x.so"]).abis,
    ["arm64-v8a", "armeabi-v7a", "x86"],
  );
});

// ---------------------------------------------------------------------------------------------------------------
// uncoveredNativeCallbackAnnotations (U6 ~ U8)

const BASE_ANNOTATION = "com.lynx.base.CalledByNative";
const TRACE_ANNOTATION = "com.lynx.trace.CalledByNative";
const TASM_ANNOTATION = "com.lynx.tasm.base.CalledByNative";
const ANNOTATIONS = [BASE_ANNOTATION, TRACE_ANNOTATION, TASM_ANNOTATION];

/** AAR(lynx)의 `proguard.txt`가 쓰는 여러 줄 모양. */
const TASM_ONLY_RULES = `# LYNX START
-keepclasseswithmembers class * {
    @com.lynx.tasm.base.CalledByNative <methods>;
}
-dontwarn android.support.annotation.Keep
`;
const K1 = "-keepclasseswithmembers class * { @com.lynx.base.CalledByNative <methods>; }";
const K2 = "-keepclasseswithmembers class * { @com.lynx.trace.CalledByNative <methods>; }";

test("U6: only the annotations a keep rule names are covered — a shared package prefix does not count", () => {
  assert.deepEqual(
    uncoveredNativeCallbackAnnotations({ annotations: ANNOTATIONS, rules: [TASM_ONLY_RULES] }),
    [BASE_ANNOTATION, TRACE_ANNOTATION],
  );
  // 거꾸로: lynx.base만 지켜도 lynx.tasm.base는 덮이지 않는다.
  assert.deepEqual(
    uncoveredNativeCallbackAnnotations({ annotations: ANNOTATIONS, rules: [K1] }),
    [TRACE_ANNOTATION, TASM_ANNOTATION].sort(),
  );
});

test("U7: -dontwarn and commented-out keep rules do not cover an annotation", () => {
  const rules = [
    `${TASM_ONLY_RULES}
-dontwarn com.lynx.base.CalledByNative
# ${K1}
#${K2}
`,
  ];
  assert.deepEqual(uncoveredNativeCallbackAnnotations({ annotations: ANNOTATIONS, rules }), [
    BASE_ANNOTATION,
    TRACE_ANNOTATION,
  ]);
});

test("U8: K1 and K2 together cover the whole set (guard: the stub agrees; U6 and U7 are the red pair)", () => {
  assert.deepEqual(
    uncoveredNativeCallbackAnnotations({
      annotations: ANNOTATIONS,
      rules: [TASM_ONLY_RULES, `${K1}\n${K2}\n`],
    }),
    [],
  );
});

test("U8 edge: rules spread over several files are all read", () => {
  assert.deepEqual(
    uncoveredNativeCallbackAnnotations({
      annotations: ANNOTATIONS,
      rules: [TASM_ONLY_RULES, K1, K2],
    }),
    [],
  );
});

// ---------------------------------------------------------------------------------------------------------------
// lynxModuleMethods (U9)

const STORAGE_SOURCE = `package com.libitum.host;

import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

public final class StorageModule extends LynxModule {
  private final SharedPreferences preferences;

  public StorageModule(Context context) {
    super(context);
  }

  @LynxMethod public String get(String key) {
    return preferences.getString("libitum." + key, null);
  }

  @LynxMethod public void set(String key, String value) {
    preferences.edit().putString("libitum." + key, value).apply();
  }

  // @LynxMethod public void old() {}

  @LynxMethod
  public void remove(String key) {
    preferences.edit().remove("libitum." + key).apply();
  }

  public void helper() {}
}
`;

test("U9: methods annotated with @LynxMethod (same line or the line before) are listed in source order", () => {
  assert.deepEqual(lynxModuleMethods(STORAGE_SOURCE), ["get", "set", "remove"]);
});

test("U9 edge: a source without the annotation gives an empty list (guard: the stub agrees)", () => {
  assert.deepEqual(
    lynxModuleMethods("public final class HostPaths { static String root() { return null; } }"),
    [],
  );
});

test("U9 edge: overloads of one annotated method are listed once", () => {
  assert.deepEqual(
    lynxModuleMethods(`class A {
  @LynxMethod public void play(String a) {}
  @LynxMethod public void play(String a, int b) {}
  @LynxMethod public void stop() {}
}`),
    ["play", "stop"],
  );
});

// ---------------------------------------------------------------------------------------------------------------
// mappingIssues (U10 ~ U12)

const LYNX_LOG = { className: "com.lynx.base.log.LynxLog", members: ["log", "logByte"] };
const STORAGE = { className: "com.libitum.host.StorageModule", members: ["get", "set", "remove"] };

/** K1이 있는 빌드의 매핑 조각 — 이름이 그대로다. */
const KEPT_MAPPING = `# compiler: R8
# compiler_version: 8.9.35
com.lynx.base.log.LynxLog -> com.lynx.base.log.LynxLog:
    267:267:void log(int,java.lang.String,java.lang.String):267:267 -> log
    281:281:void logByte(int,java.lang.String,byte[]):281:281 -> logByte
    int level -> a
com.libitum.host.StorageModule -> com.libitum.host.StorageModule:
    android.content.SharedPreferences preferences -> a
    17:17:java.lang.String get(java.lang.String):17:17 -> get
    21:21:void set(java.lang.String,java.lang.String):21:21 -> set
    31:31:void remove(java.lang.String):31:31 -> remove
`;

/** K1이 없는 빌드의 모양 — `log` · `logByte`가 지워졌다. 다음 클래스에는 같은 이름의 `log(`가 있다. */
const REMOVED_MAPPING = `# compiler: R8
com.lynx.base.log.LynxLog -> com.lynx.base.log.LynxLog:
    int level -> a
    1:1:void <clinit>():10:10 -> <clinit>
com.lynx.base.log.OtherLog -> r1.a:
    5:5:void log(int,java.lang.String):5:5 -> a
    6:6:void logByte(int,java.lang.String,byte[]):6:6 -> b
com.libitum.host.StorageModule -> com.libitum.host.StorageModule:
    17:17:java.lang.String get(java.lang.String):17:17 -> get
    21:21:void set(java.lang.String,java.lang.String):21:21 -> set
    31:31:void remove(java.lang.String):31:31 -> remove
`;

test("U10: a mapping that keeps the expected names reports no issue (guard: the stub agrees; U11 and U12 are the red pair)", () => {
  assert.deepEqual(mappingIssues(KEPT_MAPPING, [LYNX_LOG, STORAGE]), []);
});

test("U11: members dropped from the expected class block are reported even if another class has the same method name", () => {
  assert.deepEqual(mappingIssues(REMOVED_MAPPING, [LYNX_LOG, STORAGE]), [
    "member-missing com.lynx.base.log.LynxLog.log",
    "member-missing com.lynx.base.log.LynxLog.logByte",
  ]);
});

test("U12: renamed, removed and missing classes and renamed members are reported with their obfuscated names", () => {
  const mapping = `com.libitum.host.HostPaths -> R8$$REMOVED$$CLASS$$285:
com.libitum.host.AudioPlaybackController -> r2.j:
    1:1:void play(java.lang.String):1:1 -> a
com.libitum.host.SomeModule -> com.libitum.host.SomeModule:
    3:3:void foo(int):3:3 -> a
    4:4:void bar():4:4 -> bar
`;
  const expected = [
    { className: "com.libitum.host.HostPaths", members: [] },
    { className: "com.libitum.host.AudioPlaybackController", members: [] },
    { className: "com.libitum.host.NotThere", members: [] },
    { className: "com.libitum.host.SomeModule", members: ["foo", "bar"] },
  ];
  assert.deepEqual(
    mappingIssues(mapping, expected),
    [
      "class-renamed com.libitum.host.HostPaths -> R8$$REMOVED$$CLASS$$285",
      "class-renamed com.libitum.host.AudioPlaybackController -> r2.j",
      "class-missing com.libitum.host.NotThere",
      "member-renamed com.libitum.host.SomeModule.foo -> a",
    ].sort(),
  );
});

test("U12 limit: the check looks at names only — one surviving overload is enough (guard: the stub agrees)", () => {
  const mapping = `com.libitum.host.AudioPlaybackModule -> com.libitum.host.AudioPlaybackModule:
    1:1:void play(java.lang.String):1:1 -> play
    2:2:void play(java.lang.String,int):2:2 -> a
`;
  assert.deepEqual(
    mappingIssues(mapping, [
      { className: "com.libitum.host.AudioPlaybackModule", members: ["play"] },
    ]),
    [],
  );
});

// ---------------------------------------------------------------------------------------------------------------
// survivalIssues (U13 ~ U15) — accessibility 단계 R2: 접근성 클래스의 생존 단언 (mapping-survival.mjs)
//
// 한계: 합성 매핑으로 「매핑에 없을 때 · 제거 표지일 때」 실패함을 보인다. R8이 실제로 지웠을 때 실패하는지는
// 실제 빌드를 바꿔야 알 수 있고(호스트에서 사용처를 끊는 것 — 제품 코드 변경) 이 작업은 하지 않았다.

const TAP_DELEGATE = {
  className: "com.libitum.host.AccessibilityTapBridge$TapDelegate",
  members: ["onInitializeAccessibilityNodeInfo", "performAccessibilityAction"],
};

const ALIVE_RENAMED = `com.libitum.host.AccessibilityTapBridge$TapDelegate -> r2.a:
    1:1:void onInitializeAccessibilityNodeInfo(android.view.View,x.Info):1:1 -> c
    2:2:boolean performAccessibilityAction(android.view.View,int,android.os.Bundle):2:2 -> d
`;

test("U13: a class that survives under a new name with its members is not an issue (mappingIssues would call it class-renamed)", () => {
  assert.deepEqual(survivalIssues(ALIVE_RENAMED, [TAP_DELEGATE]), []);
  assert.deepEqual(mappingIssues(ALIVE_RENAMED, [{ ...TAP_DELEGATE, members: [] }]), [
    "class-renamed com.libitum.host.AccessibilityTapBridge$TapDelegate -> r2.a",
  ]);
});

test("U14: a class missing from the mapping or marked R8$$REMOVED is reported", () => {
  assert.deepEqual(survivalIssues("com.other.Thing -> a.a:\n", [TAP_DELEGATE]), [
    "class-missing com.libitum.host.AccessibilityTapBridge$TapDelegate",
  ]);
  assert.deepEqual(
    survivalIssues(
      "com.libitum.host.AccessibilityTapBridge$TapDelegate -> R8$$REMOVED$$CLASS$$7:\n",
      [TAP_DELEGATE],
    ),
    ["class-removed com.libitum.host.AccessibilityTapBridge$TapDelegate -> R8$$REMOVED$$CLASS$$7"],
  );
});

test("U15: a member dropped from the surviving block is reported by its original name, even if another class has it", () => {
  const mapping = `com.libitum.host.AccessibilityTapBridge$TapDelegate -> r2.a:
    1:1:void onInitializeAccessibilityNodeInfo(android.view.View,x.Info):1:1 -> c
com.other.Thing -> a.b:
    3:3:boolean performAccessibilityAction(int):3:3 -> d
`;
  assert.deepEqual(survivalIssues(mapping, [TAP_DELEGATE]), [
    "member-missing com.libitum.host.AccessibilityTapBridge$TapDelegate.performAccessibilityAction",
  ]);
});
