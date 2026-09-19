import { expect, test } from "vitest";

import { handwritingReadOutcome } from "./handwriting-recognition";

// 계약: .agent-harness/work/lib-263/spec.md §1.8(콜백 페이로드 파서의 경계 사례 표)
// · §4.2(결과 union) · §6.1 unit 표의 PR1~PR9. 형태의 정본: ./answer-result.unit.test.ts
//
// 이 파일이 보는 것은 §1.8의 파서 하나다 — `isHandwritingRecognitionAvailable`과
// `readHandwriting`은 전역 `NativeModules`를 읽으므로 순수 함수가 아니고, 그 경계는
// integration 계층이 진다(§6.3).
//
// 파서는 던지지 않는다. 모양이 어긋난 값이 오면 예외가 아니라 `malformed`가 답이다.

// PR1
test("read와 텍스트가 함께 오면 읽은 결과로 남는다", () => {
  expect(handwritingReadOutcome({ status: "read", text: "한" })).toEqual({
    status: "read",
    text: "한",
  });
});

// PR2 — ⭐ 빈 문자열은 「Vision이 돌았는데 관측이 0건」의 정식 기록값이다(§1.8).
test("read와 빈 문자열이 오면 빈 문자열을 읽은 결과로 남는다", () => {
  expect(handwritingReadOutcome({ status: "read", text: "" })).toEqual({
    status: "read",
    text: "",
  });
});

// PR3 — `text`가 없으면 「읽었다」가 아니다.
test("read인데 text가 없으면 malformed다", () => {
  expect(handwritingReadOutcome({ status: "read" })).toEqual({ status: "malformed" });
});

// PR4
test("read인데 text가 문자열이 아니면 malformed다", () => {
  expect(handwritingReadOutcome({ status: "read", text: 3 })).toEqual({ status: "malformed" });
});

// PR5
test("language-unsupported는 그대로 남는다", () => {
  expect(handwritingReadOutcome({ status: "language-unsupported" })).toEqual({
    status: "language-unsupported",
  });
});

// PR6
test("invalid-arguments는 그대로 남는다", () => {
  expect(handwritingReadOutcome({ status: "invalid-arguments" })).toEqual({
    status: "invalid-arguments",
  });
});

// PR7
test("failed는 그대로 남는다", () => {
  expect(handwritingReadOutcome({ status: "failed" })).toEqual({ status: "failed" });
});

// PR8
test("계약에 없는 status 토큰은 malformed다", () => {
  expect(handwritingReadOutcome({ status: "unknown-token" })).toEqual({ status: "malformed" });
});

// PR9 — §1.8 표의 마지막 행. 객체가 아닌 값도 던지지 않고 malformed로 답한다.
test("null과 undefined와 문자열과 배열은 전부 malformed다", () => {
  expect(handwritingReadOutcome(null)).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome(undefined)).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome("read")).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome([])).toEqual({ status: "malformed" });
});

// PR9와 같은 규칙을 페이로드 모양 둘에 더 건다 — status 자리가 계약의 토큰이 아니면
// malformed다. §1.8 표가 이름으로 적지 않은 자리라 표의 행들과 갈라 둔다.
test("status 자리가 비거나 객체가 아닌 페이로드도 malformed다", () => {
  expect(handwritingReadOutcome({})).toEqual({ status: "malformed" });
  expect(handwritingReadOutcome(42)).toEqual({ status: "malformed" });
});

// ⭐ 계약의 핵심 구분(§1.8) — 「못 읽었다」와 「빈 문자열을 읽었다」는 다른 답이다.
// 앞엣것은 결선의 문제이고 뒤엣것은 인식 품질의 문제라 다음에 할 일이 완전히 다르다.
test("빈 문자열을 읽은 결과는 실패와 구분된다", () => {
  const empty = handwritingReadOutcome({ status: "read", text: "" });
  const failed = handwritingReadOutcome({ status: "failed" });

  expect(empty.status).toBe("read");
  expect(failed.status).toBe("failed");
  expect(empty).not.toEqual(failed);
});
