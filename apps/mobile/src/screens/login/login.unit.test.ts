import { expect, test } from "vitest";

import type { EntryLoginMethod } from "../../lib/entry-flow";
import { canRequestPhoneOtp, loginMethodLabel, phoneNumberFrom } from "./login";

// 라벨 리터럴 자체는 단언하지 않습니다(공백 아님·서로 다름만). 수단 넷은
// `entryLoginMethods`(지금은 스텁이라 빈 배열)를 순회하지 않고 리터럴로 짓습니다 —
// 그러지 않으면 스텁 상태에서 루프가 0회 돌아 공허하게 통과합니다
// (entry-flow.unit.test.ts EF1이 그 축을 이미 집니다).
const allLoginMethods: readonly EntryLoginMethod[] = ["phone", "google", "apple", "facebook"];

test("LG1. 수단 넷 각각에 공백 아닌 라벨이 있고 넷이 서로 다르다", () => {
  const labels = allLoginMethods.map((method) => loginMethodLabel(method));

  for (const label of labels) {
    expect(label.trim().length).toBeGreaterThan(0);
  }
  expect(new Set(labels).size).toBe(allLoginMethods.length);
});

// ---------------------------------------------------------------- 전화번호(Supabase OTP)

test("LP1. 숫자만 남겨 국가 번호와 붙인 E.164와, 입력 그대로의 표시 문자열을 낸다", () => {
  expect(phoneNumberFrom("+82", "10 1234 5678")).toEqual({
    e164: "+821012345678",
    display: "+82 10 1234 5678",
  });
});

test("LP1b. 맨 앞 트렁크 0 하나를 뗀다", () => {
  expect(phoneNumberFrom("+82", "010-1234-5678")?.e164).toBe("+821012345678");
});

test("LP1c. 앞 0이 번호의 일부인 국가 코드(+39)는 0을 지킨다", () => {
  expect(phoneNumberFrom("+39", "06 1234 5678")?.e164).toBe("+390612345678");
});

test("LP2. 0을 떼도 display는 입력 그대로다", () => {
  expect(phoneNumberFrom("+82", "010-1234-5678")).toEqual({
    e164: "+821012345678",
    display: "+82 010-1234-5678",
  });
});

test("LP3. 숫자가 남지 않으면 null이다", () => {
  expect(phoneNumberFrom("+82", "  ")).toBeNull();
  expect(phoneNumberFrom("+82", "abc")).toBeNull();
  expect(phoneNumberFrom("+82", "0")).toBeNull();
});

test("LP4. +를 뺀 숫자가 15자를 넘으면 null이다", () => {
  expect(phoneNumberFrom("+1", "12345678901234")?.e164).toBe("+112345678901234");
  expect(phoneNumberFrom("+1", "123456789012345")).toBeNull();
});

test("LP5. canRequestPhoneOtp — 번호가 있고 요청 중이 아닐 때만 참", () => {
  const phone = { e164: "+821012345678", display: "+82 10 1234 5678" };
  expect(canRequestPhoneOtp(phone, { kind: "idle" })).toBe(true);
  expect(canRequestPhoneOtp(phone, { kind: "failed", reason: "network" })).toBe(true);
  expect(canRequestPhoneOtp(phone, { kind: "requesting" })).toBe(false);
  expect(canRequestPhoneOtp(null, { kind: "idle" })).toBe(false);
});
