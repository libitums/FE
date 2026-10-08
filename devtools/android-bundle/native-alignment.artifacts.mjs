// NA2~NA7: android-release-config 빌드 · 산출물 검사 (계약 spec.md §2~§6).
// 산출물이 필요해서 pnpm verify의 `*.test.mjs` 글롭에 들어가지 않는다 (선례 packaged-assets.artifacts.mjs).
//
// 먼저 만든다 (clean 필수, pnpm verify가 같은 워크트리에서 돌고 있으면 끝난 뒤):
//   pnpm bundle:android
//   cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew clean \
//     :app:testDebugUnitTest :app:assembleDebug :app:assembleBundled :app:bundleRelease :app:assembleDebugAndroidTest
// 실행:
//   ANDROID_HOME=~/Library/Android/sdk BUNDLETOOL_JAR=<bundletool-all.jar> \
//     node --test devtools/android-bundle/native-alignment.artifacts.mjs
// BUNDLETOOL_JAR가 없으면 bundletool이 필요한 NA4 · NA5 · NA6(리소스 확인)은 건너뛴다.
// 마지막 테스트(NA6)는 Gradle을 돌려 release AAB를 다시 만든다 — 맨 뒤에 둔 이유.
//
// NA1(게이트 red 증거: native-alignment.gradle만 결선한 중간 상태에서 assembleBundled가 21개 항목으로 실패)은
// 최종 트리에서 재현할 수 없는 구현 중간 단계의 증거라 이 파일에 없다. 같은 사실의 산출물 쪽 증거는 NA3이 지금
// 브랜치의 APK에 대해 「정렬 실패 21개」로 낸다.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { nativeLibraryIssues } from "./elf-page-alignment.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const androidDir = join(root, "apps/android");
const outputs = join(androidDir, "app/build/outputs");
const googleServices = join(androidDir, "app/google-services.json");
const cli = join(root, "devtools/android-bundle/elf-page-alignment.mjs");

const NEW_PACKAGE = "libitum.duru.android";
const EXPECTED_64BIT_LIBRARIES = 31;
const sdk = process.env.ANDROID_HOME ?? join(homedir(), "Library/Android/sdk");
const buildTools = join(sdk, "build-tools/36.0.0");

function findArtifact(dir, ext) {
  const full = join(outputs, dir);
  const found = existsSync(full) ? readdirSync(full).filter((n) => n.endsWith(ext)) : [];
  assert.ok(
    found.length > 0,
    `no ${ext} under apps/android/app/build/outputs/${dir} — build it first`,
  );
  return join(full, found[0]);
}

const names = (archive) =>
  execFileSync("unzip", ["-Z1", archive], { maxBuffer: 1 << 24 })
    .toString("utf8")
    .split("\n")
    .filter(Boolean);
const bytesOf = (archive, name) =>
  new Uint8Array(execFileSync("unzip", ["-p", archive, name], { maxBuffer: 1 << 28 }));

/** 64비트 `.so`만 읽어 nativeLibraryIssues에 넘긴다. */
function alignmentOf(archive) {
  const entries = names(archive)
    .filter((n) => /^(?:base\/)?(?:lib|jni)\/(arm64-v8a|x86_64)\/[^/]+\.so$/.test(n))
    .map((name) => ({ name, bytes: bytesOf(archive, name) }));
  return { entries, ...nativeLibraryIssues(entries) };
}

