import { expect, test } from "vitest";

import {
  canSubmitVerificationCode,
  formatVerificationCountdown,
  initialVerificationCode,
  isVerificationCodeComplete,
  isVerificationCodeRejected,
  verificationCodeFrom,
  verificationCodeLength,
  verificationCodeValidSeconds,
} from "./verification-code";

// VC1·VC3·VC4·VC5·VC6·VC7은 코드 길이 4→6 개정(spec C5)을 6자리 기준으로 다시
// 짓습니다. VC2·VC8은 불변(회귀 파수꾼)이라 한 줄도 고치지 않았습니다.

test("VC1. verificationCodeLength가 6이고 initialVerificationCode가 빈 문자열이다", () => {
  expect(verificationCodeLength).toBe(6);
  expect(initialVerificationCode).toBe("");
});

test("VC2. verificationCodeFrom이 숫자가 아닌 문자를 버린다", () => {
  expect(verificationCodeFrom("1a2b3c")).toBe("123");
});

test("VC3. verificationCodeFrom이 앞 6자만 남긴다", () => {
  expect(verificationCodeFrom("12345678")).toBe("123456");
});

test("VC4. isVerificationCodeComplete가 정확히 6자리일 때만 참이다", () => {
  expect(isVerificationCodeComplete("123456")).toBe(true);
});

// 「빈 값·5자리」가 거짓이라는 것만으로는 옛 규칙(길이 4)으로 되돌아가도 우연히
// 초록일 수 있습니다 — "1234"(4자리)가 거짓임을 추가로 단언해 반전을 잡습니다.
test("VC5. 빈 값·5자리에서 거짓이다 — 4자리에서도 거짓임을 더해 옛 규칙 반전을 잡는다", () => {
  expect(isVerificationCodeComplete("")).toBe(false);
  expect(isVerificationCodeComplete("12345")).toBe(false);
  expect(isVerificationCodeComplete("1234")).toBe(false);
});

test("VC6. isVerificationCodeRejected가 칸이 찼는데 완성이 아닐 때 참이다", () => {
  // 원값은 7자(코드 포인트 기준)이지만 정규화하면 "12345"(5자)입니다 — 찼지만
  // 완성이 아닙니다.
  expect(isVerificationCodeRejected("1*2345")).toBe(true);
});

// VC7 — 거짓 쪽입니다. 「늘 참」 스텁을 잡는 자리입니다.
test("VC7. isVerificationCodeRejected가 나머지에서 거짓이다", () => {
  const notRejected = [
    "", // 아직 안 찼습니다
    "1*2", // 아직 안 찼습니다
    "123456", // 완성입니다
    "1*23456", // 버려졌지만 결국 완성입니다(6자리 남습니다)
    "1234567", // 완성입니다(앞 6자리로 자릅니다)
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

test("VC9. canSubmitVerificationCode — 완성이고 요청 중이 아닐 때만 참", () => {
  expect(canSubmitVerificationCode("123456", { kind: "idle" })).toBe(true);
  expect(canSubmitVerificationCode("123456", { kind: "failed", reason: "invalid-code" })).toBe(
    true,
  );
  expect(canSubmitVerificationCode("123456", { kind: "verifying" })).toBe(false);
  expect(canSubmitVerificationCode("123456", { kind: "resending" })).toBe(false);
  expect(canSubmitVerificationCode("12345", { kind: "idle" })).toBe(false);
});
