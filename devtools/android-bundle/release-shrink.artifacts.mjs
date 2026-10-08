// A1~A8: android-abi-minify 빌드 산출물 검사 (계약 spec.md `## r02`, 계획 test-plan.md `## r02`).
// 산출물이 필요해서 pnpm verify의 `*.test.mjs` 글롭에 들어가지 않는다 (선례 native-alignment.artifacts.mjs ·
// packaged-assets.artifacts.mjs). 산출물이 없으면 건너뛰지 않고 「먼저 빌드하라」로 실패한다.
//
// 먼저 만든다 (clean 필수, pnpm verify가 같은 워크트리에서 돌고 있으면 끝난 뒤):
//   PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
//   cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew clean \
//     :app:assembleDebug :app:assembleBundled :app:bundleRelease
// 실행:
//   ANDROID_HOME=~/Library/Android/sdk BUNDLETOOL_JAR=<bundletool-all.jar> \
//     node --test devtools/android-bundle/release-shrink.artifacts.mjs
// BUNDLETOOL_JAR가 없으면 A7(기기 다운로드 크기)만 건너뛰고, 건너뛴 것을 결과에 「건너뜀」으로 적는다 —
// 통과로 세지 않는다. `java`가 필요하다(bundletool).
//
// 판정 로직은 release-shrink.mjs의 순수 함수가 한다. 이 파일은 산출물을 읽어 그 결과를 단언할 뿐이다.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { survivalIssues } from "./mapping-survival.mjs";
import { lynxModuleMethods, mappingIssues, packagedAbis } from "./release-shrink.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const appDir = join(root, "apps/android/app");
const outputs = join(appDir, "build/outputs");
const hostSourceDir = join(appDir, "src/main/java/com/libitum/host");

const ALL_ABIS = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];
const EXPECTED_LIBRARIES = { "arm64-v8a": 16, "armeabi-v7a": 16, x86: 16, x86_64: 15 };
const MAPPING_ENTRY = "BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map";
const MAX_DEX_BYTES = 4_000_000;
const MAX_DOWNLOAD_BYTES = 18_000_000;

function findArtifact(dir, ext) {
  const full = join(outputs, dir);
  const found = existsSync(full) ? readdirSync(full).filter((n) => n.endsWith(ext)) : [];
  assert.ok(
    found.length > 0,
    `no ${ext} under apps/android/app/build/outputs/${dir} — build it first`,
  );
  return join(full, found[0]);
}

