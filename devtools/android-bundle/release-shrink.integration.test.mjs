// android-abi-minify 정적 결선 검사 (I1~I4). 계약: spec.md `## r02`, 계획: test-plan.md `## r02`.
// 저장소 파일(`apps/android/app/build.gradle` · `proguard-rules.pro` · vendor-maven의 Lynx AAR 넷)만 읽는다.
// Gradle · Android SDK · 빌드 산출물이 없어도 돈다 — pnpm test:android-bundle / pnpm verify 안.
// 산출물(AAB · APK · mapping.txt)이 필요한 A1~A7은 release-shrink.artifacts.mjs에 있다(verify 밖).
//
// I1은 가드다: ABI를 건드리는 선언이 없고 minifyEnabled가 release에만 한 번 있다는 것은 HEAD에서도 참이다.
// 변이(release에 abiFilters · bundled에 minifyEnabled false · debug에 minifyEnabled true …)로만 실패한다.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

import { buildTypeSettings, uncoveredNativeCallbackAnnotations } from "./release-shrink.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const appDir = join(root, "apps/android/app");
const gradlePath = join(appDir, "build.gradle");
const rulesPath = join(appDir, "proguard-rules.pro");
const lynxMaven = join(root, "apps/android/vendor-maven/org/lynxsdk/lynx");
const lynxAars = ["lynx", "lynx-base", "lynx-trace", "service-api"].map((name) => ({
  name,
  path: join(lynxMaven, name, "4.0.1", `${name}-4.0.1.aar`),
}));

// 블록 주석과 줄 끝까지의 `//`를 지운다(URL의 `://`는 남긴다).
function withoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

/** zip(바이트)의 중앙 디렉터리를 읽어 `이름 → 압축 풀린 바이트`를 돌려준다. zip64 · 암호화는 지원하지 않는다. */
function readZip(buffer, filter = () => true) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip 끝 레코드(EOCD)를 찾을 수 없다");
  const entries = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < entries; n += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("zip 중앙 디렉터리가 깨졌다");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!filter(name)) continue;
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressed);
    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, inflateRawSync(data));
    else throw new Error(`지원하지 않는 zip 압축 방식 ${method}: ${name}`);
  }
  return files;
}

/** AAR 하나에서 `CalledByNative` 어노테이션 FQN과 소비자 규칙(`proguard.txt`, 없으면 null)을 읽는다. */
function readAar(path) {
  assert.ok(existsSync(path), `vendor AAR가 없다: ${path}`);
  const files = readZip(
    readFileSync(path),
    (name) => name === "classes.jar" || name === "proguard.txt",
  );
  const classesJar = files.get("classes.jar");
  assert.ok(classesJar, `${path}에 classes.jar가 없다`);
  const annotations = [
    ...readZip(Buffer.from(classesJar), (name) => name.endsWith("CalledByNative.class")).keys(),
  ].map((entry) => entry.replace(/\.class$/, "").replaceAll("/", "."));
  const proguard = files.get("proguard.txt");
  return { annotations, rules: proguard ? Buffer.from(proguard).toString("utf8") : null };
}

const gradleText = () => readFileSync(gradlePath, "utf8");

test("I1: build.gradle declares nothing that touches the ABI set, and minifyEnabled appears once (release only)", () => {
  const body = withoutComments(gradleText());
  assert.equal(
    countOf(body, /\babiFilters\b/g),
    0,
    "abiFilters가 있다 — ABI는 4개 그대로여야 한다",
  );
  assert.equal(countOf(body, /\bndk\s*[.{]/g), 0, "ndk 블록이 있다 — ABI는 4개 그대로여야 한다");
  assert.equal(countOf(body, /\bsplits\b/g), 0, "splits가 있다 — ABI는 4개 그대로여야 한다");
  assert.equal(
    countOf(body, /\bminifyEnabled\b/g),
    1,
    "minifyEnabled는 release 블록에 한 번만 있어야 한다(defaultConfig · debug · bundled에 없다)",
  );
});

test("I1: bundled inherits release (initWith release) and declares no minifyEnabled of its own", () => {
  const bundled = buildTypeSettings(gradleText(), "bundled");
  assert.equal(bundled.declared, true, "buildTypes에 bundled 블록이 없다");
  assert.equal(bundled.initWith, "release");
  assert.equal(bundled.minifyEnabled, null, "bundled가 minifyEnabled를 스스로 선언한다");
});

test("I2: release is minified with the default optimize file plus proguard-rules.pro, without resource shrinking", () => {
  const release = buildTypeSettings(gradleText(), "release");
  assert.deepEqual(
    {
      minifyEnabled: release.minifyEnabled,
      shrinkResources: release.shrinkResources,
      proguardFiles: release.proguardFiles,
    },
    {
      minifyEnabled: true,
      shrinkResources: null,
      proguardFiles: ["default:proguard-android-optimize.txt", "proguard-rules.pro"],
    },
  );
});

test("I3: every CalledByNative annotation in the vendor Lynx AARs is covered by the AAR consumer rules or the app rules", () => {
  const aars = lynxAars.map(({ name, path }) => ({ name, ...readAar(path) }));
  const annotations = [...new Set(aars.flatMap((aar) => aar.annotations))].sort();
  // 빈 통과 방지: 세 어노테이션이 실제로 AAR 안에 있다.
  assert.ok(annotations.length >= 3, `CalledByNative 어노테이션이 3개 미만이다: ${annotations}`);
  for (const expected of [
    "com.lynx.base.CalledByNative",
    "com.lynx.trace.CalledByNative",
    "com.lynx.tasm.base.CalledByNative",
  ]) {
    assert.ok(
      annotations.includes(expected),
      `${expected}가 AAR에서 보이지 않는다: ${annotations}`,
    );
  }

  const rules = aars.flatMap((aar) => (aar.rules === null ? [] : [aar.rules]));
  if (existsSync(rulesPath)) rules.push(readFileSync(rulesPath, "utf8"));
  assert.deepEqual(
    uncoveredNativeCallbackAnnotations({ annotations, rules }),
    [],
    "keep 규칙이 덮지 못한 네이티브 콜백 어노테이션이 있다",
  );
  assert.ok(
    existsSync(rulesPath),
    "apps/android/app/proguard-rules.pro가 없다 — lynx-base · lynx-trace AAR는 소비자 규칙이 없다",
  );
});

/** 계약이 정한 규칙 9줄 — 이 집합과 같아야 한다. 규칙을 더하려면 계약(ADR-0052)을 먼저 고친다. */
const EXPECTED_RULE_LINES = [
  "-dontwarn com.google.gson.Gson",
  "-dontwarn com.google.gson.JsonSyntaxException",
  "-dontwarn com.lynx.markdown.IMarkdownEventListener",
  "-dontwarn com.lynx.markdown.IResourceLoader",
  "-dontwarn com.lynx.markdown.Markdown",
  "-dontwarn com.lynx.markdown.MarkdownValuePack",
  "-dontwarn com.lynx.markdown.ServalMarkdownView",
  "-keepclasseswithmembers class * { @com.lynx.base.CalledByNative <methods>; }",
  "-keepclasseswithmembers class * { @com.lynx.trace.CalledByNative <methods>; }",
];

test("I4: proguard-rules.pro holds exactly the nine contract rule lines (no broad keep, no -dontobfuscate)", () => {
  assert.ok(existsSync(rulesPath), "apps/android/app/proguard-rules.pro가 없다");
  const lines = readFileSync(rulesPath, "utf8")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  assert.deepEqual(lines.slice().sort(), EXPECTED_RULE_LINES.slice().sort());
});
