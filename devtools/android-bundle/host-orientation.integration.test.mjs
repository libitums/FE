// android-orientation 정적 결선 검사 (HO1~HO5). 계약: spec.md §5 · §6, 계획: test-plan.md integration.
// 실제 AndroidManifest.xml · MainActivity.java를 읽는다. Gradle 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 빌드 산출물 검사(HB1)는 host-orientation.artifacts.mjs, 기기 계측(IC1~IC8)은 ConfigurationChangeTest.java.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mainActivityConfigIssues } from "./host-config-changes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mainDir = join(root, "apps/android/app/src/main");
const manifestPath = join(mainDir, "AndroidManifest.xml");
const debugManifestPath = join(root, "apps/android/app/src/debug/AndroidManifest.xml");
const mainActivityPath = join(mainDir, "java/com/libitum/host/MainActivity.java");

const stripXmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, "");

/**
 * `//` 줄 주석과 `/* … *\/` 블록 주석을 지운다. 문자열 · 문자 리터럴 안의 `//`(URL)는 건드리지 않는다.
 * 줄 수는 보존하지 않아도 되지만 길이를 줄이지 않도록 공백으로 바꾼다.
 */
function stripJavaComments(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    const ch = source[i];
    if (two === "//") {
      while (i < source.length && source[i] !== "\n") i += 1;
    } else if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      out += " ";
    } else if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") {
          out += source[i];
          i += 1;
        }
        out += source[i] ?? "";
        i += 1;
      }
      out += quote;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** 메서드 시그니처 정규식이 처음 맞는 자리부터 본문 `{ … }`의 안쪽을 돌려준다. 없으면 null. */
function methodBody(source, signature) {
  const found = signature.exec(source);
  if (!found) return null;
  const open = source.indexOf("{", found.index + found[0].length);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

const manifest = stripXmlComments(readFileSync(manifestPath, "utf8"));
const mainActivity = stripJavaComments(readFileSync(mainActivityPath, "utf8"));
const onConfigurationChanged = methodBody(
  mainActivity,
  /\bvoid\s+onConfigurationChanged\s*\(\s*(?:final\s+)?(?:[\w.]+\.)?Configuration\b[^)]*\)/,
);

/** `<activity android:name="<name>" …>` 시작 태그 하나. */
function activityTag(name) {
  const tags = [...manifest.matchAll(/<activity\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => new RegExp(`android:name\\s*=\\s*"${name}"`).test(tag));
  return tags;
}

test("HO1: the real AndroidManifest.xml keeps the MainActivity orientation / configChanges contract (§5)", () => {
  assert.deepEqual(mainActivityConfigIssues(readFileSync(manifestPath, "utf8")), []);
});

test("HO2: MainActivity overrides onConfigurationChanged and forwards screen metrics and insets (§6)", () => {
  assert.ok(
    onConfigurationChanged !== null,
    "MainActivity.java does not override onConfigurationChanged(Configuration)",
  );
  assert.match(
    onConfigurationChanged,
    /super\.onConfigurationChanged\(/,
    "onConfigurationChanged does not call super.onConfigurationChanged(",
  );
  assert.match(
    onConfigurationChanged,
    /updateScreenMetrics\(/,
    "onConfigurationChanged does not hand screen metrics to Lynx (updateScreenMetrics)",
  );
  assert.match(
    onConfigurationChanged,
    /requestApplyInsets\(/,
    "onConfigurationChanged does not re-run the inset listener (requestApplyInsets)",
  );
});

test("HO3: guard — other manifest contracts stay as they are (AC4)", () => {
  const [tapTag, ...otherTaps] = activityTag(".PushNotificationTapActivity");
  assert.ok(tapTag, "PushNotificationTapActivity is not declared");
  assert.deepEqual(otherTaps, [], "PushNotificationTapActivity is declared more than once");
  assert.doesNotMatch(
    tapTag,
    /android:screenOrientation/,
    "PushNotificationTapActivity got screenOrientation",
  );
  assert.doesNotMatch(
    tapTag,
    /android:configChanges/,
    "PushNotificationTapActivity got configChanges",
  );

  const debugManifest = stripXmlComments(readFileSync(debugManifestPath, "utf8"));
  assert.doesNotMatch(
    debugManifest,
    /<activity\b/,
    "src/debug/AndroidManifest.xml declares an <activity",
  );

  const mains = activityTag(".MainActivity");
  assert.equal(mains.length, 1, "MainActivity must be declared exactly once");
  assert.match(
    mains[0],
    /android:launchMode\s*=\s*"singleTask"/,
    "MainActivity launchMode is not singleTask",
  );
  assert.match(mains[0], /android:exported\s*=\s*"true"/, "MainActivity is not exported");
  const mainBlock = manifest.slice(manifest.indexOf(mains[0]));
  const mainEnd = mainBlock.indexOf("</activity>");
  assert.ok(mainEnd > 0, "MainActivity <activity> element is not closed");
  const mainElement = mainBlock.slice(0, mainEnd);
  assert.match(
    mainElement,
    /<data\s+android:scheme\s*=\s*"duru"\s+android:host\s*=\s*"auth-callback"\s*\/>/,
    "duru://auth-callback intent filter is gone from MainActivity",
  );
});

test("HO5: the real manifest declares assetsPaths in MainActivity configChanges and never resourcesUnused (r02-3 B)", () => {
  const [main] = activityTag(".MainActivity");
  assert.ok(main, "MainActivity is not declared");
  const declared = (main.match(/android:configChanges\s*=\s*"([^"]*)"/)?.[1] ?? "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  assert.ok(
    declared.includes("assetsPaths"),
    `MainActivity configChanges does not declare assetsPaths (declared: ${declared.join("|")})`,
  );
  assert.ok(!declared.includes("resourcesUnused"), "resourcesUnused must never be declared");
});

test("HO4: guard — MainActivity renders the template once and onConfigurationChanged never re-creates anything (§6)", () => {
  const renders = mainActivity.match(/\brenderTemplateUrl\(/g) ?? [];
  assert.equal(
    renders.length,
    1,
    "renderTemplateUrl( must appear exactly once in MainActivity.java",
  );
  // 메서드가 아직 없으면 금지 목록은 vacuously 참이다 — 있는지는 HO2가 본다.
  const body = onConfigurationChanged ?? "";
  for (const forbidden of [
    "renderTemplateUrl",
    "new LynxViewBuilder",
    "setContentView",
    "recreate(",
    "updateFontScale",
    "updateColorScheme",
  ]) {
    assert.ok(!body.includes(forbidden), `onConfigurationChanged must not call ${forbidden}`);
  }
});
