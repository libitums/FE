import { describe, expect, test } from "vitest";

import { speechDiagnosticField, speechItemReportOf, speechSkipReasonOf } from "./item-answer";
import type { SpeechResult, SpeechResultStatus } from "./speech-recognition-types";
import {
  speechAttemptOutcomeOf,
  speechAvailabilityAfter,
  speechWavesStateOf,
} from "./speech-attempt";
import type { SpeechAttemptOutcome, SpeechMissReason } from "./speech-attempt";

// `unit` 계층: 못 알아들음(no-match) · 네트워크 실패를 「인식 불가」가 아니라 「다시 말하기」 결말로 가르는 표입니다
// (ADR-0179). 화면이 아니라 결말 · 잠금 · 마이크 상태 · 건너뜀 까닭만 봅니다.

const android = "android.speech.SpeechRecognizer";
const assistant = "kAFAssistantErrorDomain";

function failedResult(
  errorDomain: string,
  errorCode: number,
  status: SpeechResultStatus = "recognition-failed",
): SpeechResult {
  return {
    status,
    text: "",
    isFinal: false,
    microphone: "granted",
    speechRecognition: "granted",
    requestedOnDevice: true,
    supportsOnDevice: true,
    requiresOnDevice: true,
    onDevice: "guaranteed",
    bufferCount: 3,
    peakLevel: 0,
    averageLevel: 0,
    durationMs: 0,
    errorDomain,
    errorCode,
    errorMessage: "",
    koreanPack: "available",
    fallback: "none",
    fallbackErrorCode: 0,
  };
}

const diagnostic = (errorCode: number) =>
  ({ errorCode, fallback: "none", koreanPack: "available" }) as const;
const missed = (reason: SpeechMissReason, errorCode: number): SpeechAttemptOutcome => ({
  kind: "missed",
  reason,
  diagnostic: diagnostic(errorCode),
});
const failed = (errorCode: number): SpeechAttemptOutcome => ({
  kind: "unavailable",
  reason: "failed",
  diagnostic: diagnostic(errorCode),
});

describe("speechAttemptOutcomeOf — 못 알아들음 · 네트워크", () => {
  const table: readonly (readonly [string, SpeechResult, SpeechAttemptOutcome])[] = [
    ["Android ERROR_NO_MATCH(7)", failedResult(android, 7), missed("no-match", 7)],
    ["Android ERROR_SPEECH_TIMEOUT(6)", failedResult(android, 6), missed("no-match", 6)],
    ["Android ERROR_NETWORK_TIMEOUT(1)", failedResult(android, 1), missed("network", 1)],
    ["Android ERROR_NETWORK(2)", failedResult(android, 2), missed("network", 2)],
    ["Android ERROR_SERVER(4)", failedResult(android, 4), missed("network", 4)],
    [
      "iOS 말 없음 kAFAssistantErrorDomain 1110",
      failedResult(assistant, 1110),
      missed("no-match", 1110),
    ],
    [
      "iOS 다시 말하기 kAFAssistantErrorDomain 203",
      failedResult(assistant, 203),
      missed("no-match", 203),
    ],
    // 진짜 불가는 그대로 남습니다 — 기기 · 언어 · 클라이언트 오류는 다시 말해도 풀리지 않습니다.
    ["Android ERROR_CLIENT(5)", failedResult(android, 5), failed(5)],
    ["Android ERROR_LANGUAGE_UNAVAILABLE(13)", failedResult(android, 13), failed(13)],
    ["Android ERROR_TOO_MANY_REQUESTS(10)", failedResult(android, 10), failed(10)],
    ["다른 도메인의 7", failedResult("other", 7), failed(7)],
    ["다른 도메인의 1110", failedResult("kLSRErrorDomain", 1110), failed(1110)],
    // 마이크 입력 실패는 코드가 7이어도 audio-failed라 불가입니다.
    ["audio-failed + Android 7", failedResult(android, 7, "audio-failed"), failed(7)],
  ];

  test.each(table)("SA-M1. %s", (_name, result, expected) => {
    expect(speechAttemptOutcomeOf(result)).toEqual(expected);
  });

  test("SA-M1. 권한 · 인식기 없음은 코드와 상관없이 blocked다", () => {
    expect(speechAttemptOutcomeOf(failedResult(android, 7, "permission-denied"))).toMatchObject({
      kind: "unavailable",
      reason: "blocked",
    });
    expect(
      speechAttemptOutcomeOf(failedResult(assistant, 1110, "recognizer-unavailable")),
    ).toMatchObject({ kind: "unavailable", reason: "blocked" });
  });
});

describe("못 알아들음은 활동을 잠그지 않고 마이크를 다시 누를 수 있다", () => {
  test("SA-M2. missed는 open을 그대로 두고 blocked도 되돌리지 않는다", () => {
    expect(speechAvailabilityAfter("open", missed("no-match", 7))).toBe("open");
    expect(speechAvailabilityAfter("open", missed("network", 2))).toBe("open");
    expect(speechAvailabilityAfter("blocked", missed("no-match", 7))).toBe("blocked");
  });

  test("SA-M3. missed 국면의 마이크는 대기(누름)다", () => {
    expect(speechWavesStateOf(missed("no-match", 7))).toBe("idle");
    expect(speechWavesStateOf(missed("network", 2))).toBe("idle");
  });
});

describe("건너뜀 까닭 · 진단", () => {
  test("SA-M4. 못 알아들은 뒤 Skip은 missed:<reason>이다", () => {
    expect(speechSkipReasonOf(missed("no-match", 7))).toBe("missed:no-match");
    expect(speechSkipReasonOf(missed("network", 2))).toBe("missed:network");
  });

  test("SA-M4. 못 알아들은 국면의 진단(오류 코드)을 보고에 싣는다", () => {
    expect(speechDiagnosticField(missed("no-match", 7))).toEqual({ speech: diagnostic(7) });
    expect(speechItemReportOf(2, "skipped", "regular", missed("no-match", 6))).toEqual({
      questionIndex: 2,
      outcome: "skipped",
      density: "regular",
      skipReason: "missed:no-match",
      speech: diagnostic(6),
    });
  });
});
