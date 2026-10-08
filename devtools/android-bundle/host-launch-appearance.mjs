// 정본은 android-launch-appearance 계약 7절. 순수 함수 — 파일을 읽지 않는다.
// 한정자 선택 · 부모 사슬 · 색 별칭 풀이는 host-launch-appearance.resources.mjs에 있다.

import {
  parseStyles,
  resolvedColor,
  resolvedThemeItems,
  stripXmlComments,
  themeParentEnd,
  valuesFiles,
} from "./host-launch-appearance.resources.mjs";

export { resolvedColor, resolvedThemeItems };

/** @typedef {'theme'|'theme-parent'|'window-background'|'system-bars'|'splash-background'|'splash-icon'|'api-level'|'launch-color'|'night-variant'|'icon'|'adaptive-icon'|'legacy-icon'} LaunchAppearanceRule */
/** @typedef {{ rule: LaunchAppearanceRule, detail: string }} LaunchAppearanceIssue */
/**
 * @typedef {object} LaunchAppearanceInput
 * @property {string} manifest main AndroidManifest.xml의 원문
 * @property {Readonly<Record<string, string>>} files `res/` 기준 상대 경로 → XML 원문
 * @property {readonly string[]} paths `res/` 아래 모든 파일의 상대 경로 (이진 파일 포함)
 * @property {string} expectedLaunchColor 토큰에서 읽은 `#RRGGBB`
 */

const THEME_NAME = "Theme.Duru";
const THEME_REF = "@style/Theme.Duru";
const PLATFORM_PARENT = "@android:style/Theme.Material.Light.NoActionBar";
const TRANSPARENT = "@android:color/transparent";
const LAUNCH_BACKGROUND = "@color/launch_background";
const SPLASH_ICON = "@drawable/splash_icon_none";
const LAUNCHER_ICON = "@mipmap/ic_launcher";
const ADAPTIVE_ICON_PATH = "mipmap-anydpi-v26/ic_launcher.xml";
const DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
const CHECKED_LEVELS = [26, 27, 31];
const LAUNCH_COLOR_NAMES = [
  "libitum_color_brand_primary",
  "launch_background",
  "ic_launcher_background",
];
const ALLOWED_SPLASH_ATTRIBUTES = [
  "android:windowSplashScreenBackground",
  "android:windowSplashScreenAnimatedIcon",
];

/** 속성이 생긴 API 수준(6.2절). 0이면 제약 없음. */
function attributeSince(name) {
  if (name === "android:windowLightNavigationBar") return 27;
  if (/^android:windowSplash[sS]creen/.test(name)) return 31;
  return 0;
}

/** 시작 태그 안 `android:` 속성을 이름(접두사 없이) → 값으로 읽는다. */
function androidAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(/\bandroid:([\w-]+)\s*=\s*"([^"]*)"/g)) {
    if (!attributes.has(match[1])) attributes.set(match[1], match[2]);
  }
  return attributes;
}

function checkManifest(manifest, push) {
  const application = androidAttributes(manifest.match(/<application\b[^>]*>/)?.[0] ?? "");

  const theme = application.get("theme");
  if (theme !== THEME_REF) push("theme", `application theme: ${theme ?? "(absent)"}`);
  for (const match of manifest.matchAll(/<activity\b[^>]*>/g)) {
    const attributes = androidAttributes(match[0]);
    if (attributes.has("theme")) {
      push(
        "theme",
        `activity ${attributes.get("name") ?? "?"} sets theme ${attributes.get("theme")}`,
      );
    }
  }

  const icon = application.get("icon");
  if (icon !== LAUNCHER_ICON) push("icon", `application icon: ${icon ?? "(absent)"}`);
  if (application.has("roundIcon")) push("icon", `roundIcon: ${application.get("roundIcon")}`);
}

function checkThemes(files, paths, push) {
  for (const end of new Set(
    CHECKED_LEVELS.map((level) => {
      const result = themeParentEnd(files, THEME_NAME, level);
      return result.end === PLATFORM_PARENT ? null : (result.end ?? result.problem);
    }),
  )) {
    if (end !== null) push("theme-parent", `parent chain end: ${end}`);
  }

  const at = Object.fromEntries(
    CHECKED_LEVELS.map((level) => [level, resolvedThemeItems(files, THEME_NAME, level)]),
  );
  const expect = (rule, level, name, value) => {
    const actual = at[level].get(name);
    if (actual !== value) push(rule, `API ${level} ${name}: ${actual ?? "(absent)"}`);
  };

  for (const level of CHECKED_LEVELS) {
    expect("window-background", level, "android:windowBackground", LAUNCH_BACKGROUND);
  }
  for (const level of CHECKED_LEVELS) {
    expect("system-bars", level, "android:statusBarColor", TRANSPARENT);
    expect("system-bars", level, "android:navigationBarColor", TRANSPARENT);
    expect("system-bars", level, "android:windowLightStatusBar", "true");
  }
  for (const level of [27, 31]) {
    expect("system-bars", level, "android:windowLightNavigationBar", "true");
  }

  expect("splash-background", 31, "android:windowSplashScreenBackground", LAUNCH_BACKGROUND);

  expect("splash-icon", 31, "android:windowSplashScreenAnimatedIcon", SPLASH_ICON);
  if (!paths.some((path) => /^drawable[^/]*\/splash_icon_none\.[\w.]+$/.test(path))) {
    push("splash-icon", "drawable/splash_icon_none is missing from res paths");
  }
  const levels = new Set([...CHECKED_LEVELS, 36, ...valuesFiles(files).map((file) => file.level)]);
  const forbidden = new Set();
  for (const level of levels) {
    for (const name of resolvedThemeItems(files, THEME_NAME, level).keys()) {
      if (attributeSince(name) === 31 && !ALLOWED_SPLASH_ATTRIBUTES.includes(name)) {
        forbidden.add(name);
      }
    }
  }
  for (const name of forbidden) push("splash-icon", `forbidden splash attribute: ${name}`);
}

