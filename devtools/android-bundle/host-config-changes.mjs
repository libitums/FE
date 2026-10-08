// 정본은 android-orientation 계약 7절. 순수 함수 — 파일을 읽지 않는다.

/** @typedef {'activity-missing'|'orientation'|'config-missing'|'config-forbidden'|'config-unlisted'|'resizeable'|'restricted-resizability-opt-out'} HostConfigRule */
/** @typedef {{ rule: HostConfigRule, detail: string }} HostConfigIssue */

/**
 * 5.2절에서 「직접 처리」로 정한 값 — 이 순서로 고정(11).
 * @type {readonly string[]}
 */
export const handledConfigChanges = Object.freeze([
  "orientation",
  "screenSize",
  "smallestScreenSize",
  "screenLayout",
  "uiMode",
  "locale",
  "layoutDirection",
  "keyboard",
  "keyboardHidden",
  "navigation",
  "assetsPaths",
]);

/**
 * 5.2절에서 「재생성 수용」으로 못 박은 값 — 선언하면 위반(2).
 * @type {readonly ['density', 'fontScale']}
 */
export const recreatedConfigChanges = Object.freeze(["density", "fontScale"]);

/**
 * 5.3절의 값.
 * @type {'portrait'}
 */
export const mainActivityOrientation = "portrait";

const MAIN_ACTIVITY_NAMES = new Set([".MainActivity", "com.libitum.host.MainActivity"]);

/** 시작 태그의 `android:` 속성을 이름(접두사 없이) → 값으로 읽는다. */
function readAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(/\bandroid:([\w-]+)\s*=\s*"([^"]*)"/g)) {
    if (!attributes.has(match[1])) attributes.set(match[1], match[2]);
  }
  return attributes;
}

/**
 * 매니페스트 원문에서 MainActivity 선언이 5절을 지키는지 봅니다. 지키면 [].
 * 던지지 않습니다.
 * @param {string} manifestXml
 * @returns {HostConfigIssue[]}
 */
export function mainActivityConfigIssues(manifestXml) {
  const xml = typeof manifestXml === "string" ? manifestXml.replace(/<!--[\s\S]*?-->/g, "") : "";
  const mains = [...xml.matchAll(/<activity\b[^>]*>/g)]
    .map((match) => readAttributes(match[0]))
    .filter((attributes) => MAIN_ACTIVITY_NAMES.has(attributes.get("name")));
  if (mains.length !== 1) {
    return [{ rule: "activity-missing", detail: `MainActivity declarations: ${mains.length}` }];
  }

  const [activity] = mains;
  const issues = [];

  const orientation = activity.get("screenOrientation");
  if (orientation !== mainActivityOrientation) {
    issues.push({ rule: "orientation", detail: orientation ?? "(absent)" });
  }

  const declared = (activity.get("configChanges") ?? "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const value of handledConfigChanges) {
    if (!declared.includes(value)) issues.push({ rule: "config-missing", detail: value });
  }
  for (const value of declared) {
    if (recreatedConfigChanges.includes(value)) {
      issues.push({ rule: "config-forbidden", detail: value });
    } else if (!handledConfigChanges.includes(value)) {
      issues.push({ rule: "config-unlisted", detail: value });
    }
  }

  const application = readAttributes(xml.match(/<application\b[^>]*>/)?.[0] ?? "");
  if (activity.has("resizeableActivity")) {
    issues.push({ rule: "resizeable", detail: `activity=${activity.get("resizeableActivity")}` });
  }
  if (application.has("resizeableActivity")) {
    issues.push({
      rule: "resizeable",
      detail: `application=${application.get("resizeableActivity")}`,
    });
  }

  if (xml.includes("PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY")) {
    issues.push({ rule: "restricted-resizability-opt-out", detail: "property declared" });
  }
  return issues;
}
