// android-release-config 정적 · 파일 검사 (RC1~RC7 · VM1~VM4 · PK1). 계약: spec.md §2~§6.
// Gradle 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 산출물 · 빌드 검사(NA1~NA7)는 native-alignment.artifacts.mjs.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { nativeLibraryIssues } from "./elf-page-alignment.mjs";
import { staleAndroidPackageReferences } from "./package-references.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const androidDir = join(root, "apps/android");
const appDir = join(androidDir, "app");
const vendorDir = join(androidDir, "vendor-maven");

// Play Console에 이미 올라간 versionCode.
const PLAY_UPLOADED_VERSION_CODE = 1;

/** 주석 줄은 결선이 아니다 — 지운 뒤 본문만 본다 (선례 gradle-wiring.test.mjs). */
const stripComments = (text) =>
  text
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

const readBody = (path) => stripComments(readFileSync(path, "utf8"));
const appGradle = readBody(join(appDir, "build.gradle"));
const settingsGradle = readBody(join(androidDir, "settings.gradle"));

/** `open` 위치의 `{`에 짝이 되는 `}` 직전까지의 본문. */
function blockAt(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return text.slice(open + 1);
}

/** `header {` 형태의 첫 블록 본문. 없으면 null. */
function blockOf(text, header) {
  const found = header.exec(text);
  if (!found) return null;
  const open = text.indexOf("{", found.index + found[0].length - 1);
  return open === -1 ? null : blockAt(text, open);
}

