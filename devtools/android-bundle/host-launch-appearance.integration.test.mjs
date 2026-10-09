// android-launch-appearance 정적 결선 검사 (HL1~HL5). 계약: spec.md §6, 계획: test-plan.md integration.
// 실제 AndroidManifest.xml · res/ · MainActivity.java를 읽는다. Gradle 산출물이 필요 없다 — pnpm test:android-bundle / pnpm verify에서 돈다.
// 빌드 산출물 검사(HB1)는 host-launch-appearance.artifacts.mjs, 기기 계측(IC1~IC4)은 LaunchAppearanceTest.java.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mainActivityConfigIssues } from "./host-config-changes.mjs";
import { launchAppearanceIssues, resolvedColor } from "./host-launch-appearance.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcDir = join(root, "apps/android/app/src");
const mainDir = join(srcDir, "main");
const resDir = join(mainDir, "res");
const manifestPath = join(mainDir, "AndroidManifest.xml");
const mainActivityPath = join(mainDir, "java/com/libitum/host/MainActivity.java");
const buildGradlePath = join(root, "apps/android/app/build.gradle");
const tokensPath = join(
  root,
  "apps/mobile/node_modules/@libitums/design-tokens/dist/css/variables.css",
);

const stripXmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, "");

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

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function readRes() {
  const paths = walk(resDir)
    .map((path) => relative(resDir, path))
    .sort();
  const files = {};
  for (const path of paths) {
    if (path.endsWith(".xml")) files[path] = readFileSync(join(resDir, path), "utf8");
  }
  return { paths, files };
}

/** 토큰 파일을 못 찾으면 건너뛰지 않고 실패한다. */
function brandPrimaryToken() {
  assert.ok(
    existsSync(tokensPath),
    `precondition: ${tokensPath} not found — run \`pnpm install --frozen-lockfile\` (this must fail, not skip)`,
  );
  const match = readFileSync(tokensPath, "utf8").match(
    /--libitum-color-brand-primary\s*:\s*(#[0-9a-fA-F]{6})\s*;/,
  );
  assert.ok(
    match,
    "--libitum-color-brand-primary is not defined in the design-tokens variables.css",
  );
  return match[1].toUpperCase();
}

test("HL1: the real manifest and res/ satisfy the launch-appearance contract (no issues)", () => {
  const { paths, files } = readRes();
  const issues = launchAppearanceIssues({
    manifest: readFileSync(manifestPath, "utf8"),
    files,
    paths,
    expectedLaunchColor: brandPrimaryToken(),
  });
  assert.deepEqual(issues, []);
});

test("HL2: launch_background resolves to the --libitum-color-brand-primary design token", () => {
  const { files } = readRes();
  const token = brandPrimaryToken();
  assert.equal(
    resolvedColor(files, "launch_background"),
    token,
    `launch_background must resolve to the token value ${token} (null = missing, cyclic or translucent)`,
  );
});

test("HL3: mipmap-*/ic_launcher_foreground.png exist as square RGBA PNGs of 108/162/216/324/432 px", () => {
  const expected = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  const problems = [];
  for (const [density, size] of Object.entries(expected)) {
    const relativePath = `mipmap-${density}/ic_launcher_foreground.png`;
    const path = join(resDir, relativePath);
    if (!existsSync(path)) {
      problems.push(`${relativePath}: missing`);
      continue;
    }
    const bytes = readFileSync(path);
    if (
      bytes.length < 26 ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.subarray(12, 16).toString("latin1") !== "IHDR"
    ) {
      problems.push(`${relativePath}: not a PNG with an IHDR header`);
      continue;
    }
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const bitDepth = bytes[24];
    const colorType = bytes[25];
    if (width !== size || height !== size) {
      problems.push(`${relativePath}: ${width}x${height}, expected ${size}x${size}`);
    }
    if (colorType !== 6 || bitDepth !== 8) {
      problems.push(
        `${relativePath}: color type ${colorType} / ${bitDepth}-bit, expected 6 (RGBA) / 8-bit`,
      );
    }
  }
  assert.deepEqual(problems, []);
});

test("HL4: guard — MainActivity edge-to-edge setup, Gradle and notification icon are untouched", () => {
  const activity = stripJavaComments(readFileSync(mainActivityPath, "utf8"));
  for (const call of [
    "setDecorFitsSystemWindows(window, false)",
    "setStatusBarColor(Color.TRANSPARENT)",
    "setNavigationBarColor(Color.TRANSPARENT)",
    "setAppearanceLightStatusBars(true)",
    "setAppearanceLightNavigationBars(true)",
  ]) {
    assert.ok(activity.includes(call), `MainActivity must still call ${call}`);
  }
  assert.doesNotMatch(
    activity,
    /\bsetBackgroundDrawable(?:Resource)?\s*\(/,
    "MainActivity must not change the window background (spec §6.5)",
  );
  assert.equal(
    (readFileSync(buildGradlePath, "utf8").match(/core-splashscreen/g) ?? []).length,
    0,
    "app/build.gradle must not add core-splashscreen (spec §6.5)",
  );
  assert.deepEqual(mainActivityConfigIssues(readFileSync(manifestPath, "utf8")), []);
  assert.ok(
    existsSync(join(resDir, "drawable/ic_notification.xml")),
    "res/drawable/ic_notification.xml must stay",
  );
});

test("HL5: nothing under apps/android/app/src still references app_icon", () => {
  const offenders = walk(srcDir)
    .filter((path) => /\.(?:xml|java)$/.test(path))
    .filter((path) => {
      const text = readFileSync(path, "utf8");
      const code = path.endsWith(".xml") ? stripXmlComments(text) : stripJavaComments(text);
      return /\bapp_icon\b/.test(code);
    })
    .map((path) => relative(srcDir, path));
  assert.deepEqual(offenders, []);
});
