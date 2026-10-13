// meta-sdk 추적 파일 정적 검사 (I-S1 ~ I-S7). 계약: spec.md §5.4 · §5.5 · §5.6, 계획: test-plan.md integration.
// 저장소가 추적하는 호스트 설정 파일을 읽는다. 빌드 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 파일이 없으면 빈 문자열로 읽어 단언이 실패한다(건너뛰지 않는다).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const androidApp = join(root, "apps/android/app");
const hostDir = join(androidApp, "src/main/java/com/libitum/host");
const iosDir = join(root, "apps/ios");

const xcconfigPath = "apps/ios/Config/Meta.xcconfig";
const xcconfigExamplePath = "apps/ios/Config/Meta.local.xcconfig.example";
const localXcconfigPath = "apps/ios/Config/Meta.local.xcconfig";
const localPropertiesPath = "apps/android/app/meta.properties";

/** 파일을 읽는다. 없으면 빈 문자열 — 단언이 실패로 선다. */
function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const count = (text, pattern) => (text.match(pattern) ?? []).length;
const stripXmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, "");
const stripJavaComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
const stripGradleComments = stripJavaComments;

const manifest = () => stripXmlComments(read(join(androidApp, "src/main/AndroidManifest.xml")));
const plist = () => stripXmlComments(read(join(iosDir, "Host/Info.plist")));

test("I-S1. 매니페스트: FacebookInitProvider 제거 · SDK 값 메타데이터 없음 · 자동 로그 켬 · AD_ID 권한 한 줄", () => {
  const text = manifest();
  assert.match(text, /xmlns:tools="http:\/\/schemas\.android\.com\/tools"/);

  const providers = text.match(/<provider\b[^>]*>/g) ?? [];
  const facebook = providers.filter((tag) => tag.includes("FacebookInitProvider"));
  assert.equal(facebook.length, 1, "FacebookInitProvider 선언은 한 번");
  assert.match(facebook[0], /android:name="com\.facebook\.internal\.FacebookInitProvider"/);
  assert.match(facebook[0], /tools:node="remove"/);

  for (const forbidden of ["ApplicationId", "ClientToken", "AutoInitEnabled"]) {
    assert.ok(
      !text.includes(`com.facebook.sdk.${forbidden}`),
      `${forbidden} 메타데이터는 선언하지 않는다`,
    );
  }
  for (const required of ["AutoLogAppEventsEnabled", "AdvertiserIDCollectionEnabled"]) {
    assert.match(
      text,
      new RegExp(
        `<meta-data\\b[^>]*android:name="com\\.facebook\\.sdk\\.${required}"[^>]*android:value="true"`,
      ),
      `${required} 메타데이터가 true로 있다`,
    );
  }
  assert.equal(count(text, /com\.google\.android\.gms\.permission\.AD_ID/g), 1);
  assert.match(
    text,
    /<uses-permission\b[^>]*android:name="com\.google\.android\.gms\.permission\.AD_ID"/,
  );
});