/** ZIP 중앙 디렉터리 → [{ name, size }] (size = 압축 풀린 크기). */
function zipEntries(file) {
  const buf = readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.ok(eocd >= 0, `${file} is not a zip`);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    entries.push({ name: buf.toString("utf8", p + 46, p + 46 + nameLen), size });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const entryBytes = (archive, name) =>
  execFileSync("unzip", ["-p", archive, name], { maxBuffer: 1 << 28 });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const bundletoolJar = () => {
  const jar = process.env.BUNDLETOOL_JAR;
  return jar && existsSync(jar) ? jar : null;
};

const dexEntries = (entries, pattern) => entries.filter((e) => pattern.test(e.name));

test("A1: the release AAB carries the same four ABIs as before (arm64-v8a 16, armeabi-v7a 16, x86 16, x86_64 15)", () => {
  const aab = findArtifact("bundle/release", ".aab");
  assert.deepEqual(packagedAbis(zipEntries(aab).map((e) => e.name)), {
    abis: ALL_ABIS,
    libraries: EXPECTED_LIBRARIES,
  });
});

test("A2: the debug APK carries the four ABIs and is not shrunk (two or more dex files)", () => {
  const apk = findArtifact("apk/debug", ".apk");
  const entries = zipEntries(apk);
  assert.deepEqual(packagedAbis(entries.map((e) => e.name)).abis, ALL_ABIS);
  const dex = dexEntries(entries, /^classes\d*\.dex$/);
  assert.ok(dex.length >= 2, `debug APK has ${dex.length} dex file(s); it must stay unminified`);
});

test("A3: the release AAB has one small dex and an R8 mapping", () => {
  const aab = findArtifact("bundle/release", ".aab");
  const entries = zipEntries(aab);
  const dex = dexEntries(entries, /^base\/dex\/[^/]+\.dex$/);
  assert.equal(dex.length, 1, `base/dex has ${dex.length} files: ${dex.map((e) => e.name)}`);
  assert.ok(
    dex[0].size < MAX_DEX_BYTES,
    `${dex[0].name} is ${dex[0].size} bytes, expected < ${MAX_DEX_BYTES}`,
  );
  assert.ok(
    entries.some((e) => e.name === MAPPING_ENTRY),
    `${MAPPING_ENTRY} is missing from the AAB`,
  );
});

test("A4: the names native code and the manifest look up survive R8 (LynxLog, TraceController, host modules, manifest classes)", () => {
  const aab = findArtifact("bundle/release", ".aab");
  assert.ok(
    zipEntries(aab).some((e) => e.name === MAPPING_ENTRY),
    `${MAPPING_ENTRY} is missing from the AAB`,
  );
  const mapping = entryBytes(aab, MAPPING_ENTRY).toString("utf8");

  const hostModules = readdirSync(hostSourceDir)
    .filter((name) => name.endsWith(".java"))
    .sort()
    .flatMap((name) => {
      const members = lynxModuleMethods(readFileSync(join(hostSourceDir, name), "utf8"));
      return members.length === 0
        ? []
        : [{ className: `com.libitum.host.${name.replace(/\.java$/, "")}`, members }];
    });
  // 빈 통과 방지: @LynxMethod 모듈은 11개다(StorageModule · AudioPlaybackModule · …).
  assert.equal(
    hostModules.length,
    11,
    `@LynxMethod host modules: ${hostModules.map((m) => m.className)}`,
  );

  const manifestClasses = [
    "DuruApplication",
    "MainActivity",
    "PushNotificationTapActivity",
    "DuruFirebaseMessagingService",
  ].map((name) => ({ className: `com.libitum.host.${name}`, members: [] }));

  const expected = [
    { className: "com.lynx.base.log.LynxLog", members: ["log", "logByte"] },
    {
      className: "com.lynx.tasm.base.TraceController",
      members: ["generateTracingFileDir", "refreshATraceTags", "setIsTracingStarted"],
    },
    ...hostModules,
    ...manifestClasses,
  ];
  assert.deepEqual(mappingIssues(mapping, expected), []);
});

test("A8: the accessibility classes survive R8 (TapDelegate, completion announcement, Lynx node provider, virtual-node class names)", () => {
  // accessibility 단계 R2 — keep 규칙을 더하지 않고 「살아 있다」를 단언한다. 지금은 R8의 도달 가능성 분석과
  // lynx AAR의 consumer 규칙이 이들을 지킨다. Lynx 판올림이나 규칙 변경으로 지워지면 여기서 드러난다.
  //
  // 한계: 이 단언은 mapping.txt만 본다. 「R8이 실제로 지웠을 때」가 아니라 「매핑에 없거나 제거 표지일 때」 실패한다
  // (구분력은 release-shrink.unit.test.mjs의 합성 매핑으로 확인했다). 인라인된 메서드(AccessibilityTapBridge.sync)는
  // 멤버로 요구하지 않는다.
  const aab = findArtifact("bundle/release", ".aab");
  const mapping = entryBytes(aab, MAPPING_ENTRY).toString("utf8");

  // (a) TapDelegate · LynxAccessibilityNodeProvider는 이름이 바뀌어도(r2.a · …ui.g) 살아 있으면 된다.
  assert.deepEqual(
    survivalIssues(mapping, [
      {
        className: "com.libitum.host.AccessibilityTapBridge$TapDelegate",
        members: ["onInitializeAccessibilityNodeInfo", "performAccessibilityAction"],
      },
      {
        className: "com.lynx.tasm.behavior.ui.LynxAccessibilityNodeProvider",
        members: ["createAccessibilityNodeInfo", "performAction"],
      },
    ]),
    [],
  );

  // (b) 완료 안내: Lynx가 이름 문자열로 부르는 모듈이라 이름이 그대로여야 한다 (mappingIssues가 표현할 수 있다).
  assert.deepEqual(
    mappingIssues(mapping, [
      { className: "com.libitum.host.CompletionAnnouncementModule", members: ["announce"] },
      {
        className: "com.lynx.jsbridge.LynxAccessibilityModule",
        members: ["accessibilityAnnounce"],
      },
    ]),
    [],
  );

  // (c) 가상 노드의 className은 getClass().getName()이 TalkBack에 나가는 문자열이라 이름이 그대로여야 한다.
  assert.deepEqual(
    mappingIssues(
      mapping,
      [
        "com.lynx.tasm.behavior.ui.view.UIView",
        "com.lynx.tasm.behavior.ui.text.UIText",
        "com.lynx.tasm.behavior.ui.text.FlattenUIText",
      ].map((className) => ({ className, members: [] })),
    ),
    [],
  );
});

test("A5: the bundled APK inherits minify from release (one dex file) and keeps the four ABIs", () => {
  const apk = findArtifact("apk/bundled", ".apk");
  const entries = zipEntries(apk);
  assert.deepEqual(packagedAbis(entries.map((e) => e.name)).abis, ALL_ABIS);
  const dex = dexEntries(entries, /^classes\d*\.dex$/);
  assert.equal(dex.length, 1, `bundled APK has ${dex.length} dex files: ${dex.map((e) => e.name)}`);
});

test("A6: the JS bundle inside the release AAB is the one in the assets directory", () => {
  const aab = findArtifact("bundle/release", ".aab");
  const packaged = entryBytes(aab, "base/assets/main.lynx.bundle");
  const source = readFileSync(join(appDir, "src/main/assets/main.lynx.bundle"));
  assert.equal(sha256(packaged), sha256(source));
});

/** bundletool이 읽는 최소 기기 사양. */
const deviceSpec = (abis) => ({
  supportedAbis: abis,
  supportedLocales: ["en-US"],
  deviceFeatures: [],
  glExtensions: [],
  screenDensity: 420,
  sdkVersion: 37,
});

test("A7: the download size of the release AAB is under 18,000,000 bytes for arm64, armeabi-v7a-only, x86_64 and x86 devices", (t) => {
  const jar = bundletoolJar();
  if (jar === null) {
    // 통과로 세지 않는다 — 건너뜀을 결과에 적는다.
    console.log("A7 건너뜀: BUNDLETOOL_JAR가 없다 (기기 다운로드 크기는 확인하지 않았다)");
    t.skip("BUNDLETOOL_JAR not set");
    return;
  }
  const aab = findArtifact("bundle/release", ".aab");
  const workdir = mkdtempSync(join(tmpdir(), "release-shrink-a7-"));
  try {
    const apks = join(workdir, "release.apks");
    execFileSync(
      "java",
      [
        "-jar",
        jar,
        "build-apks",
        `--bundle=${aab}`,
        `--output=${apks}`,
        "--overwrite",
        `--ks=${join(homedir(), ".android/debug.keystore")}`,
        "--ks-pass=pass:android",
        "--ks-key-alias=androiddebugkey",
        "--key-pass=pass:android",
      ],
      { stdio: "pipe", maxBuffer: 1 << 26 },
    );
    const sizes = {};
    for (const [label, abis] of [
      ["arm64-v8a", ["arm64-v8a"]],
      ["armeabi-v7a", ["armeabi-v7a"]],
      ["x86_64", ["x86_64"]],
      ["x86", ["x86"]],
    ]) {
      const spec = join(workdir, `${label}.json`);
      writeFileSync(spec, JSON.stringify(deviceSpec(abis)));
      const out = execFileSync(
        "java",
        ["-jar", jar, "get-size", "total", `--apks=${apks}`, `--device-spec=${spec}`],
        { stdio: "pipe", maxBuffer: 1 << 26 },
      )
        .toString("utf8")
        .trim()
        .split("\n");
      // 마지막 줄은 `MIN,MAX`.
      sizes[label] = Number(out[out.length - 1].split(",").pop());
    }
    const over = Object.entries(sizes).filter(([, bytes]) => !(bytes < MAX_DOWNLOAD_BYTES));
    assert.deepEqual(over, [], `download size >= ${MAX_DOWNLOAD_BYTES}: ${JSON.stringify(sizes)}`);
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
});
