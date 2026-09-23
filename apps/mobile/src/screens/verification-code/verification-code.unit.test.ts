import { expect, test } from "vitest";

import {
  formatVerificationCountdown,
  initialVerificationCode,
  isVerificationCodeComplete,
  isVerificationCodeRejected,
  verificationCodeFrom,
  verificationCodeLength,
  verificationCodeValidSeconds,
} from "./verification-code";

// VC6·VC7은 `isVerificationCodeRejected` 신설분입니다. 기존 VC1~VC5는 한 줄도
// 고치지 않았습니다.

test("VC1. verificationCodeLength가 4이고 initialVerificationCode가 빈 문자열이다", () => {
  expect(verificationCodeLength).toBe(4);
  expect(initialVerificationCode).toBe("");
});

test("VC2. verificationCodeFrom이 숫자가 아닌 문자를 버린다", () => {
  expect(verificationCodeFrom("1a2b3c")).toBe("123");
});

test("VC3. verificationCodeFrom이 앞 4자만 남긴다", () => {
  expect(verificationCodeFrom("123456")).toBe("1234");
});

test("VC4. isVerificationCodeComplete가 정확히 4자리일 때만 참이다", () => {
  expect(isVerificationCodeComplete("1234")).toBe(true);
});

test("VC5. 빈 값·3자리에서 거짓이다", () => {
  expect(isVerificationCodeComplete("")).toBe(false);
  expect(isVerificationCodeComplete("123")).toBe(false);
});

test("VC6. isVerificationCodeRejected가 칸이 찼는데 완성이 아닐 때 참이다", () => {
  // 원값은 4자(코드 포인트 기준)이지만 정규화하면 "123"(3자)입니다 — 찼지만
  // 완성이 아닙니다.
  expect(isVerificationCodeRejected("1*23")).toBe(true);
});

// VC7 — 거짓 쪽 다섯입니다. 「늘 참」 스텁을 잡는 자리입니다(넷 이상이 거짓이어야
// 잡힙니다).
test("VC7. isVerificationCodeRejected가 나머지에서 거짓이다", () => {
  const notRejected = [
    "", // 아직 안 찼습니다
    "1*2", // 아직 안 찼습니다
    "1234", // 완성입니다
    "1*234", // 버려졌지만 완성이라 안 막혔습니다
    "12345", // 완성입니다
  ];

  for (const value of notRejected) {
    expect(isVerificationCodeRejected(value)).toBe(false);
  }
});

// VC8 — 2026-09-21 디자인 반영: 5분 카운트다운 표기입니다.
test("VC8. 유효 시간이 5분이고 formatVerificationCountdown이 MM:SS로 적는다", () => {
  expect(verificationCodeValidSeconds).toBe(300);
  expect(formatVerificationCountdown(300)).toBe("05:00");
  expect(formatVerificationCountdown(59)).toBe("00:59");
  expect(formatVerificationCountdown(0)).toBe("00:00");
  expect(formatVerificationCountdown(-3)).toBe("00:00");
});
