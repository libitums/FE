// `unit` 계층(IL1 ~ IL5): iOS 시스템 대화상자 문구(추적 허용 안내, `NSUserTrackingUsageDescription`)가 앱의 화면 언어 일곱
// (en · es · id · ja · vi · th · my · zh-Hant — th · my는 2026-11-20 ADR-0158 개정, zh-Hant는 2026-11-24 ADR-0185)으로 있다 — ADR-0091 D6이 미뤘던 것을 2026-11-19 l10n 점검에서 연다. 시스템 대화상자는 앱 UI 언어가 아니라
// 기기 언어를 따르므로, 그 언어의 `InfoPlist.strings`가 프로젝트에 등록돼 번들에 들어가야 합니다. macOS 없이 PR에서 봅니다.
// (iOS 프로젝트 파일 점검이라 Podfile 점검과 같은 자리에 둡니다 — `pnpm test:ios-pods`.)

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const path = (relative) => fileURLToPath(new URL(`../../${relative}`, import.meta.url));
const read = (relative) => readFileSync(path(relative), "utf8");

// zh-Hant는 대만 중국어(번체, zh-TW) 화면 언어의 iOS 지역화 이름입니다 — zh-TW · zh-HK · zh-MO 기기가 고릅니다(ADR-0185).
const LANGUAGES = ["en", "es", "id", "ja", "vi", "th", "my", "zh-Hant"];
/** pbxproj는 `-`가 든 이름을 따옴표로 감쌉니다. */
const pbxName = (language) => (/^\w+$/.test(language) ? language : `"${language}"`);
const pathOf = (language) => {
  const path = `${language}\\.lproj/InfoPlist\\.strings`;
  return /^\w+$/.test(language) ? path : `"${path}"`;
};
const KEY = "NSUserTrackingUsageDescription";
const pbxproj = read("apps/ios/Host.xcodeproj/project.pbxproj");

/** `"KEY" = "value";` 한 줄의 값입니다. 없으면 null. */
function stringsValue(text, key) {
  const match = text.match(new RegExp(`^"${key}"\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)";$`, "m"));
  return match?.[1] ?? null;
}

const fileOf = (language) => `apps/ios/Host/${language}.lproj/InfoPlist.strings`;

test("IL1. 여덟 언어 모두 추적 허용 안내가 있고, 영어 밖 언어는 영어를 베끼지 않았다", () => {
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

test("IL2. 프로젝트 지역 목록에 여덟 언어가 있다", () => {
  const regions = pbxproj.match(/knownRegions = \(([^)]*)\);/)?.[1] ?? "";
  const listed = regions
    .split(",")
    .map((region) => region.trim().replace(/"/g, ""))
    .filter(Boolean);
  for (const language of LANGUAGES)
    assert.ok(listed.includes(language), `knownRegions에 ${language}가 없습니다`);
});

test("IL3. InfoPlist.strings 묶음이 여덟 언어 파일을 갖고 Host 앱의 리소스 단계에 든다", () => {
  const group = pbxproj.match(
    /(\w{24}) \/\* InfoPlist\.strings \*\/ = \{\s*isa = PBXVariantGroup;\s*children = \(([^)]*)\);/,
  );
  assert.ok(group, "InfoPlist.strings 변형 묶음이 없습니다");
  for (const language of LANGUAGES) {
    assert.match(
      pbxproj,
      new RegExp(`name = ${pbxName(language)}; path = ${pathOf(language)};`),
      `${language}.lproj/InfoPlist.strings 파일 참조가 없습니다`,
    );
  }
  // 화면 언어 여덟 + 한국어 기기용 ko(마이크 · 음성 인식만, IL5).
  assert.equal((group[2].match(/\/\* [\w-]+ \*\//g) ?? []).length, LANGUAGES.length + 1);
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

// IL4(ADR-0185 언어 검증): 마이크 · 음성 인식 권한 문구는 빌드 설정(INFOPLIST_KEY_*) 값이 한국어라, 지역화 파일이 없으면 영어 · 일본어 기기에도
// 한국어가 뜹니다. 여덟 언어 모두 두 문구가 있고 비어 있지 않으며, 한글이 없습니다(한국어 기기는 ko.lproj — IL5).
test("IL4. 여덟 언어 모두 마이크 · 음성 인식 권한 문구가 있고 한국어가 아니다", () => {
  for (const language of LANGUAGES) {
    const text = read(fileOf(language));
    for (const key of ["NSMicrophoneUsageDescription", "NSSpeechRecognitionUsageDescription"]) {
      const value = stringsValue(text, key);
      assert.ok(value, `${language}: ${key} 줄이 없습니다`);
      assert.doesNotMatch(
        value,
        /[\u3131-\u318e\uac00-\ud7a3]/u,
        `${language}: ${key}에 한글이 있습니다`,
      );
    }
  }
});

// IL5(리뷰 W2): ko.lproj가 없으면 한국어 기기는 개발 지역 en.lproj로 떨어져, en.lproj에 영어 문구가 생긴 뒤로 마이크 · 음성 인식 창이 영어가 된다.
// ko.lproj의 두 문구는 빌드 설정의 한국어 값과 같다.
test("IL5. 한국어 기기의 마이크 · 음성 인식 문구는 빌드 설정의 한국어 그대로다", () => {
  const text = read(fileOf("ko"));
  const regions = pbxproj.match(/knownRegions = \(([^)]*)\);/)?.[1] ?? "";
  assert.match(regions, /\bko,/);
  assert.match(pbxproj, /name = ko; path = ko\.lproj\/InfoPlist\.strings;/);
  for (const key of ["NSMicrophoneUsageDescription", "NSSpeechRecognitionUsageDescription"]) {
    const build = pbxproj.match(new RegExp(`INFOPLIST_KEY_${key} = "([^"]*)";`))?.[1];
    assert.ok(build, key);
    assert.equal(stringsValue(text, key), build, key);
  }
});
