import { expect, test } from "vitest";

import { handwritingReadOutcome } from "./handwriting-recognition";

// 이 파일이 보는 것은 콜백 페이로드 파서 하나뿐입니다 — `isHandwritingRecognitionAvailable`과
// `readHandwriting`은 전역 `NativeModules`를 읽으므로 순수 함수가 아니고, 그 경계는
// integration 계층이 집니다.
//
// 파서는 던지지 않습니다. 모양이 어긋난 값이 오면 예외가 아니라 `malformed`가 답입니다.

// PR1 — 정상 경로이자 기준선입니다. 아래 malformed 케이스들이 이 경로와 갈리는
// 지점을 봅니다.
test("read와 텍스트가 함께 오면 읽은 결과로 남는다", () => {
  expect(handwritingReadOutcome({ status: "read", text: "한" })).toEqual({
    status: "read",
    text: "한",
  });
});

// PR2 — ⭐ 빈 문자열은 「Vision이 돌았는데 관측이 0건」의 정식 기록값입니다. malformed로
// 떨어지면 잘못입니다.
test("read와 빈 문자열이 오면 빈 문자열을 읽은 결과로 남는다", () => {
  expect(handwritingReadOutcome({ status: "read", text: "" })).toEqual({
    status: "read",
    text: "",
  });
});

// PR3 — `text`가 없으면 「읽었다」가 아닙니다.
test("read인데 text가 없으면 malformed다", () => {
  expect(handwritingReadOutcome({ status: "read" })).toEqual({ status: "malformed" });
});

// PR4 — 없음이 아니라 타입만 어긋난 값입니다. `typeof` 가드가 없으면 이 케이스가 샙니다.
test("read인데 text가 문자열이 아니면 malformed다", () => {
  expect(handwritingReadOutcome({ status: "read", text: 3 })).toEqual({ status: "malformed" });
});

// PR5~PR7 — 계약 토큰 셋이 각각 변형 없이 그대로 남는지를 같은 방식으로 봅니다.
// PR5 (language-unsupported)
test("language-unsupported는 그대로 남는다", () => {
  expect(handwritingReadOutcome({ status: "language-unsupported" })).toEqual({
    status: "language-unsupported",
  });
});

// PR6 (invalid-arguments)
test("invalid-arguments는 그대로 남는다", () => {
  expect(handwritingReadOutcome({ status: "invalid-arguments" })).toEqual({
    status: "invalid-arguments",
  });
});

// PR7 (failed)
test("failed는 그대로 남는다", () => {
  expect(handwritingReadOutcome({ status: "failed" })).toEqual({ status: "failed" });
});

// PR8 — 모르는 토큰을 그대로 통과시키면 다운스트림이 정의되지 않은 status를 만납니다.
test("계약에 없는 status 토큰은 malformed다", () => {
  expect(handwritingReadOutcome({ status: "unknown-token" })).toEqual({ status: "malformed" });
});

// PR9 — 객체가 아닌 값도 던지지 않고 malformed로 답합니다.
test("null과 undefined와 문자열과 배열은 전부 malformed다", () => {
  expect(handwritingReadOutcome(null)).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome(undefined)).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome("read")).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome([])).toEqual({ status: "malformed" });
});

// PR9와 같은 규칙을 페이로드 모양 둘에 더 겁니다 — status 자리가 계약의 토큰이 아니면
// malformed입니다.
test("status 자리가 비거나 객체가 아닌 페이로드도 malformed다", () => {
  expect(handwritingReadOutcome({})).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome(42)).toEqual({ status: "malformed" });
});

// ⭐ 핵심 구분입니다 — 「못 읽었다」와 「빈 문자열을 읽었다」는 다른 답입니다.
// 앞엣것은 결선의 문제이고 뒤엣것은 인식 품질의 문제라 다음에 할 일이 완전히 다릅니다.
test("빈 문자열을 읽은 결과는 실패와 구분된다", () => {
  const empty = handwritingReadOutcome({ status: "read", text: "" });
  const failed = handwritingReadOutcome({ status: "failed" });

  expect(empty.status).toBe("read");
  expect(failed.status).toBe("failed");
  expect(empty).not.toEqual(failed);
});
