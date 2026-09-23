import { expect, test } from "vitest";

import {
  entryCompletedEvent,
  entryLoginMethodSelectedEvent,
  entryLoginMethods,
  entryScreenViewedEvent,
  entrySplashDurationMs,
  requiresVerificationCode,
  type EntryLoginMethod,
  type EntryViewedScreenName,
} from "./entry-flow";

// EF6(`entryCompletedEvent`)는 매개변수가 없고 반환 타입도 필드 하나짜리 리터럴
// (`{ name: "entry_completed" }`)뿐이라, 타입이 허용하는 값이 이 하나뿐입니다 —
// 구현이 비어 있어도 이 케이스는 이미 참입니다(같은 근거가 `lib/entry-flow.ts`의
// `entryCompletedEvent` 바로 위 주석에 있습니다). 단언 자체는 실제 성질(이름
// 리터럴·필드가 하나뿐)을 진짜로 검증하지만, **공허하게 통과하는 자리라는 사실은
// 남겨 둡니다.**

test("EF1. entryLoginMethods가 phone→apple→google→facebook 순서이고 중복이 없다", () => {
  expect(entryLoginMethods.length).toBeGreaterThan(0);
  expect(entryLoginMethods).toEqual(["phone", "apple", "google", "facebook"]);
  expect(new Set(entryLoginMethods).size).toBe(entryLoginMethods.length);
});

test("EF2. requiresVerificationCode가 phone에만 참이고 나머지 셋에 거짓이다", () => {
  expect(requiresVerificationCode("phone")).toBe(true);
  expect(requiresVerificationCode("google")).toBe(false);
  expect(requiresVerificationCode("apple")).toBe(false);
  expect(requiresVerificationCode("facebook")).toBe(false);
});

test("EF3. entrySplashDurationMs가 양의 정수다", () => {
  expect(Number.isInteger(entrySplashDurationMs)).toBe(true);
  expect(entrySplashDurationMs).toBeGreaterThan(0);
});

// 화면 다섯 전부로 왕복합니다 — 입력을 무시하고 고정값을 돌려주는 스텁이 있다면
// 이 왕복이 잡습니다. 속성이 둘뿐임(name·screen)도 함께 봅니다.
const viewedScreens: readonly EntryViewedScreenName[] = [
  "onboarding",
  "login",
  "verification-code",
  "language-select",
  "journey-entry",
];

test("EF4. entryScreenViewedEvent(screen)이 이름과 입력 screen만 싣는다", () => {
  for (const screen of viewedScreens) {
    const event = entryScreenViewedEvent(screen);

    expect(event).toEqual({ name: "entry_screen_viewed", screen });
    expect(Object.keys(event).sort()).toEqual(["name", "screen"]);
  }
});

// 같은 근거로 수단 넷 전부를 왕복합니다.
const loginMethodsForTest: readonly EntryLoginMethod[] = ["phone", "google", "apple", "facebook"];

test("EF5. entryLoginMethodSelectedEvent(method)가 이름과 입력 method만 싣는다", () => {
  for (const method of loginMethodsForTest) {
    const event = entryLoginMethodSelectedEvent(method);

    expect(event).toEqual({ name: "entry_login_method_selected", method });
    expect(Object.keys(event).sort()).toEqual(["method", "name"]);
  }
});

// 위 파일 머리 주석을 참고합니다 — 매개변수가 없고 타입이 값 하나만 허용합니다.
test("EF6. entryCompletedEvent()가 이름만 싣는다", () => {
  const event = entryCompletedEvent();

  expect(event).toEqual({ name: "entry_completed" });
  expect(Object.keys(event)).toEqual(["name"]);
});