function checkApiLevels(files, push) {
  for (const file of valuesFiles(files)) {
    for (const style of parseStyles(file.xml)) {
      for (const [name] of style.items) {
        const since = attributeSince(name);
        if (file.level < since) {
          push("api-level", `${file.path} ${style.name}: ${name} needs API ${since}`);
        }
      }
    }
  }
}

function checkLaunchColors(files, expectedLaunchColor, push) {
  const expected =
    typeof expectedLaunchColor === "string" ? expectedLaunchColor.trim().toUpperCase() : "";
  for (const name of ["launch_background", "ic_launcher_background"]) {
    const actual = resolvedColor(files, name);
    if (actual === null || actual !== expected) {
      push("launch-color", `${name}: ${actual ?? "(unresolved)"}, expected ${expected}`);
    }
  }
}

function checkNightVariants(files, push) {
  for (const [path, xml] of Object.entries(files)) {
    if (!/^values-night(?:-|\/)/.test(path) || typeof xml !== "string") continue;
    const clean = stripXmlComments(xml);
    if (parseStyles(clean).some((style) => style.name === THEME_NAME)) {
      push("night-variant", `${path} defines ${THEME_NAME}`);
    }
    for (const match of clean.matchAll(/<color\b[^>]*?\bname\s*=\s*"([^"]*)"/g)) {
      if (LAUNCH_COLOR_NAMES.includes(match[1]))
        push("night-variant", `${path} defines ${match[1]}`);
    }
  }
}

function checkAdaptiveIcon(files, paths, push) {
  const xml = files[ADAPTIVE_ICON_PATH];
  if (typeof xml !== "string") {
    push("adaptive-icon", `${ADAPTIVE_ICON_PATH} is missing`);
  } else {
    const clean = stripXmlComments(xml).replace(/<\?[\s\S]*?\?>/g, "");
    const root = /<([A-Za-z][\w.-]*)/.exec(clean)?.[1];
    if (root !== "adaptive-icon") {
      push("adaptive-icon", `root element: ${root ?? "(none)"}`);
    } else {
      const layer = (tag) => {
        const element = clean.match(new RegExp(`<${tag}\\b[^>]*>`))?.[0];
        return element === undefined ? undefined : androidAttributes(element).get("drawable");
      };
      const background = layer("background");
      if (background !== "@color/ic_launcher_background") {
        push("adaptive-icon", `background: ${background ?? "(absent)"}`);
      }
      const foreground = layer("foreground");
      if (foreground !== "@mipmap/ic_launcher_foreground") {
        push("adaptive-icon", `foreground: ${foreground ?? "(absent)"}`);
      }
      if (/<monochrome\b/.test(clean)) push("adaptive-icon", "monochrome layer is not allowed");
    }
  }
  for (const density of DENSITIES) {
    const path = `mipmap-${density}/ic_launcher_foreground.png`;
    if (!paths.includes(path)) push("adaptive-icon", `${path} is missing`);
  }
}

/**
 * 6.1~6.4를 어긴 곳을 전부 준다. 어긴 것이 없으면 빈 배열. 던지지 않는다.
 * 순서는 규칙 선언 순.
 * @param {LaunchAppearanceInput} input
 * @returns {LaunchAppearanceIssue[]}
 */
export function launchAppearanceIssues(input) {
  const manifest = stripXmlComments(input?.manifest);
  const files = input?.files && typeof input.files === "object" ? input.files : {};
  const paths = Array.isArray(input?.paths) ? input.paths : [];

  const byRule = new Map();
  const push = (rule, detail) => {
    if (!byRule.has(rule)) byRule.set(rule, []);
    byRule.get(rule).push({ rule, detail });
  };

  checkManifest(manifest, push);
  checkThemes(files, paths, push);
  checkApiLevels(files, push);
  checkLaunchColors(files, input?.expectedLaunchColor, push);
  checkNightVariants(files, push);
  checkAdaptiveIcon(files, paths, push);

  if (paths.includes("drawable/app_icon.png")) {
    push("legacy-icon", "drawable/app_icon.png is still in res");
  }
  if (/@(?:drawable|mipmap)\/app_icon\b/.test(manifest)) {
    push("legacy-icon", "manifest references app_icon");
  }

  const order = [
    "theme",
    "theme-parent",
    "window-background",
    "system-bars",
    "splash-background",
    "splash-icon",
    "api-level",
    "launch-color",
    "night-variant",
    "icon",
    "adaptive-icon",
    "legacy-icon",
  ];
  return order.flatMap((rule) => byRule.get(rule) ?? []);
}