test("RC1: applicationId is libitum.duru.android once, namespace stays com.libitum.host, no suffix or testApplicationId", () => {
  const ids = [...appGradle.matchAll(/^\s*applicationId\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  assert.deepEqual(ids, ["libitum.duru.android"], "applicationId must be declared exactly once");
  assert.match(
    appGradle,
    /^\s*namespace\s+['"]com\.libitum\.host['"]/m,
    "namespace must stay com.libitum.host",
  );
  assert.doesNotMatch(appGradle, /applicationIdSuffix/, "applicationIdSuffix must not be set");
  assert.doesNotMatch(
    appGradle,
    /testApplicationId/,
    "testApplicationId must not be set (AGP default is <applicationId>.test)",
  );
});

test("RC2: compileSdk 36, targetSdk 36, minSdk 26", () => {
  const value = (key) => appGradle.match(new RegExp(`^\\s*${key}\\s+(\\d+)\\s*$`, "m"))?.[1];
  assert.equal(value("compileSdk"), "36", "compileSdk");
  assert.equal(value("targetSdk"), "36", "targetSdk");
  assert.equal(value("minSdk"), "26", "minSdk");
});

test("RC3: versionCode is an integer greater than the one already uploaded to Play", () => {
  const raw = appGradle.match(/^\s*versionCode\s+(\S+)\s*$/m)?.[1];
  assert.ok(raw !== undefined, "versionCode is not declared");
  assert.match(
    raw,
    /^\d+$/,
    `versionCode must be an integer literal (manual bump, spec §4), got ${raw}`,
  );
  assert.ok(
    Number(raw) > PLAY_UPLOADED_VERSION_CODE,
    `versionCode ${raw} must exceed the Play-uploaded ${PLAY_UPLOADED_VERSION_CODE}`,
  );
});

const VENDOR_MODULES = [
  ["org.lynxsdk.lynx", "lynx"],
  ["org.lynxsdk.lynx", "lynx-base"],
  ["org.lynxsdk.lynx", "lynx-trace"],
  ["org.lynxsdk.lynx", "service-api"],
  ["com.facebook.fresco", "animated-gif"],
  ["com.facebook.fresco", "imagepipeline-native"],
  ["com.facebook.fresco", "nativeimagefilters"],
  ["com.facebook.fresco", "nativeimagetranscoder"],
  ["com.facebook.fresco", "webpsupport"],
];

test("RC4: settings.gradle resolves exactly the 9 rebuilt modules from vendor-maven, exclusively and before google()/mavenCentral()", () => {
  const dependencyResolution = settingsGradle.slice(
    settingsGradle.indexOf("dependencyResolutionManagement"),
  );
  assert.ok(
    dependencyResolution.startsWith("dependencyResolutionManagement"),
    "dependencyResolutionManagement block missing",
  );
  const exclusive = dependencyResolution.search(/exclusiveContent\s*\{/);
  assert.ok(exclusive >= 0, "settings.gradle has no exclusiveContent block");
  const exclusiveBody = blockOf(dependencyResolution, /exclusiveContent\s*\{/);
  assert.match(exclusiveBody, /vendor-maven/, "exclusiveContent does not point at vendor-maven");
  const included = [
    ...exclusiveBody.matchAll(/includeModule\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g),
  ]
    .map((m) => `${m[1]}:${m[2]}`)
    .sort();
  assert.deepEqual(
    included,
    VENDOR_MODULES.map(([g, a]) => `${g}:${a}`).sort(),
    "includeModule set differs from spec §5.4",
  );
  const google = dependencyResolution.search(/\bgoogle\(\)/);
  const central = dependencyResolution.search(/\bmavenCentral\(\)/);
  assert.ok(
    google >= 0 && central >= 0,
    "google()/mavenCentral() missing from dependencyResolutionManagement",
  );
  assert.ok(
    exclusive < google && exclusive < central,
    "exclusiveContent must come before google() and mavenCentral()",
  );
});

test("RC5: primjsWasm excluded for every configuration, datastore-core-android floor 1.2.1 in constraints", () => {
  const configure = blockOf(appGradle, /configurations\.configureEach\s*\{/);
  assert.ok(configure !== null, "configurations.configureEach block missing");
  assert.match(
    configure,
    /exclude\s+group:\s*['"]org\.lynxsdk\.lynx['"]\s*,\s*module:\s*['"]primjsWasm['"]/,
    "primjsWasm is not excluded inside configurations.configureEach",
  );
  const constraints = blockOf(appGradle, /constraints\s*\{/);
  assert.ok(constraints !== null, "constraints block missing");
  assert.match(
    constraints,
    /implementation\(?\s*['"]androidx\.datastore:datastore-core-android:1\.2\.1['"]/,
    "constraints lack androidx.datastore:datastore-core-android:1.2.1",
  );
});

test("RC6: gradle files define no signing config, secrets or keystore; release has no signingConfig (guard)", () => {
  const files = [join(androidDir, "build.gradle"), join(androidDir, "settings.gradle")];
  for (const name of readdirSync(appDir))
    if (name.endsWith(".gradle")) files.push(join(appDir, name));
  for (const file of files) {
    const text = readBody(file);
    const where = relative(root, file);
    assert.doesNotMatch(text, /signingConfigs\s*\{/, `${where} defines signingConfigs`);
    assert.doesNotMatch(text, /storePassword|keyPassword/, `${where} contains a signing password`);
    assert.doesNotMatch(text, /\.jks\b/, `${where} references a .jks keystore`);
  }
  const buildTypes = blockOf(appGradle, /buildTypes\s*\{/);
  assert.ok(buildTypes !== null, "buildTypes block missing");
  const release = blockOf(buildTypes, /(?:^|\n)\s*release\s*\{/);
  assert.ok(release !== null, "release buildType missing");
  assert.doesNotMatch(release, /signingConfig/, "release buildType must stay unsigned (spec §4)");
});

test("RC7: native-alignment.gradle is applied and called per variant, verifyReleaseFirebaseConfig hangs on preReleaseBuild only", () => {
  assert.match(
    appGradle,
    /apply\s+from:\s*['"]native-alignment\.gradle['"]/,
    "build.gradle does not apply native-alignment.gradle",
  );
  assert.ok(
    existsSync(join(appDir, "native-alignment.gradle")),
    "app/native-alignment.gradle does not exist",
  );
  assert.match(
    appGradle,
    /registerNativeAlignmentChecks\(/,
    "build.gradle never calls registerNativeAlignmentChecks(",
  );
  assert.match(
    appGradle,
    /tasks\.register\(\s*['"]verifyReleaseFirebaseConfig['"]/,
    "verifyReleaseFirebaseConfig task is not registered",
  );
  assert.match(
    appGradle,
    /Release build needs apps\/android\/app\/google-services\.json for libitum\.duru\.android/,
    "verifyReleaseFirebaseConfig lacks the contract message (spec §2.4)",
  );

  // verifyReleaseFirebaseConfig를 dependsOn/finalizedBy로 거는 줄마다, 그 줄을 감싼 블록의 머리가 preReleaseBuild뿐이어야 한다.
  const uses = [
    ...appGradle.matchAll(
      /(?:dependsOn|finalizedBy|mustRunAfter)[^\n]*verifyReleaseFirebaseConfig/g,
    ),
  ];
  assert.ok(uses.length > 0, "nothing makes preReleaseBuild depend on verifyReleaseFirebaseConfig");
  for (const use of uses) {
    let depth = 0;
    let open = -1;
    for (let i = use.index; i >= 0; i -= 1) {
      if (appGradle[i] === "}") depth += 1;
      else if (appGradle[i] === "{") {
        if (depth === 0) {
          open = i;
          break;
        }
        depth -= 1;
      }
    }
    assert.ok(
      open >= 0,
      "verifyReleaseFirebaseConfig dependency is not inside a task-selecting block",
    );
    const headStart = appGradle.lastIndexOf("\n", appGradle.lastIndexOf("\n", open - 1) - 1);
    const head = appGradle.slice(headStart + 1, open);
    assert.match(
      head,
      /preReleaseBuild/,
      `verifyReleaseFirebaseConfig is wired under: ${head.trim()}`,
    );
    assert.doesNotMatch(
      head,
      /preBundledBuild|preDebugBuild|\.all\b|matching\s*\{\s*true/,
      `verifyReleaseFirebaseConfig must not hang on other variants: ${head.trim()}`,
    );
  }
});

// ---- vendor-maven (VM1~VM4) ----

const VENDOR_AARS = VENDOR_MODULES.map(([group, artifact]) => {
  const version = group === "org.lynxsdk.lynx" ? "4.0.1" : "2.3.0";
  const dir = join(vendorDir, ...group.split("."), artifact, version);
  return {
    group,
    artifact,
    version,
    dir,
    aar: join(dir, `${artifact}-${version}.aar`),
    pom: join(dir, `${artifact}-${version}.pom`),
  };
});

function zipNames(file) {
  return execFileSync("unzip", ["-Z1", file], { maxBuffer: 1 << 24 })
    .toString("utf8")
    .split("\n")
    .filter(Boolean);
}

function zipBytes(file, name) {
  return new Uint8Array(execFileSync("unzip", ["-p", file, name], { maxBuffer: 1 << 28 }));
}

function assertAarsExist() {
  const missing = VENDOR_AARS.filter((m) => !existsSync(m.aar)).map((m) => relative(root, m.aar));
  assert.deepEqual(missing, [], `vendor-maven is missing ${missing.length} of 9 AARs`);
}

test("VM1: every vendor-maven AAR has 0 misaligned 64-bit libraries, 20 checked in total", () => {
  assertAarsExist();
  let checked = 0;
  const failures = [];
  for (const m of VENDOR_AARS) {
    const entries = zipNames(m.aar)
      .filter((name) => /^jni\/(arm64-v8a|x86_64)\/[^/]+\.so$/.test(name))
      .map((name) => ({ name, bytes: zipBytes(m.aar, name) }));
    const result = nativeLibraryIssues(entries);
    checked += result.checked;
    for (const f of result.failures)
      failures.push(`${m.artifact}:${f.name} ${f.issues.map((i) => i.kind).join(",")}`);
  }
  assert.deepEqual(failures, [], "misaligned libraries in vendor-maven");
  assert.equal(checked, 20, "total 64-bit .so checked across the 9 AARs");
});

test("VM2: each AAR is a complete AAR with a matching pom; upstream 32-bit libraries are kept", () => {
  assertAarsExist();
  for (const m of VENDOR_AARS) {
    const names = zipNames(m.aar);
    assert.ok(names.includes("classes.jar"), `${m.artifact}: classes.jar missing`);
    assert.ok(names.includes("AndroidManifest.xml"), `${m.artifact}: AndroidManifest.xml missing`);
    assert.ok(existsSync(m.pom), `${m.artifact}: ${relative(root, m.pom)} missing`);
    assert.ok(
      names.some((name) => name.startsWith("jni/armeabi-v7a/") && name.endsWith(".so")),
      `${m.artifact}: jni/armeabi-v7a/ entries were dropped (32-bit must stay as upstream)`,
    );
  }
  const lynxArm32 = VENDOR_AARS.filter(
    (m) =>
      m.group === "org.lynxsdk.lynx" &&
      zipNames(m.aar).some((n) => n.startsWith("jni/armeabi-v7a/")),
  );
  const frescoArm32 = VENDOR_AARS.filter(
    (m) =>
      m.group === "com.facebook.fresco" &&
      zipNames(m.aar).some((n) => n.startsWith("jni/armeabi-v7a/")),
  );
  assert.equal(lynxArm32.length, 4, "Lynx AARs that keep armeabi-v7a");
  assert.equal(frescoArm32.length, 5, "Fresco AARs that keep armeabi-v7a");
});

test("VM4: SHA256SUMS matches every committed vendor-maven file and no unlisted .aar/.pom exists", () => {
  const listFile = join(vendorDir, "SHA256SUMS");
  assert.ok(existsSync(listFile), "vendor-maven/SHA256SUMS missing");
  const listed = new Map();
  for (const line of readFileSync(listFile, "utf8").split("\n").filter(Boolean)) {
    const m = /^([0-9a-f]{64}) [ *](\S+)$/.exec(line);
    assert.ok(m, `SHA256SUMS line is not "<sha256>  <path>": ${line}`);
    assert.ok(!listed.has(m[2]), `SHA256SUMS lists ${m[2]} twice`);
    listed.set(m[2], m[1]);
  }
  const mismatched = [];
  for (const [path, want] of listed) {
    const file = join(vendorDir, path);
    if (!existsSync(file)) {
      mismatched.push(`${path}: listed but missing`);
      continue;
    }
    const got = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (got !== want) mismatched.push(`${path}: sha256 ${got}, listed ${want}`);
  }
  assert.deepEqual(mismatched, [], "SHA256SUMS does not match the files");

  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  const onDisk = walk(vendorDir)
    .map((file) => relative(vendorDir, file).split("\\").join("/"))
    .filter((path) => /\.(aar|pom)$/.test(path));
  const unlisted = onDisk.filter((path) => !listed.has(path));
  assert.deepEqual(unlisted, [], "binaries or POMs in vendor-maven that SHA256SUMS does not list");
  assert.equal(listed.size, 18, "9 AARs + 9 POMs listed");
  assert.deepEqual(
    [...listed.keys()],
    [...listed.keys()].sort(),
    "SHA256SUMS entries are sorted by path",
  );
});

test("VM3: licences, notice, patches and an executable rebuild.sh are checked in; patches set common-page-size=16384", () => {
  const required = [
    "LYNX-LICENSE",
    "LYNX-NOTICE",
    "FRESCO-LICENSE",
    "patches/lynx-4.0.1.patch",
    "patches/fresco-2.3.0.patch",
    "rebuild.sh",
  ];
  const missing = required.filter((name) => !existsSync(join(vendorDir, name)));
  assert.deepEqual(missing, [], "vendor-maven files missing");
  assert.ok(
    (statSync(join(vendorDir, "rebuild.sh")).mode & 0o111) !== 0,
    "rebuild.sh is not executable",
  );
  for (const patch of ["patches/lynx-4.0.1.patch", "patches/fresco-2.3.0.patch"]) {
    assert.match(
      readFileSync(join(vendorDir, patch), "utf8"),
      /common-page-size=16384/,
      `${patch} lacks common-page-size=16384`,
    );
  }
});

// ---- 낡은 패키지 참조 (PK1) ----

function surfaceFiles() {
  const pick = (dir, test) =>
    existsSync(join(root, dir))
      ? readdirSync(join(root, dir))
          .filter(test)
          .sort()
          .map((name) => join(dir, name))
      : [];
  return [
    ...pick("e2e", (n) => /^android-.*\.yaml$/.test(n)),
    ...pick("devtools/android-maestro", (n) => n.endsWith(".sh")),
    ...pick("apps/android", (n) => n.endsWith(".sh")),
  ];
}

test("PK1: no Android execution-surface file (Maestro yaml, runner and host scripts) still names the old package", () => {
  const files = surfaceFiles();
  assert.ok(
    files.length >= 25,
    `expected the Android execution surface (>= 25 files), found ${files.length}`,
  );
  const stale = [];
  for (const file of files) {
    for (const hit of staleAndroidPackageReferences(readFileSync(join(root, file), "utf8"))) {
      stale.push(`${file}:${hit.line}:${hit.column} ${hit.text}`);
    }
  }
  assert.deepEqual(stale, [], `${stale.length} stale com.libitum.host references`);
});
