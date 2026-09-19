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

// 계약: .agent-harness/work/lib-261/spec.md §2.1(순수 타입 계약) · §3(pureFunctions)
// 계획: .agent-harness/work/lib-261/test-plan.md unit § `lib/entry-flow.unit.test.ts`
// (신설). 케이스 id는 계획의 EF1~EF6 그대로다.
//
// ⚠ EF6(`entryCompletedEvent`)는 매개변수가 없고 반환 타입도 필드 하나짜리 리터럴
// (`{ name: "entry_completed" }`)뿐이라, 타입이 허용하는 값이 이 하나뿐이다 — 스텁이
// 이미 정답과 같은 값을 돌려준다(같은 근거가 `lib/entry-flow.ts`의
// `entryCompletedEvent` 바로 위 주석에 있다). 그래서 이 케이스는
// `logic-scaffold` 시점에도 이미 참이다. 단언 자체는 실제 성질(이름 리터럴 · 필드가
// 하나뿐)을 진짜로 검증하므로 공허하게 통과하도록 일부러 지어낸 것이 아니다 — 다만
// 이 시점에는 red가 나지 않는다는 사실을 여기 남긴다(test-design이 unit-design.md에서
// test-plan의 red 기대와 대조한다).

// EF1
test("EF1. entryLoginMethods가 phone→google→apple→facebook 순서이고 중복이 없다", () => {
  expect(entryLoginMethods.length).toBeGreaterThan(0);
  expect(entryLoginMethods).toEqual(["phone", "google", "apple", "facebook"]);
  expect(new Set(entryLoginMethods).size).toBe(entryLoginMethods.length);
});

// EF2
test("EF2. requiresVerificationCode가 phone에만 참이고 나머지 셋에 거짓이다", () => {
  expect(requiresVerificationCode("phone")).toBe(true);
  expect(requiresVerificationCode("google")).toBe(false);
  expect(requiresVerificationCode("apple")).toBe(false);
  expect(requiresVerificationCode("facebook")).toBe(false);
});

// EF3
test("EF3. entrySplashDurationMs가 양의 정수다", () => {
  expect(Number.isInteger(entrySplashDurationMs)).toBe(true);
  expect(entrySplashDurationMs).toBeGreaterThan(0);
});

// EF4 — 입력 screen을 그대로 실어야 한다. 화면 다섯 전부로 왕복해 스텁의 고정값
// 반환(입력 무시)을 잡는다. 속성이 둘뿐임(name·screen)도 함께 본다.
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

// EF5 — 같은 근거로 수단 넷 전부를 왕복한다.
const loginMethodsForTest: readonly EntryLoginMethod[] = ["phone", "google", "apple", "facebook"];

test("EF5. entryLoginMethodSelectedEvent(method)가 이름과 입력 method만 싣는다", () => {
  for (const method of loginMethodsForTest) {
    const event = entryLoginMethodSelectedEvent(method);

    expect(event).toEqual({ name: "entry_login_method_selected", method });
    expect(Object.keys(event).sort()).toEqual(["method", "name"]);
  }
});

// EF6 — 위 파일 머리 주석 참고. 매개변수가 없고 타입이 값 하나만 허용한다.
test("EF6. entryCompletedEvent()가 이름만 싣는다", () => {
  const event = entryCompletedEvent();

  expect(event).toEqual({ name: "entry_completed" });
  expect(Object.keys(event)).toEqual(["name"]);
});
