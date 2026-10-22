// airbridge-sdk 추적 파일 정적 검사 (I-S1 ~ I-S9). 결정: docs/adr/0063-airbridge-events.md. 빌드 산출물 없이 pnpm test:android-bundle / verify에서 돈다.
// 파일이 없으면 빈 문자열로 읽어 단언이 실패한다(건너뛰지 않는다).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const selfPath = fileURLToPath(import.meta.url);
const root = join(dirname(selfPath), "..", "..");
const androidApp = join(root, "apps/android/app");
const hostDir = join(androidApp, "src/main/java/com/libitum/host");
const iosDir = join(root, "apps/ios");

const localXcconfigPath = "apps/ios/Config/Airbridge.local.xcconfig";
const localPropertiesPath = "apps/android/app/airbridge.properties";
const oldLocalPaths = ["apps/ios/Config/Meta.local.xcconfig", "apps/android/app/meta.properties"];
const widePatterns = ["apps/ios/Config/*.local.xcconfig", "apps/android/app/*.properties"];

/** 파일을 읽는다. 없으면 빈 문자열 — 단언이 실패로 선다. */
function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const trackedFiles = () => git("ls-files").split("\n").filter(Boolean);
const count = (text, pattern) => (text.match(pattern) ?? []).length;
const stripXmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, "");
const stripCodeComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
const manifest = () => stripXmlComments(read(join(androidApp, "src/main/AndroidManifest.xml")));
const plist = () => stripXmlComments(read(join(iosDir, "Host/Info.plist")));
const assignments = (text) => text.split("\n").filter((line) => /^\s*[\w.]+\s*[=:]/.test(line));

/** 여는 중괄호 바로 뒤 위치에서 짝이 맞는 닫는 중괄호 위치를 찾는다. */
function closingBrace(text, from) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}" && depth-- === 0) return i;
  }
  return -1;
}

/** `position` 앞쪽에서 `position`을 감싼 가장 가까운 블록의 머리 줄을 돌려준다. */
function enclosingHeader(text, position) {
  let depth = 0;
  for (let i = position - 1; i >= 0; i--) {
    if (text[i] === "}") depth++;
    if (text[i] === "{" && depth-- === 0) {
      const lineStart = text.lastIndexOf("\n", i) + 1;
      return text.slice(lineStart, i + 1).trim();
    }
  }
  return "";
}

test("I-S1. 매니페스트: AD_ID 권한 한 줄 · Meta provider 흔적 없음 · Airbridge provider는 제거하지 않음 · 값 없음", () => {
  const text = manifest();
  assert.ok(text.length > 0, "AndroidManifest.xml을 읽을 수 있다");
  assert.equal(
    count(text, /<uses-permission\b[^>]*com\.google\.android\.gms\.permission\.AD_ID/g),
    1,
  );
  assert.equal(count(text, /FacebookInitProvider/g), 0);
  assert.equal(count(text, /com\.facebook\.sdk\./g), 0);
  const airbridgeTags = (text.match(/<[^<>]*Airbridge[^<>]*>/gi) ?? []).filter((tag) =>
    tag.includes("AirbridgeLifecycleProvider"),
  );
  for (const tag of airbridgeTags) {
    assert.ok(
      !/tools:node="remove"/.test(tag),
      `AirbridgeLifecycleProvider를 제거하지 않는다: ${tag}`,
    );
  }
  assert.equal(count(text, /AIRBRIDGE_/g), 0, "값이 매니페스트에 없다");
});

