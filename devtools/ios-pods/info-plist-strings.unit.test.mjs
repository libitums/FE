// `unit` 계층(IL1 ~ IL3): iOS 시스템 대화상자 문구(추적 허용 안내, `NSUserTrackingUsageDescription`)가 앱의 화면 언어 다섯
// (en · es · id · ja · vi)으로 있다 — ADR-0091 D6이 미뤘던 것을 2026-11-19 l10n 점검에서 연다. 시스템 대화상자는 앱 UI 언어가 아니라
// 기기 언어를 따르므로, 그 언어의 `InfoPlist.strings`가 프로젝트에 등록돼 번들에 들어가야 합니다. macOS 없이 PR에서 봅니다.
// (iOS 프로젝트 파일 점검이라 Podfile 점검과 같은 자리에 둡니다 — `pnpm test:ios-pods`.)

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const path = (relative) => fileURLToPath(new URL(`../../${relative}`, import.meta.url));
const read = (relative) => readFileSync(path(relative), "utf8");

const LANGUAGES = ["en", "es", "id", "ja", "vi"];
const KEY = "NSUserTrackingUsageDescription";
const pbxproj = read("apps/ios/Host.xcodeproj/project.pbxproj");

/** `"KEY" = "value";` 한 줄의 값입니다. 없으면 null. */
function stringsValue(text, key) {
  const match = text.match(new RegExp(`^"${key}"\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)";$`, "m"));
  return match?.[1] ?? null;
}

const fileOf = (language) => `apps/ios/Host/${language}.lproj/InfoPlist.strings`;

test("IL1. 다섯 언어 모두 추적 허용 안내가 있고, 영어 밖 언어는 영어를 베끼지 않았다", () => {
  const plist = read("apps/ios/Host/Info.plist");
  const base = plist.match(new RegExp(`<key>${KEY}</key>\\s*<string>([^<]*)</string>`))?.[1];
  assert.ok(base, "Info.plist에 기본(영어) 문구가 없습니다");
  for (const language of LANGUAGES) {
    assert.ok(existsSync(path(fileOf(language))), `${fileOf(language)}가 없습니다`);
    const value = stringsValue(read(fileOf(language)), KEY);
    assert.ok(value, `${language}: ${KEY} 줄이 없습니다`);
    if (language === "en") assert.equal(value, base, "en은 Info.plist 기본 문구와 같아야 합니다");
    else assert.notEqual(value, base, `${language}: 영어 문구를 그대로 두었습니다`);
  }
});

test("IL2. 프로젝트 지역 목록에 다섯 언어가 있다", () => {
  const regions = pbxproj.match(/knownRegions = \(([^)]*)\);/)?.[1] ?? "";
  const listed = regions
    .split(",")
    .map((region) => region.trim().replace(/"/g, ""))
    .filter(Boolean);
  for (const language of LANGUAGES)
    assert.ok(listed.includes(language), `knownRegions에 ${language}가 없습니다`);
});

test("IL3. InfoPlist.strings 묶음이 다섯 언어 파일을 갖고 Host 앱의 리소스 단계에 든다", () => {
  const group = pbxproj.match(
    /(\w{24}) \/\* InfoPlist\.strings \*\/ = \{\s*isa = PBXVariantGroup;\s*children = \(([^)]*)\);/,
  );
  assert.ok(group, "InfoPlist.strings 변형 묶음이 없습니다");
  for (const language of LANGUAGES) {
    assert.match(
      pbxproj,
      new RegExp(`name = ${language}; path = ${language}\\.lproj/InfoPlist\\.strings;`),
      `${language}.lproj/InfoPlist.strings 파일 참조가 없습니다`,
    );
  }
  assert.equal((group[2].match(/\/\* \w+ \*\//g) ?? []).length, LANGUAGES.length);
  const buildFile = pbxproj.match(
    new RegExp(
      `(\\w{24}) /\\* InfoPlist\\.strings in Resources \\*/ = \\{isa = PBXBuildFile; fileRef = ${group[1]} `,
    ),
  );
  assert.ok(buildFile, "InfoPlist.strings 빌드 파일이 없습니다");
  const hostResources = pbxproj.match(
    /2B94A3C32D6613730060892C \/\* Resources \*\/ = \{[^}]*files = \(([^)]*)\);/,
  );
  assert.ok(
    hostResources?.[1].includes(buildFile[1]),
    "Host 리소스 단계에 InfoPlist.strings가 없습니다",
  );
});
