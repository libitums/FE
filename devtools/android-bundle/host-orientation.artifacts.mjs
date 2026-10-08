// HB1: android-orientation 빌드 산출물 검사 (계약 spec.md §5.1 · test-plan.md 「빌드 산출물」).
// 산출물이 필요해서 pnpm verify의 `*.test.mjs` 글롭에 들어가지 않는다 (선례 native-alignment.artifacts.mjs).
//
// 먼저 만든다 (기기 불필요):
//   pnpm bundle:android
//   cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew :app:assembleBundled
// 실행:
//   ANDROID_HOME=~/Library/Android/sdk node --test devtools/android-bundle/host-orientation.artifacts.mjs
//
// 읽는 것: `aapt2 dump xmltree --file AndroidManifest.xml app/build/outputs/apk/bundled/app-bundled.apk` (병합된 매니페스트).
// APK 이름이 AGP 기본과 다르면 app/build/outputs/apk/bundled/ 아래의 첫 .apk를 쓴다.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const apkDir = join(root, "apps/android/app/build/outputs/apk/bundled");
const sdk = process.env.ANDROID_HOME ?? join(homedir(), "Library/Android/sdk");
const aapt2 = join(sdk, "build-tools/36.0.0/aapt2");

const MAIN_ACTIVITY = "com.libitum.host.MainActivity";
// spec 5.1 · r02-3 B: screenOrientation portrait는 1, configChanges는 11값(assetsPaths 0x80000000 포함)의 비트 합.
// JS Number는 부호 없는 0x80002ff4(2147495924)이다. aapt2가 부호 있는 십진수로 찍어도 같게 읽도록 `>>> 0`으로 맞춘다.
const SCREEN_ORIENTATION_PORTRAIT = 1;
const CONFIG_CHANGES = 0x80002ff4;

function bundledApk() {
  assert.ok(
    existsSync(apkDir),
    "precondition: no apps/android/app/build/outputs/apk/bundled — run `pnpm bundle:android` and `./gradlew :app:assembleBundled` first",
  );
  const apks = readdirSync(apkDir).filter((name) => name.endsWith(".apk"));
  assert.ok(apks.length > 0, `precondition: no .apk under ${apkDir} — run :app:assembleBundled`);
  return join(apkDir, apks.includes("app-bundled.apk") ? "app-bundled.apk" : apks[0]);
}

/** xmltree 덤프를 요소 목록 { name, depth, attrs: Map(속성 이름 → 원문 값) }로 편다. */
function elementsOf(dump) {
  const elements = [];
  for (const line of dump.split("\n")) {
    const element = line.match(/^(\s*)E: (\S+)/);
    if (element) {
      elements.push({ name: element[2], depth: element[1].length, attrs: new Map() });
      continue;
    }
    const attribute = line.match(
      /^\s*A: (?:[^\s:]+:\/\/[^\s]*?:)?([\w:.-]+?)\(0x[0-9a-f]+\)=(.*)$/,
    );
    if (attribute && elements.length > 0) {
      const value = attribute[2].replace(/\s+\(Raw: .*\)$/, "").replace(/^"(.*)"$/, "$1");
      elements[elements.length - 1].attrs.set(attribute[1], value);
    }
  }
  return elements;
}

test("HB1: merged APK manifest — MainActivity is portrait with configChanges 0x80002ff4 (incl. assetsPaths) and nothing sets resizeableActivity", () => {
  const dump = execFileSync(
    aapt2,
    ["dump", "xmltree", "--file", "AndroidManifest.xml", bundledApk()],
    { maxBuffer: 1 << 26 },
  ).toString("utf8");
  const elements = elementsOf(dump);

  const mains = elements.filter(
    (element) => element.name === "activity" && element.attrs.get("name") === MAIN_ACTIVITY,
  );
  assert.equal(mains.length, 1, `merged manifest must declare ${MAIN_ACTIVITY} exactly once`);
  const [main] = mains;

  assert.equal(
    main.attrs.get("screenOrientation"),
    String(SCREEN_ORIENTATION_PORTRAIT),
    "merged MainActivity screenOrientation must be 1 (portrait); absent means the attribute is not declared",
  );
  const configChanges = main.attrs.get("configChanges");
  assert.ok(configChanges !== undefined, "merged MainActivity has no configChanges");
  assert.equal(
    Number(configChanges) >>> 0,
    CONFIG_CHANGES,
    `merged MainActivity configChanges must be 0x${CONFIG_CHANGES.toString(16)} (got ${configChanges})`,
  );

  const resizeable = elements.filter((element) => element.attrs.has("resizeableActivity"));
  assert.deepEqual(
    resizeable.map((element) => `${element.name}:${element.attrs.get("name") ?? ""}`),
    [],
    "resizeableActivity must not be set anywhere in the merged manifest (spec §5.3)",
  );
});