function gradle(args, { timeout = 30 * 60_000 } = {}) {
  const result = spawnSync("./gradlew", ["--console=plain", ...args], {
    cwd: androidDir,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    timeout,
    env: { ...process.env, ANDROID_HOME: sdk },
  });
  return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const bundletoolJar = () => {
  const jar = process.env.BUNDLETOOL_JAR;
  return jar && existsSync(jar) ? jar : null;
};

/** AAB → 디버그 키로 서명한 universal APK 경로. */
function universalApk(aab, workdir) {
  const jar = bundletoolJar();
  const apks = join(workdir, "universal.apks");
  execFileSync(
    "java",
    [
      "-jar",
      jar,
      "build-apks",
      `--bundle=${aab}`,
      `--output=${apks}`,
      "--mode=universal",
      "--overwrite",
      `--ks=${join(homedir(), ".android/debug.keystore")}`,
      "--ks-pass=pass:android",
      "--ks-key-alias=androiddebugkey",
      "--key-pass=pass:android",
    ],
    { stdio: "pipe" },
  );
  execFileSync("unzip", ["-o", "-q", apks, "universal.apk", "-d", workdir]);
  return join(workdir, "universal.apk");
}

/** ZIP 중앙 디렉터리 → { name, method }. */
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
    const method = buf.readUInt16LE(p + 10);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    entries.push({ name: buf.toString("utf8", p + 46, p + 46 + nameLen), method });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const aapt2 = (...args) =>
  execFileSync(join(buildTools, "aapt2"), args, { maxBuffer: 1 << 26 }).toString("utf8");

const VARIANTS = ["Debug", "Release", "Bundled"];

test("NA2: assemble and bundle of every variant are gated by a native alignment verification task", () => {
  // 세 변형의 APK · AAB 게이트가 결선돼 있고, 지금 만든 산출물이 모두 있다(= 위 빌드 명령이 성공했다).
  for (const [dir, ext] of [
    ["apk/debug", ".apk"],
    ["apk/bundled", ".apk"],
    ["bundle/release", ".aab"],
  ]) {
    findArtifact(dir, ext);
  }
  const missing = [];
  for (const v of VARIANTS) {
    for (const [entry, kind] of [
      [`assemble${v}`, "Apk"],
      [`bundle${v}`, "Bundle"],
    ]) {
      const plan = gradle(["--dry-run", `:app:${entry}`], { timeout: 5 * 60_000 });
      assert.equal(
        plan.status,
        0,
        `gradle --dry-run :app:${entry} failed:\n${plan.output.slice(-1500)}`,
      );
      if (!plan.output.includes(`:app:verify${v}${kind}NativeAlignment`)) {
        missing.push(`${entry} -> verify${v}${kind}NativeAlignment`);
      }
    }
  }
  assert.deepEqual(missing, [], "assemble/bundle tasks not wired to a native alignment gate");
});

test("NA3: 64-bit libraries of the debug and bundled APK and the release AAB are 16 KB aligned (31 each, no libwasm); CLI agrees", () => {
  const archives = [
    findArtifact("apk/debug", ".apk"),
    findArtifact("apk/bundled", ".apk"),
    findArtifact("bundle/release", ".aab"),
  ];
  const problems = [];
  for (const archive of archives) {
    const label = archive.slice(outputs.length + 1);
    const { entries, checked, failures } = alignmentOf(archive);
    if (failures.length > 0) {
      problems.push(
        `${label}: ${failures.length} misaligned of ${checked} (${failures.map((f) => f.name.split("/").slice(-2).join("/")).join(", ")})`,
      );
    }
    if (checked !== EXPECTED_64BIT_LIBRARIES)
      problems.push(`${label}: checked ${checked}, expected ${EXPECTED_64BIT_LIBRARIES}`);
    if (entries.some((e) => e.name.endsWith("/libwasm.so")))
      problems.push(`${label}: still carries libwasm.so`);
  }
  assert.deepEqual(problems, [], "native alignment problems in build outputs");

  for (const archive of archives) {
    const run = spawnSync(process.execPath, [cli, archive], { encoding: "utf8" });
    assert.equal(run.status, 0, `CLI exit code for ${archive}: ${run.stderr || run.stdout}`);
    assert.ok(
      new RegExp(`checked ${EXPECTED_64BIT_LIBRARIES}, failures 0`).test(run.stdout),
      `CLI stdout for ${archive} was: ${JSON.stringify(run.stdout)}`,
    );
  }
});

test("NA4: AAB asks for uncompressed 16 KB-aligned native libraries; universal and bundled APKs pass zipalign -P 16 with STORED .so (guard)", (t) => {
  if (!bundletoolJar()) {
    t.skip("BUNDLETOOL_JAR not set");
    return;
  }
  const aab = findArtifact("bundle/release", ".aab");
  const config = execFileSync("java", [
    "-jar",
    bundletoolJar(),
    "dump",
    "config",
    `--bundle=${aab}`,
  ]).toString("utf8");
  assert.ok(
    /"uncompressNativeLibraries":\s*\{[^}]*"enabled":\s*true/.test(config),
    "uncompressNativeLibraries.enabled is not true",
  );
  assert.ok(
    /"alignment":\s*"PAGE_ALIGNMENT_16K"/.test(config),
    "BundleConfig alignment is not PAGE_ALIGNMENT_16K",
  );

  const dir = mkdtempSync(join(tmpdir(), "na4-"));
  try {
    for (const apk of [universalApk(aab, dir), findArtifact("apk/bundled", ".apk")]) {
      const zipalign = spawnSync(join(buildTools, "zipalign"), ["-c", "-P", "16", "-v", "4", apk], {
        encoding: "utf8",
      });
      assert.equal(
        zipalign.status,
        0,
        `zipalign -c -P 16 failed for ${apk}:\n${(zipalign.stdout + zipalign.stderr).slice(-800)}`,
      );
      const compressed = zipEntries(apk)
        .filter((e) => /^lib\/.+\.so$/.test(e.name) && e.method !== 0)
        .map((e) => e.name);
      assert.deepEqual(compressed, [], `${apk}: lib/**.so entries are not STORED`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("NA5: universal APK badging is libitum.duru.android versionCode 2, compile/targetSdk 36, MainActivity kept; test APK is <id>.test", (t) => {
  if (!bundletoolJar()) {
    t.skip("BUNDLETOOL_JAR not set");
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "na5-"));
  try {
    const badging = aapt2(
      "dump",
      "badging",
      universalApk(findArtifact("bundle/release", ".aab"), dir),
    );
    assert.ok(
      /^package: name='libitum\.duru\.android' versionCode='2' versionName='0\.1\.0'/m.test(
        badging,
      ),
      `package line was: ${badging.match(/^package:.*$/m)?.[0]}`,
    );
    assert.ok(
      /compileSdkVersion='36'/.test(badging),
      `compileSdkVersion was: ${badging.match(/compileSdkVersion='\d+'/)?.[0]}`,
    );
    assert.ok(
      /^targetSdkVersion:'36'$/m.test(badging),
      `targetSdkVersion was: ${badging.match(/^targetSdkVersion:.*$/m)?.[0]}`,
    );
    assert.ok(
      /^launchable-activity: name='com\.libitum\.host\.MainActivity'/m.test(badging),
      "launchable activity",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const testBadging = aapt2("dump", "badging", findArtifact("apk/androidTest/debug", ".apk"));
  assert.ok(
    /^package: name='libitum\.duru\.android\.test'/m.test(testBadging),
    `instrumentation package line was: ${testBadging.match(/^package:.*$/m)?.[0]}`,
  );
});

const VENDOR_COORDINATES = [
  ["org.lynxsdk.lynx", "lynx", "4.0.1"],
  ["org.lynxsdk.lynx", "lynx-base", "4.0.1"],
  ["org.lynxsdk.lynx", "lynx-trace", "4.0.1"],
  ["org.lynxsdk.lynx", "service-api", "4.0.1"],
  ["com.facebook.fresco", "animated-gif", "2.3.0"],
  ["com.facebook.fresco", "imagepipeline-native", "2.3.0"],
  ["com.facebook.fresco", "nativeimagefilters", "2.3.0"],
  ["com.facebook.fresco", "nativeimagetranscoder", "2.3.0"],
  ["com.facebook.fresco", "webpsupport", "2.3.0"],
];

test("NA7: releaseRuntimeClasspath resolves datastore-core-android 1.2.1, has no primjsWasm, and takes the 9 modules from vendor-maven", () => {
  const datastore = gradle(
    [
      ":app:dependencyInsight",
      "--configuration",
      "releaseRuntimeClasspath",
      "--dependency",
      "datastore-core-android",
    ],
    { timeout: 10 * 60_000 },
  );
  assert.ok(
    /^androidx\.datastore:datastore-core-android:1\.2\.1\b/m.test(datastore.output),
    `datastore-core-android resolved as: ${datastore.output.match(/^androidx\.datastore:datastore-core-android:\S+/m)?.[0]}`,
  );

  const wasm = gradle(
    [
      ":app:dependencyInsight",
      "--configuration",
      "releaseRuntimeClasspath",
      "--dependency",
      "primjsWasm",
    ],
    { timeout: 10 * 60_000 },
  );
  assert.doesNotMatch(
    wasm.output,
    /^org\.lynxsdk\.lynx:primjsWasm:/m,
    "primjsWasm is still on releaseRuntimeClasspath",
  );

  const dir = mkdtempSync(join(tmpdir(), "na7-"));
  try {
    const init = join(dir, "resolved.init.gradle");
    writeFileSync(
      init,
      `allprojects { p ->
  p.afterEvaluate {
    if (p.path == ':app') {
      p.tasks.register('printResolvedArtifacts') {
        doLast {
          p.configurations.getByName('releaseRuntimeClasspath').incoming.artifacts.artifacts.each { a ->
            println "ARTIFACT \${a.id.componentIdentifier.displayName} \${a.file.absolutePath}"
          }
        }
      }
    }
  }
}
`,
    );
    const resolved = gradle(["-q", "-I", init, ":app:printResolvedArtifacts"], {
      timeout: 10 * 60_000,
    });
    assert.equal(
      resolved.status,
      0,
      `printResolvedArtifacts failed:\n${resolved.output.slice(-1500)}`,
    );
    const files = new Map(
      [...resolved.output.matchAll(/^ARTIFACT (\S+) (.+)$/gm)].map((m) => [m[1], m[2]]),
    );
    const fromUpstream = [];
    for (const [group, artifact, version] of VENDOR_COORDINATES) {
      const file = files.get(`${group}:${artifact}:${version}`);
      if (file === undefined)
        fromUpstream.push(`${group}:${artifact}:${version} not resolved at all`);
      else if (!file.includes("/apps/android/vendor-maven/"))
        fromUpstream.push(`${group}:${artifact}:${version} <- ${file}`);
    }
    assert.deepEqual(fromUpstream, [], "modules not resolved from apps/android/vendor-maven");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("NA6: release build fails without google-services.json (bundled still builds) and embeds the new package's google_app_id with it", (t) => {
  const parked = `${googleServices}.na6-parked`;
  const hadFile = existsSync(googleServices);
  const downloads = join(homedir(), "Downloads/google-services.json");
  let copied = false;
  try {
    if (hadFile) renameSync(googleServices, parked);

    const bundled = gradle([":app:assembleBundled"]);
    assert.equal(
      bundled.status,
      0,
      `assembleBundled must not need google-services.json:\n${bundled.output.slice(-1500)}`,
    );
    const release = gradle([":app:bundleRelease"]);
    assert.notEqual(release.status, 0, "bundleRelease succeeded without google-services.json");
    assert.ok(
      release.output.includes(
        "Release build needs apps/android/app/google-services.json for libitum.duru.android (Firebase console → Android app). The file is not tracked.",
      ),
      `bundleRelease failed with a different message:\n${release.output.slice(-1500)}`,
    );

    if (hadFile) renameSync(parked, googleServices);
    else if (existsSync(downloads)) {
      copyFileSync(downloads, googleServices);
      copied = true;
    }
    assert.ok(
      existsSync(googleServices),
      "precondition: apps/android/app/google-services.json (or ~/Downloads/google-services.json) is needed for the resource check",
    );
    const config = JSON.parse(readFileSync(googleServices, "utf8"));
    const client = config.client.find(
      (c) => c.client_info.android_client_info.package_name === NEW_PACKAGE,
    );
    assert.ok(client, `precondition: google-services.json has no client for ${NEW_PACKAGE}`);

    const withFile = gradle([":app:bundleRelease"]);
    assert.equal(
      withFile.status,
      0,
      `bundleRelease with google-services.json failed:\n${withFile.output.slice(-1500)}`,
    );
    if (!bundletoolJar()) {
      t.diagnostic("BUNDLETOOL_JAR not set; google_app_id resource check skipped");
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "na6-"));
    try {
      const resources = aapt2(
        "dump",
        "resources",
        universalApk(findArtifact("bundle/release", ".aab"), dir),
      );
      const id = resources.match(/string\/google_app_id[^\n]*\n\s*\([^)]*\)\s+"([^"]+)"/)?.[1];
      assert.equal(
        id,
        client.client_info.mobilesdk_app_id,
        "release google_app_id differs from the Firebase client",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } finally {
    if (hadFile && existsSync(parked)) renameSync(parked, googleServices);
    if (copied) rmSync(googleServices, { force: true });
  }
});