test("I-S2. Gradle: Airbridge 정확 버전 한 줄 · Meta 의존 없음 · buildConfigField 둘 · 저장소는 exclusiveContent 안 io.airbridge 하나", () => {
  const build = stripCodeComments(read(join(androidApp, "build.gradle")));
  assert.ok(build.length > 0, "app/build.gradle을 읽을 수 있다");
  const sdkLines = build.split("\n").filter((line) => line.includes("io.airbridge"));
  assert.equal(sdkLines.length, 1, "io.airbridge 의존은 한 줄");
  assert.match(sdkLines[0], /^\s*implementation\s+['"]io\.airbridge:sdk-android:4\.11\.3['"]\s*$/);
  assert.equal(count(build, /com\.facebook\.android/g), 0);
  for (const key of ["AIRBRIDGE_APP_NAME", "AIRBRIDGE_SDK_TOKEN"]) {
    assert.match(build, new RegExp(`buildConfigField\\s+['"]String['"]\\s*,\\s*['"]${key}['"]`));
  }
  assert.ok(!build.includes("manifestPlaceholders"), "값을 매니페스트에 싣지 않는다");

  const settings = stripCodeComments(read(join(root, "apps/android/settings.gradle")));
  const url = "sdk-download.airbridge.io/maven";
  assert.equal(count(settings, new RegExp(url.replace(/[./]/g, "\\$&"), "g")), 1);
  const urlAt = settings.indexOf(url);
  const blockStart = settings.lastIndexOf("exclusiveContent", urlAt);
  assert.ok(urlAt >= 0 && blockStart >= 0, "저장소 URL이 exclusiveContent 안에 있다");
  const open = settings.indexOf("{", blockStart);
  const close = closingBrace(settings, open + 1);
  assert.ok(close > urlAt, "URL이 그 블록 안에 있다");
  const filter = settings.slice(open + 1, close).match(/filter\s*\{([^{}]*)\}/)?.[1] ?? "";
  assert.match(
    filter.trim(),
    /^includeGroup\(\s*['"]io\.airbridge['"]\s*\)$/,
    "필터는 io.airbridge 그룹 하나",
  );
  const vendorAt = settings.indexOf("vendor-maven");
  const vendorOpen = settings.indexOf("{", settings.lastIndexOf("exclusiveContent", vendorAt));
  const vendorEnd = closingBrace(settings, vendorOpen + 1);
  assert.ok(vendorAt >= 0 && vendorEnd < blockStart, "vendor 블록 뒤");
  assert.ok(!settings.slice(vendorEnd, blockStart).includes("google()"), "사이에 google() 없음");
  assert.ok(settings.indexOf("google()", close) > close, "google() 앞");
});

test("I-S3. Android 호스트: 호출 각 1회 · SDK 직접 참조는 AirbridgeEvents.java에만", () => {
  const activity = stripCodeComments(read(join(hostDir, "MainActivity.java")));
  const application = stripCodeComments(read(join(hostDir, "DuruApplication.java")));
  const wrapper = stripCodeComments(read(join(hostDir, "AirbridgeEvents.java")));
  assert.equal(count(activity, /AirbridgeEvents\.configure\(builder\)/g), 1);
  assert.equal(count(application, /AirbridgeEvents\.start\(/g), 1);
  for (const [name, text] of [
    ["MainActivity", activity],
    ["DuruApplication", application],
  ]) {
    assert.equal(count(text, /co\.ab180/g), 0, `${name}에 SDK 패키지 직접 참조`);
    assert.equal(
      count(text, /\bAirbridge\.(initializeSDK|trackEvent)\b/g),
      0,
      `${name}에 SDK 호출`,
    );
  }
  assert.equal(
    count(wrapper, /\bAirbridge\.initializeSDK\(/g),
    1,
    "초기화는 AirbridgeEvents.java 한 곳",
  );
  assert.ok(
    count(wrapper, /\bAirbridge\.trackEvent\(/g) >= 1,
    "전달은 AirbridgeEvents.java에 있다",
  );
  const others = git("ls-files", "apps/android/app/src/main/java")
    .split("\n")
    .filter((path) => path.endsWith(".java") && !path.endsWith("/AirbridgeEvents.java"));
  for (const path of others) {
    const text = stripCodeComments(read(join(root, path)));
    assert.equal(
      count(text, /\bAirbridge\.(initializeSDK|trackEvent)\b/g),
      0,
      `${path}에 SDK 호출`,
    );
  }
});

test("I-S4. iOS: 추적 문구는 Info.plist에 정확히 1건(ADR-0079) · SKAdNetworkItems · Facebook 접두 키 0건", () => {
  const info = plist();
  const project = read(join(iosDir, "Host.xcodeproj/project.pbxproj"));
  assert.ok(info.length > 0, "Info.plist를 읽을 수 있다");
  assert.ok(project.length > 0, "project.pbxproj를 읽을 수 있다");
  for (const [name, text] of [
    ["Info.plist", info],
    ["project.pbxproj", project],
  ]) {
    // ADR-0079: 추적 허용 문구는 Info.plist에만 한 번 — 빌드 설정(INFOPLIST_KEY_)으로 두 번 들어가지 않는다.
    const expected = name === "Info.plist" ? 1 : 0;
    assert.equal(
      count(text, /<key>NSUserTrackingUsageDescription<\/key>|INFOPLIST_KEY_NSUserTracking/g),
      expected,
      `${name}: 추적 문구`,
    );
    assert.equal(count(text, /SKAdNetworkItems/g), 0, `${name}: SKAdNetworkItems`);
    assert.equal(count(text, /<key>Facebook|INFOPLIST_KEY_Facebook/g), 0, `${name}: Facebook 키`);
  }
});

test("I-S5. 값은 변수로만 받고 추적 파일의 값은 비어 있다", () => {
  const info = plist();
  assert.match(info, /<key>AirbridgeAppName<\/key>\s*<string>\$\(AIRBRIDGE_APP_NAME\)<\/string>/);
  assert.match(info, /<key>AirbridgeSDKToken<\/key>\s*<string>\$\(AIRBRIDGE_SDK_TOKEN\)<\/string>/);

  for (const path of [
    "apps/ios/Config/Airbridge.xcconfig",
    "apps/ios/Config/Airbridge.local.xcconfig.example",
  ]) {
    const text = read(join(root, path));
    assert.match(text, /^AIRBRIDGE_APP_NAME\s*=\s*$/m, `${path}: AIRBRIDGE_APP_NAME은 비어 있다`);
    assert.match(text, /^AIRBRIDGE_SDK_TOKEN\s*=\s*$/m, `${path}: AIRBRIDGE_SDK_TOKEN은 비어 있다`);
  }
  assert.match(
    read(join(root, "apps/ios/Config/Airbridge.xcconfig")),
    /^#include\?\s+"Airbridge\.local\.xcconfig"/m,
  );

  const lines = assignments(read(join(androidApp, "airbridge.properties.example")));
  assert.equal(lines.length, 2, "airbridge.properties.example: 키 둘");
  for (const line of lines) {
    assert.match(line, /^\s*AIRBRIDGE_(APP_NAME|SDK_TOKEN)\s*[=:]\s*$/, `키 이름과 빈 값: ${line}`);
  }
});

test("I-S6. 로컬 값 파일은 무시되고 추적되지 않으며 옛 Meta 경로도 여전히 무시된다", () => {
  for (const path of [localXcconfigPath, localPropertiesPath, ...oldLocalPaths]) {
    assert.doesNotThrow(() => git("check-ignore", "-q", path), `${path}는 무시된다`);
  }
  const tracked = trackedFiles();
  for (const path of [localXcconfigPath, localPropertiesPath, ...oldLocalPaths]) {
    assert.ok(!tracked.includes(path), `${path}는 추적하지 않는다`);
  }
  const ignoreLines = read(join(root, ".gitignore"))
    .split("\n")
    .map((line) => line.trim());
  for (const pattern of [localXcconfigPath, localPropertiesPath, ...widePatterns]) {
    assert.ok(ignoreLines.includes(pattern), `.gitignore에 ${pattern}`);
  }
  for (const pattern of widePatterns) {
    assert.equal(
      git("ls-files", "--", `:(glob)${pattern}`).trim(),
      "",
      `${pattern}에 걸리는 추적 파일`,
    );
  }
});

test("I-S7. Podfile · lock: 일반판 정확 버전 한 줄(ADR-0079) · restricted 없음 · Facebook pod 없음", () => {
  const podfile = read(join(iosDir, "Podfile"))
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  const lock = read(join(iosDir, "Podfile.lock"));
  assert.ok(podfile.length > 0 && lock.length > 0, "Podfile · Podfile.lock을 읽을 수 있다");
  assert.equal(count(podfile, /^\s*pod\s+'airbridge-ios-sdk',\s*'4\.12\.0'\s*$/gm), 1);
  assert.equal(
    count(podfile, /airbridge-ios-sdk-restricted/g),
    0,
    "restricted pod 없음(함께 설치하지 않는다)",
  );
  assert.equal(count(podfile, /FBSDK/g), 0);
  assert.ok(lock.includes("airbridge-ios-sdk (4.12.0)"), "lock에 일반판 4.12.0");
  assert.ok(!lock.includes("airbridge-ios-sdk-restricted"), "lock에 restricted 없음");
  for (const name of ["FBSDKCoreKit", "FBAEMKit", "FBSDKCoreKit_Basics"]) {
    assert.ok(!lock.includes(name), `lock에 ${name}`);
  }
});

test("I-S8. Meta 0건: 추적되는 apps · devtools(이 파일 제외) · .gitignore에 Meta SDK 흔적이 없다", () => {
  // 이 파일 자신에 걸리지 않게 조각으로 만든다.
  const patterns = [
    ["FB", "SDK"],
    ["FB", "AEMKit"],
    ["com.face", "book.android"],
    ["face", "book-core"],
    ["Meta", "AppEvent"],
    ["meta", "AppEvent"],
    ["meta", "-events"],
    ["meta", "-app-events"],
    ["META", "_APP_ID"],
    ["META", "_CLIENT_TOKEN"],
    ["fb_", "mobile_"],
    ["Face", "bookInitProvider"],
    ["com.face", "book.sdk."],
    ["Face", "bookAppID"],
    ["Face", "bookClientToken"],
  ].map((parts) => Buffer.from(parts.join("")));
  const selfRelative = selfPath.slice(root.length + 1);
  const files = trackedFiles().filter(
    (path) =>
      path !== selfRelative &&
      ((path.startsWith("apps/") && !path.endsWith(".md")) ||
        path.startsWith("devtools/") ||
        path === ".gitignore"),
  );
  assert.ok(files.length > 100, "추적 파일 목록을 읽었다");
  const hits = [];
  for (const path of files) {
    let data;
    try {
      data = readFileSync(join(root, path));
    } catch {
      continue;
    }
    for (const pattern of patterns) {
      if (data.includes(pattern)) hits.push(`${path}: ${pattern.toString()}`);
    }
  }
  assert.deepEqual(hits, []);
});

test("I-S9. iOS 조건부 등록 · 시작 자리: 모듈 등록은 isStarted 가드 안, start는 didFinishLaunching의 첫 문장", () => {
  const controller = stripCodeComments(read(join(iosDir, "Host/ViewController.swift")));
  assert.equal(count(controller, /register\(AirbridgeEventsModule\.self\)/g), 1);
  const at = controller.indexOf("register(AirbridgeEventsModule.self)");
  assert.equal(enclosingHeader(controller, at), "if AirbridgeEvents.isStarted {");

  const delegate = stripCodeComments(read(join(iosDir, "Host/AppDelegate.swift")));
  assert.equal(count(delegate, /AirbridgeEvents\.start\(/g), 1);
  const head = delegate.match(/didFinishLaunchingWithOptions[^{]*\{/);
  assert.ok(head, "didFinishLaunchingWithOptions를 찾았다");
  const body = delegate.slice(head.index + head[0].length).trimStart();
  const guard = "if let config = AirbridgeEventsConfig.fromBundle() {";
  assert.ok(body.startsWith(guard), "본문의 첫 문장이 설정 해석이다");
  const inner = body.slice(guard.length, closingBrace(body, guard.length)).trim();
  assert.equal(inner, "AirbridgeEvents.start(config)");
});
