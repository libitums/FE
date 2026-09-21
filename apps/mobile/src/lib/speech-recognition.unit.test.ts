import { expect, test } from "vitest";

import { speechPermissionState, speechResult, speechStatus } from "./speech-recognition";

// 이 파일이 보는 것은 접점의 **페이로드 파서 셋**이다 — 나머지 export는 전역
// `NativeModules`를 읽으므로 순수 함수가 아니고, 그 경계는 integration 계층이 진다
// (ADR-0006 D4). 형태의 정본: ./handwriting-recognition.unit.test.ts
//
// 파서는 던지지 않는다. 모양이 어긋난 값이 오면 예외가 아니라 그 자리의 빈 값이 답이다.

// ------------------------------------------------------------------ 권한 상태

test("아는 권한 낱말은 그대로 남는다", () => {
  expect(speechPermissionState("not-determined")).toBe("not-determined");
  expect(speechPermissionState("granted")).toBe("granted");
  expect(speechPermissionState("denied")).toBe("denied");
  expect(speechPermissionState("unknown")).toBe("unknown");
});

// ⭐ ADR-0026 D3: 되돌릴 수 있는 거부와 되돌릴 수 없는 제한은 화면이 할 일이 다르다.
test("restricted는 denied로 접히지 않는다", () => {
  expect(speechPermissionState("restricted")).toBe("restricted");
  expect(speechPermissionState("restricted")).not.toBe("denied");
});

test("아는 낱말이 아니면 unknown이고 던지지 않는다", () => {
  expect(speechPermissionState("허용됨")).toBe("unknown");
  expect(speechPermissionState(undefined)).toBe("unknown");
  expect(speechPermissionState(null)).toBe("unknown");
  expect(speechPermissionState(1)).toBe("unknown");
});

// ------------------------------------------------------------------ 상태 페이로드

test("상태 페이로드의 키들이 타입 있는 모양으로 올라온다", () => {
  expect(
    speechStatus({
      microphone: "granted",
      speechRecognition: "restricted",
      recognizerAvailable: true,
      supportsOnDevice: false,
      locale: "ko-KR",
      listening: true,
      bufferCount: 12,
      level: 0.25,
      peakLevel: 0.5,
    }),
  ).toEqual({
    microphone: "granted",
    speechRecognition: "restricted",
    recognizerAvailable: true,
    supportsOnDevice: false,
    locale: "ko-KR",
    listening: true,
    bufferCount: 12,
    level: 0.25,
    peakLevel: 0.5,
  });
});

// 권한 둘이 각각 필드로 남는다 — 한쪽만 거부된 조합이 실재하므로 뭉치지 않는다.
test("권한 조합이 어느 쪽으로도 뭉치지 않는다", () => {
  const status = speechStatus({ microphone: "granted", speechRecognition: "denied" });

  expect(status.microphone).toBe("granted");
  expect(status.speechRecognition).toBe("denied");
});

test("상태 페이로드가 어그러져도 던지지 않고 빈 값으로 선다", () => {
  const status = speechStatus(null);

  expect(status.microphone).toBe("unknown");
  expect(status.speechRecognition).toBe("unknown");
  expect(status.locale).toBe("");
  expect(status.listening).toBe(false);
  expect(status.bufferCount).toBe(0);
});

test("읽을 수 없는 수는 0으로 모인다", () => {
  expect(speechStatus({ level: Number.NaN, peakLevel: "0.5" }).level).toBe(0);
  expect(speechStatus({ level: Number.NaN, peakLevel: "0.5" }).peakLevel).toBe(0);
});

// ------------------------------------------------------------------ 결과 페이로드

test("아는 status는 그대로 남는다", () => {
  expect(speechResult({ status: "recognized" }).status).toBe("recognized");
  expect(speechResult({ status: "permission-denied" }).status).toBe("permission-denied");
  expect(speechResult({ status: "already-listening" }).status).toBe("already-listening");
});

test("아는 낱말이 아닌 status는 malformed이고 나머지 키는 그대로 읽힌다", () => {
  const result = speechResult({ status: "끝남", text: "안녕", durationMs: 700 });

  // 페이로드 하나가 통째로 버려지지 않는다 — 볼 수 있었던 것을 스스로 지우지 않는다.
  expect(result.status).toBe("malformed");
  expect(result.text).toBe("안녕");
  expect(result.durationMs).toBe(700);
});

// ⭐ 빈 문자열은 「듣고도 못 읽었다」의 정식 기록값이다.
test("빈 문자열은 오류로 접히지 않는다", () => {
  const result = speechResult({ status: "recognized", text: "" });

  expect(result.status).toBe("recognized");
  expect(result.text).toBe("");
});

test("온디바이스 네 축이 각각 남는다", () => {
  const result = speechResult({
    status: "recognized",
    requestedOnDevice: true,
    supportsOnDevice: false,
    requiresOnDevice: false,
    onDevice: "not-guaranteed",
  });

  // 요청했는데 기기가 못 한 자리다 — 요청을 안 한 것과 갈려야 한다.
  expect(result.requestedOnDevice).toBe(true);
  expect(result.supportsOnDevice).toBe(false);
  expect(result.requiresOnDevice).toBe(false);
  expect(result.onDevice).toBe("not-guaranteed");
});

test("모르는 onDevice 값은 보장으로 올라가지 않는다", () => {
  expect(speechResult({ onDevice: "server" }).onDevice).toBe("not-guaranteed");
  expect(speechResult({}).onDevice).toBe("not-guaranteed");
  expect(speechResult({ onDevice: "guaranteed" }).onDevice).toBe("guaranteed");
});

test("결과 페이로드가 어그러져도 던지지 않고 malformed로 선다", () => {
  expect(() => speechResult(null)).not.toThrow();
  expect(speechResult(null).status).toBe("malformed");
  expect(speechResult([]).status).toBe("malformed");
  expect(speechResult("recognized").status).toBe("malformed");
});

test("오류 필드가 그대로 올라온다", () => {
  const result = speechResult({
    status: "recognition-failed",
    errorDomain: "kAFAssistantErrorDomain",
    errorCode: 1110,
    errorMessage: "No speech detected",
  });

  expect(result.errorDomain).toBe("kAFAssistantErrorDomain");
  expect(result.errorCode).toBe(1110);
  expect(result.errorMessage).toBe("No speech detected");
});
