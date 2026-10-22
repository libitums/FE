import { expect, test } from "vitest";

import { deeplinkTabFrom } from "./deeplink-target";

// Airbridge 딥링크 URL → 탭(ADR-0080 D2). 사용자 결정: 앱 열기 + 주요 탭 셋. 모르는 것은 `null`(앱만 연다).

test.each([
  ["duru://journey", "journey"],
  ["duru://roleplay", "roleplay"],
  ["duru://settings", "settings"],
  ["DURU://Roleplay/", "roleplay"],
  ["duru://roleplay?utm_source=meta", "roleplay"],
  ["duru:///settings", "settings"],
])("DL1. %s → %s", (url, tab) => {
  expect(deeplinkTabFrom(url)).toBe(tab);
});

test.each([
  ["앱만 여는 링크", "duru://"],
  ["모르는 목적지", "duru://shop"],
  ["로그인 콜백", "duru://auth-callback?code=x"],
  ["다른 scheme", "https://duru.airbridge.io/roleplay"],
  ["빈 값", ""],
  ["문자열이 아님", 42],
  ["null", null],
])("DL2. %s이면 null", (_name, url) => {
  expect(deeplinkTabFrom(url)).toBeNull();
});
