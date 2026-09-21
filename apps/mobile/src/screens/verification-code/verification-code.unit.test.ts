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

// 계약: .agent-harness/work/lib-261/spec.md §2.5(순수 타입 계약) · §3(pureFunctions)
// 계획: .agent-harness/work/lib-261/test-plan.md unit §
// `screens/verification-code/verification-code.unit.test.ts`(신설). 케이스 id는
// 계획의 VC1~VC5 그대로다.
//
// LIB-261 (test-design#unit r0.3): VC6 · VC7을 더한다(§0.10 (2) · §2.5의
// `isVerificationCodeRejected` 신설). 기존 VC1~VC5는 한 줄도 고치지 않는다.

// VC1
test("VC1. verificationCodeLength가 4이고 initialVerificationCode가 빈 문자열이다", () => {
  expect(verificationCodeLength).toBe(4);
  expect(initialVerificationCode).toBe("");
});

// VC2
test("VC2. verificationCodeFrom이 숫자가 아닌 문자를 버린다", () => {
  expect(verificationCodeFrom("1a2b3c")).toBe("123");
});

// VC3
test("VC3. verificationCodeFrom이 앞 4자만 남긴다", () => {
  expect(verificationCodeFrom("123456")).toBe("1234");
});

// VC4
test("VC4. isVerificationCodeComplete가 정확히 4자리일 때만 참이다", () => {
  expect(isVerificationCodeComplete("1234")).toBe(true);
});

// VC5
test("VC5. 빈 값·3자리에서 거짓이다", () => {
  expect(isVerificationCodeComplete("")).toBe(false);
  expect(isVerificationCodeComplete("123")).toBe(false);
});

// VC6
test("VC6. isVerificationCodeRejected가 칸이 찼는데 완성이 아닐 때 참이다", () => {
  // 원값 4자(코드 포인트 기준) · 정규화하면 "123"(3자) — 찼지만 완성이 아니다.
  expect(isVerificationCodeRejected("1*23")).toBe(true);
});

// VC7 — 거짓 쪽 다섯. 「늘 참」 스텁을 잡는 자리다(넷 이상이 거짓이어야 잡힌다).
test("VC7. isVerificationCodeRejected가 나머지에서 거짓이다", () => {
  const notRejected = [
    "", // 아직 안 찼다
    "1*2", // 아직 안 찼다
    "1234", // 완성
    "1*234", // 버려졌지만 완성이라 안 막혔다
    "12345", // 완성
  ];

  for (const value of notRejected) {
    expect(isVerificationCodeRejected(value)).toBe(false);
  }
});

// VC8 — 2026-09-21 디자인 반영: 5분 카운트다운 표기.
test("VC8. 유효 시간이 5분이고 formatVerificationCountdown이 MM:SS로 적는다", () => {
  expect(verificationCodeValidSeconds).toBe(300);
  expect(formatVerificationCountdown(300)).toBe("05:00");
  expect(formatVerificationCountdown(59)).toBe("00:59");
  expect(formatVerificationCountdown(0)).toBe("00:00");
  expect(formatVerificationCountdown(-3)).toBe("00:00");
});