test("I-S2. build.gradle: facebook-core 정확 버전 한 줄 · buildConfigField 둘 · manifestPlaceholders 없음", () => {
  const text = stripGradleComments(read(join(androidApp, "build.gradle")));
  const sdkLines = text.split("\n").filter((line) => line.includes("com.facebook.android"));
  assert.equal(sdkLines.length, 1, "com.facebook.android 의존은 한 줄");
  assert.match(
    sdkLines[0],
    /^\s*implementation\s+['"]com\.facebook\.android:facebook-core:18\.3\.0['"]\s*$/,
  );
  assert.match(text, /buildConfigField\s+['"]String['"]\s*,\s*['"]META_APP_ID['"]/);
  assert.match(text, /buildConfigField\s+['"]String['"]\s*,\s*['"]META_CLIENT_TOKEN['"]/);
  assert.ok(!text.includes("manifestPlaceholders"), "값을 매니페스트에 싣지 않는다");
});

test("I-S3. MainActivity · DuruApplication: MetaAppEvents 호출 각 1회 · SDK 직접 참조 없음 · SDK 호출은 MetaAppEvents.java에만", () => {
  const activity = stripJavaComments(read(join(hostDir, "MainActivity.java")));
  const application = stripJavaComments(read(join(hostDir, "DuruApplication.java")));
  assert.equal(count(activity, /MetaAppEvents\.configure\(builder\)/g), 1);
  assert.equal(count(application, /MetaAppEvents\.start\(/g), 1);
  for (const [name, text] of [
    ["MainActivity", activity],
    ["DuruApplication", application],
  ]) {
    assert.ok(!text.includes("com.facebook.FacebookSdk"), `${name}에 FacebookSdk 직접 참조`);
    assert.ok(!text.includes("AppEventsLogger"), `${name}에 AppEventsLogger 직접 참조`);
  }
  const wrapper = stripJavaComments(read(join(hostDir, "MetaAppEvents.java")));
  assert.match(wrapper, /FacebookSdk/, "SDK 호출은 MetaAppEvents.java에 있다");
});

test("I-S4. iOS: 추적 문구 0건 · 광고 식별자 끔 · 자동 로그 켬 · SKAdNetwork 식별자 둘", () => {
  const info = plist();
  const project = read(join(iosDir, "Host.xcodeproj/project.pbxproj"));
  assert.ok(info.length > 0, "Info.plist를 읽을 수 있다");
  assert.ok(project.length > 0, "project.pbxproj를 읽을 수 있다");
  assert.equal(count(info, /NSUserTrackingUsageDescription/g), 0);
  assert.equal(count(project, /NSUserTrackingUsageDescription/g), 0);
  assert.match(info, /<key>FacebookAdvertiserIDCollectionEnabled<\/key>\s*<false\/>/);
  assert.match(info, /<key>FacebookAutoLogAppEventsEnabled<\/key>\s*<true\/>/);
  const items = info.match(/<key>SKAdNetworkItems<\/key>[\s\S]*?<\/array>/)?.[0] ?? "";
  assert.ok(items.includes("v9wttpbfk9.skadnetwork"), "SKAdNetwork v9wttpbfk9");
  assert.ok(items.includes("n38lu8286q.skadnetwork"), "SKAdNetwork n38lu8286q");
});

test("I-S5. 값은 변수로만 받고 추적 파일의 값은 비어 있다", () => {
  const info = plist();
  assert.match(info, /<key>FacebookAppID<\/key>\s*<string>\$\(META_APP_ID\)<\/string>/);
  assert.match(info, /<key>FacebookClientToken<\/key>\s*<string>\$\(META_CLIENT_TOKEN\)<\/string>/);

  for (const path of [xcconfigPath, xcconfigExamplePath]) {
    const text = read(join(root, path));
    assert.match(text, /^META_APP_ID\s*=\s*$/m, `${path}: META_APP_ID는 비어 있다`);
    assert.match(text, /^META_CLIENT_TOKEN\s*=\s*$/m, `${path}: META_CLIENT_TOKEN은 비어 있다`);
  }
  assert.match(read(join(root, xcconfigPath)), /^#include\?\s+"Meta\.local\.xcconfig"/m);

  const properties = read(join(androidApp, "meta.properties.example"));
  const assignments = properties.split("\n").filter((line) => /^\s*[\w.]+\s*[=:]/.test(line));
  assert.equal(assignments.length, 2, "meta.properties.example: 키 둘");
  for (const line of assignments) {
    assert.match(line, /^\s*[\w.]+\s*[=:]\s*$/, `값이 비어 있다: ${line}`);
  }
});

test("I-S6. 로컬 값 파일 두 경로는 .gitignore에 있고 추적 목록에 없다", () => {
  const ignored = read(join(root, ".gitignore"))
    .split("\n")
    .map((line) => line.trim());
  for (const path of [localXcconfigPath, localPropertiesPath]) {
    assert.ok(ignored.includes(path), `.gitignore에 ${path}`);
  }
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const path of [localXcconfigPath, localPropertiesPath]) {
    assert.ok(!tracked.includes(path), `${path}는 추적하지 않는다`);
  }
});

test("I-S7. Podfile: FBSDKCoreKit 정확 버전 · Login · Share 없음", () => {
  const text = read(join(iosDir, "Podfile"))
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  assert.equal(count(text, /^\s*pod\s+'FBSDKCoreKit',\s*'18\.1\.1'\s*$/gm), 1);
  assert.ok(!text.includes("FBSDKLoginKit"));
  assert.ok(!text.includes("FBSDKShareKit"));
});
