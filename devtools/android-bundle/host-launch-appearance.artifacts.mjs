// HB1: android-launch-appearance 빌드 산출물 검사 (계약 spec.md §6 · test-plan.md 「빌드 산출물」).
// 산출물이 필요해서 pnpm verify의 `*.test.mjs` 글롭에 들어가지 않는다 (선례 host-orientation.artifacts.mjs).
//
// 먼저 만든다 (기기 불필요):
//   pnpm bundle:android
//   cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew :app:assembleBundled
// 실행:
//   ANDROID_HOME=~/Library/Android/sdk node --test devtools/android-bundle/host-launch-appearance.artifacts.mjs
//
// 읽는 것: `aapt2 dump badging` · `aapt2 dump resources`를 app/build/outputs/apk/bundled/app-bundled.apk에.
// APK 안의 리소스 경로는 짧게 바뀌므로 경로가 아니라 리소스 이름으로 본다.
// `dump resources`는 리소스마다 `resource 0x… <type>/<name>` 줄 아래에 구성 줄을 들여 써서 찍는다:
//   `() (style) …`(기본) · `(v31) (style) …` · `(anydpi) (file) res/x.xml …` · `(mdpi) (file) …`
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

function bundledApk() {
  assert.ok(
    existsSync(apkDir),
    "precondition: no apps/android/app/build/outputs/apk/bundled — run `pnpm bundle:android` and `./gradlew :app:assembleBundled` first",
  );
  const apks = readdirSync(apkDir).filter((name) => name.endsWith(".apk"));
  assert.ok(apks.length > 0, `precondition: no .apk under ${apkDir} — run :app:assembleBundled`);
  return join(apkDir, apks.includes("app-bundled.apk") ? "app-bundled.apk" : apks[0]);
}

function aapt(...args) {
  return execFileSync(aapt2, ["dump", ...args, bundledApk()], { maxBuffer: 1 << 28 }).toString(
    "utf8",
  );
}

/** `dump resources` → Map("type/name" → 구성 줄 배열 { config, line }). */
function resourceConfigs(dump) {
  const resources = new Map();
  let current = null;
  for (const line of dump.split("\n")) {
    const header = line.match(/^\s*resource 0x[0-9a-f]+ (\S+)\s*$/);
    if (header) {
      current = [];
      resources.set(header[1], current);
      continue;
    }
    const config = line.match(/^\s+\(([^)]*)\) (.*)$/);
    if (config && current) current.push({ config: config[1], line: config[2] });
  }
  return resources;
}

const hasQualifier = (configs, pattern) => configs.some(({ config }) => pattern.test(config));

test("HB1: the bundled APK ships an adaptive launcher icon, the launch colour and Theme.Duru with v27/v31 variants, and no app_icon", () => {
  const badging = aapt("badging");
  const resources = resourceConfigs(aapt("resources"));
  const problems = [];

  const anydpi = badging.match(/^application-icon-65534:'([^']*)'/m)?.[1];
  if (anydpi === undefined) problems.push("badging has no application-icon-65534 (anydpi) entry");
  else if (!anydpi.endsWith(".xml")) {
    problems.push(`application-icon-65534 is ${anydpi}, expected an .xml (adaptive icon)`);
  }

  const launcher = resources.get("mipmap/ic_launcher");
  if (launcher === undefined) problems.push("mipmap/ic_launcher is missing");
  else if (!hasQualifier(launcher, /^anydpi/)) {
    problems.push(`mipmap/ic_launcher has no anydpi config (${launcher.map((c) => c.config)})`);
  }

  const foreground = resources.get("mipmap/ic_launcher_foreground");
  if (foreground === undefined) problems.push("mipmap/ic_launcher_foreground is missing");
  else {
    for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
      if (!hasQualifier(foreground, new RegExp(`^${density}(?:-|$)`))) {
        problems.push(`mipmap/ic_launcher_foreground has no ${density} config`);
      }
    }
  }

  if (!resources.has("color/launch_background"))
    problems.push("color/launch_background is missing");

  const theme = resources.get("style/Theme.Duru");
  if (theme === undefined) problems.push("style/Theme.Duru is missing");
  else {
    if (!hasQualifier(theme, /^$/)) problems.push("style/Theme.Duru has no default config");
    if (!hasQualifier(theme, /(?:^|-)v27$/)) problems.push("style/Theme.Duru has no v27 config");
    if (!hasQualifier(theme, /(?:^|-)v31$/)) problems.push("style/Theme.Duru has no v31 config");
  }

  if (resources.has("drawable/app_icon")) problems.push("drawable/app_icon is still in the APK");

  assert.deepEqual(problems, []);
});
