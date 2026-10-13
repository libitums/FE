import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gradle = await readFile(join(root, "apps/android/app/build.gradle"), "utf8");

// 주석 줄은 결선이 아니다 — 지운 뒤 본문만 본다.
const body = gradle
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");

test("GW1: host audio is not wired through the legacy sourceSets assets.srcDir", () => {
  assert.doesNotMatch(
    body,
    /assets\.srcDir\(/,
    "build.gradle still registers a generated dir with sourceSets assets.srcDir(...): that path never carries the sync task dependency to merge<V>Assets/bundle",
  );
});

test("GW2: variants add the generated dir via addGeneratedSourceDirectory from both ios sources", () => {
  assert.match(body, /addGeneratedSourceDirectory/, "addGeneratedSourceDirectory is not used");
  assert.match(body, /ios\/Host\/audio/, "ios/Host/audio is not a source of the generated assets");
  assert.match(body, /ios\/Host\/sfx/, "ios/Host/sfx is not a source of the generated assets");
});

test("GW3: m4a and mp3 are both kept uncompressed (openFd needs STORED entries)", () => {
  const match = body.match(/noCompress\s*\+?=\s*\[([^\]]*)\]/);
  assert.ok(match, "androidResources.noCompress is not declared");
  assert.match(match[1], /['"]m4a['"]/, "noCompress lacks 'm4a'");
  assert.match(match[1], /['"]mp3['"]/, "noCompress lacks 'mp3'");
});

// ---- 크래시 리포팅(Sentry) 결선 ----

const android = join(root, "apps/android");
const hostDir = join(android, "app/src/main/java/com/libitum/host");

// 파일이 아직 없어도 읽기 실패가 아니라 단언 실패로 떨어지게 빈 문자열을 돌려준다.
async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function withoutComments(text) {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

// `open` 위치에서 시작하는 짝이 맞는 괄호 안쪽 문자열.
function balancedFrom(text, openIndex) {
  const pairs = { "{": "}", "[": "]", "(": ")" };
  const open = text[openIndex];
  const close = pairs[open];
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === open) depth += 1;
    if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return "";
}

function blockAfter(text, pattern) {
  const match = pattern.exec(text);
  if (!match) return null;
  return balancedFrom(text, match.index + match[0].length - 1);
}

const sentryGradle = withoutComments(await readOptional(join(android, "app/sentry.gradle")));
const rootGradle = withoutComments(await readOptional(join(android, "build.gradle")));

test("GW-S1: sentry-android-core is pinned exactly and no heavier Sentry artifact or plugin is wired", () => {
  assert.match(
    body,
    /['"]io\.sentry:sentry-android-core:8\.60\.0['"]/,
    "build.gradle lacks the exact io.sentry:sentry-android-core:8.60.0 pin",
  );
  assert.doesNotMatch(body, /sentry-android-core:[^'"]*[+\[\](,]/, "sentry-android-core version is not exact");
  assert.ok(sentryGradle.length > 0, "app/sentry.gradle is missing or empty");
  for (const [name, text] of [
    ["app/build.gradle", body],
    ["app/sentry.gradle", sentryGradle],
    ["build.gradle", rootGradle],
  ]) {
    assert.doesNotMatch(text, /io\.sentry:sentry-android['"]/, `${name} wires the sentry-android bundle`);
    assert.doesNotMatch(text, /sentry-android-ndk/, `${name} wires sentry-android-ndk`);
    assert.doesNotMatch(text, /sentry-android-replay/, `${name} wires sentry-android-replay`);
    assert.doesNotMatch(text, /io\.sentry\.android\.gradle/, `${name} applies the Sentry Gradle plugin`);
  }
});

test("GW-S2: SENTRY_DSN defaults to empty and debug never overrides it", () => {
  const defaultConfig = blockAfter(body, /defaultConfig\s*\{/);
  assert.ok(defaultConfig !== null, "defaultConfig block not found");
  assert.match(
    defaultConfig,
    /buildConfigField\s+['"]String['"]\s*,\s*['"]SENTRY_DSN['"]\s*,\s*['"]\\?"\\?"['"]/,
    "defaultConfig lacks buildConfigField 'String', 'SENTRY_DSN', '\"\"'",
  );
  const buildTypes = blockAfter(body, /buildTypes\s*\{/);
  assert.ok(buildTypes !== null, "buildTypes block not found");
  const debug = blockAfter(buildTypes, /\bdebug\s*\{/);
  if (debug !== null) {
    assert.doesNotMatch(debug, /SENTRY_DSN/, "buildTypes.debug assigns SENTRY_DSN");
  }
});

test("GW-S3: the mapping upload is gated on token, org and project and keeps the token off the command line", () => {
  assert.ok(sentryGradle.length > 0, "app/sentry.gradle is missing or empty");
  const gate = blockAfter(sentryGradle, /onlyIf\s*\{/);
  assert.ok(gate !== null, "uploadSentryMappingRelease has no onlyIf gate");
  assert.match(gate, /token/i, "onlyIf does not look at the auth token");
  assert.match(gate, /org/i, "onlyIf does not look at the organization");
  assert.match(gate, /project/i, "onlyIf does not look at the project");
  const commandIndex = sentryGradle.search(/commandLine\s*[=(\[]/);
  assert.ok(commandIndex >= 0, "upload task has no commandLine");
  const openIndex = sentryGradle.slice(commandIndex).search(/[(\[]/) + commandIndex;
  const command = balancedFrom(sentryGradle, openIndex);
  assert.ok(command.length > 0, "commandLine arguments are empty");
  assert.doesNotMatch(command, /token/i, "the auth token is placed in the command-line arguments");
  assert.match(
    sentryGradle,
    /rootProject\.file\(\s*['"]sentry\.properties['"]\s*\)[\s\S]{0,200}?\.exists\(\)/,
    "sentry.properties is not guarded by exists()",
  );
});

test("GW-S4: auto-init is off and both Sentry providers are removed from the manifest", async () => {
  const manifest = await readOptional(join(android, "app/src/main/AndroidManifest.xml"));
  const metaData = manifest.match(/<meta-data[^>]*io\.sentry\.auto-init[^>]*>/);
  assert.ok(metaData, "manifest lacks the io.sentry.auto-init meta-data");
  assert.match(metaData[0], /android:value\s*=\s*"false"/, "io.sentry.auto-init is not false");
  for (const provider of ["SentryInitProvider", "SentryPerformanceProvider"]) {
    const tag = manifest.match(new RegExp(`<provider[^>]*${provider}[^>]*>`));
    assert.ok(tag, `manifest does not declare ${provider} for removal`);
    assert.match(tag[0], /tools:node\s*=\s*"remove"/, `${provider} is not tools:node="remove"`);
  }
});

test("GW-S5: the Sentry properties file is not tracked", async () => {
  const ignore = await readOptional(join(root, ".gitignore"));
  const lines = ignore.split("\n").map((line) => line.trim());
  assert.ok(lines.includes("apps/android/sentry.properties"), ".gitignore lacks apps/android/sentry.properties");
});

test("GW-S6: crash reporting starts before Fresco and the Lynx error callback is wired", async () => {
  const application = withoutComments(await readOptional(join(hostDir, "DuruApplication.java")));
  const startAt = application.indexOf("CrashReporting.start(this)");
  const frescoAt = application.indexOf("Fresco.initialize");
  assert.ok(startAt >= 0, "DuruApplication does not call CrashReporting.start(this)");
  assert.ok(frescoAt >= 0, "DuruApplication lost Fresco.initialize");
  assert.ok(startAt < frescoAt, "CrashReporting.start(this) must come before Fresco.initialize");
  const activity = withoutComments(await readOptional(join(hostDir, "MainActivity.java")));
  assert.match(activity, /onReceivedError\(\s*LynxError/, "MainActivity lacks an onReceivedError(LynxError ...) override");
  assert.equal(activity.match(/registerModule\(/g)?.length ?? 0, 11, "registerModule( call count changed from 11");
});

test("GW-S7: only CrashEventPolicy and CrashReporting import io.sentry in host sources", async () => {
  const allowed = ["CrashEventPolicy.java", "CrashReporting.java"];
  const importers = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith(".java") && /^\s*import\s+io\.sentry/m.test(await readFile(path, "utf8"))) {
        importers.push(entry.name);
      }
    }
  }
  await walk(join(android, "app/src/main/java"));
  assert.deepEqual(importers.sort(), allowed);
});
