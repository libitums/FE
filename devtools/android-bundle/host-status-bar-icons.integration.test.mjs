// android-status-bar-appearance 정적 결선 검사 (HS1~HS4). 계약: spec.md §4 · r02.5, 계획: test-plan.md integration.
// 실제 소스(lib/status-bar-icons.ts · StatusBarIcons.java · MainActivity.java · apps/mobile/src의 .tsx · .css · AppSession.tsx)를 읽는다.
// Gradle 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 호스트가 실제로 트리를 읽어 창에 적용하는 것은 정적으로 증명되지 않는다(계측 StatusBarIconsHostTest · e2e).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mainActivityConfigIssues } from "./host-config-changes.mjs";
import { launchAppearanceIssues } from "./host-launch-appearance.mjs";
import { statusBarMarkerIssues } from "./host-status-bar-icons.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mobileSrc = join(root, "apps/mobile/src");
const hostDir = join(root, "apps/android/app/src/main/java/com/libitum/host");
const mainDir = join(root, "apps/android/app/src/main");
const resDir = join(mainDir, "res");
const mainActivityPath = join(hostDir, "MainActivity.java");
const skippedDirs = new Set(["node_modules", "Pods", "build", "DerivedData", "dist", ".git"]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (skippedDirs.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** `//` 줄 주석과 블록 주석을 지운다. 문자열 · 문자 리터럴 안의 `//`(URL)는 건드리지 않는다. */
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
      out += ch;
      i += 1;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === "\\") {
          out += source[i];
          i += 1;
        }
        out += source[i] ?? "";
        i += 1;
      }
      out += ch;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** apps/mobile/src 기준 상대 경로 → 내용. 검사 함수가 `*.test.*` 경로를 스스로 뺀다(host-status-bar-icons.mjs의 isTestFile). */
function sourcesBy(extension) {
  const sources = {};
  for (const path of walk(mobileSrc)) {
    if (path.endsWith(extension)) sources[relative(mobileSrc, path)] = readFileSync(path, "utf8");
  }
  return sources;
}

function realInput() {
  return {
    markerSource: readFileSync(join(mobileSrc, "lib/status-bar-icons.ts"), "utf8"),
    hostSource: readFileSync(join(hostDir, "StatusBarIcons.java"), "utf8"),
    mainActivitySource: readFileSync(mainActivityPath, "utf8"),
    syncSource: readFileSync(join(hostDir, "StatusBarIconSync.java"), "utf8"),
    componentSources: sourcesBy(".tsx"),
    cssSources: sourcesBy(".css"),
    appSessionSource: readFileSync(join(mobileSrc, "app/AppSession.tsx"), "utf8"),
  };
}

test("HS1: the real sources satisfy the status-bar marker contract (no issues)", () => {
  const input = realInput();
  assert.ok(
    Object.keys(input.componentSources).length > 0,
    "precondition: no .tsx files found under apps/mobile/src",
  );
  assert.deepEqual(statusBarMarkerIssues(input), []);
});

test("HS1 (r03 band-decor): the real streak-modal CSS gives meteor c no top, and the real TSX takes it from insets.top", () => {
  // statusBarMarkerIssues(HS1)의 규칙 `band-decor`와 같은 계약을 검사 함수 없이 실제 파일에서 직접 본다 —
  // 규칙이 빠지거나 잘못 쓰여도 운석 c의 자리 계약이 깨지면 여기서 잡힌다.
  const css = readFileSync(
    join(mobileSrc, "screens/journey-map/journey-stat-modal.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = /\.journey-stat-modal-meteor-c\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, "precondition: .journey-stat-modal-meteor-c rule not found");
  assert.doesNotMatch(rule[1], /(?:^|[\s;])top\s*:/, "CSS must not declare top for meteor c");

  const tsx = readFileSync(join(mobileSrc, "screens/journey-map/JourneyStatModal.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\w])\/\/[^\n]*/g, "$1");
  assert.match(
    tsx,
    /\btop\s*:\s*`\$\{\s*insets\.top\s*\}px`/,
    "inline top must come from insets.top",
  );
});

test("HS2: guard — MainActivity registers 11 modules and none is a status-bar module", () => {
  const activity = stripJavaComments(readFileSync(mainActivityPath, "utf8"));
  const registered = [...activity.matchAll(/registerModule\s*\(\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.equal(
    (activity.match(/registerModule\s*\(/g) ?? []).length,
    11,
    "the number of registerModule( calls must stay 11 (no new native module)",
  );
  assert.equal(registered.length, 11, "every registerModule( call names its module by a literal");
  assert.deepEqual(
    registered.filter((name) => /StatusBar/i.test(name)),
    [],
  );
});

test("HS3: guard — no statusbar marker string in packages/ui-lynx/src or apps/ios", () => {
  const textExtensions = /\.(?:tsx?|css|json|swift|m|mm|h|plist|xml|java|kt|html|js|mjs)$/;
  const offenders = [...walk(join(root, "packages/ui-lynx/src")), ...walk(join(root, "apps/ios"))]
    .filter((path) => textExtensions.test(path))
    .filter((path) => /data-statusbar|statusbar/.test(readFileSync(path, "utf8")))
    .map((path) => relative(root, path));
  assert.deepEqual(offenders, []);
});

test("HS4: guard — the configuration-change and launch-appearance checks still pass", () => {
  const manifest = readFileSync(join(mainDir, "AndroidManifest.xml"), "utf8");
  assert.deepEqual(mainActivityConfigIssues(manifest), []);

  const paths = walk(resDir)
    .map((path) => relative(resDir, path))
    .sort();
  const files = {};
  for (const path of paths) {
    if (path.endsWith(".xml")) files[path] = readFileSync(join(resDir, path), "utf8");
  }
  const tokensPath = join(
    root,
    "apps/mobile/node_modules/@libitums/design-tokens/dist/css/variables.css",
  );
  assert.ok(
    existsSync(tokensPath),
    `precondition: ${tokensPath} not found — run \`pnpm install --frozen-lockfile\` (this must fail, not skip)`,
  );
  const token = readFileSync(tokensPath, "utf8").match(
    /--libitum-color-brand-primary\s*:\s*(#[0-9a-fA-F]{6})\s*;/,
  );
  assert.ok(
    token,
    "--libitum-color-brand-primary is not defined in the design-tokens variables.css",
  );
  assert.deepEqual(
    launchAppearanceIssues({
      manifest,
      files,
      paths,
      expectedLaunchColor: token[1].toUpperCase(),
    }),
    [],
  );
});
