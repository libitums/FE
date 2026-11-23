import { describe, expect, test } from "vitest";

import type { SpeechResult, SpeechResultStatus } from "./speech-recognition-types";
import {
  speechAttemptOutcomeOf,
  speechAvailabilityAfter,
  speechBlocked,
  speechControlLabel,
  speechPhaseFor,
  speechWavesStateOf,
} from "./speech-attempt";
import type {
  SpeechAttemptOutcome,
  SpeechAttemptPhase,
  SpeechControl,
  SpeechDiagnostic,
} from "./speech-attempt";
import { markedUiCopy } from "./ui-copy.test-support";

// `unit` 계층: 인식 결과 → 결말 · 잠금 · 시작 국면 · 마이크 상태 · 조작 라벨의 입출력만 봅니다(순수 함수).

function resultOf(
  status: SpeechResultStatus,
  extra: Partial<
    Pick<SpeechResult, "text" | "errorDomain" | "errorCode" | "fallback" | "koreanPack">
  > = {},
): SpeechResult {
  return {
    status,
    text: "",
    isFinal: true,
    microphone: "granted",
    speechRecognition: "granted",
    requestedOnDevice: true,
    supportsOnDevice: true,
    requiresOnDevice: true,
    onDevice: "guaranteed",
    bufferCount: 0,
    peakLevel: 0,
    averageLevel: 0,
    durationMs: 0,
    errorDomain: "",
    errorCode: 0,
    errorMessage: "",
    koreanPack: "unknown",
    fallback: "none",
    fallbackErrorCode: 0,
    ...extra,
  };
}

const heard = (text: string): SpeechAttemptOutcome => ({ kind: "heard", text });
const unavailable = (reason: "blocked" | "dictation-off" | "failed"): SpeechAttemptOutcome => ({
  kind: "unavailable",
  reason,
});
const diagnostic = (errorCode = 0): SpeechDiagnostic => ({
  errorCode,
  fallback: "none",
  koreanPack: "unknown",
});
const heardFrom = (text: string): SpeechAttemptOutcome => ({
  kind: "heard",
  text,
  diagnostic: diagnostic(),
});
const failedFrom = (
  reason: "blocked" | "dictation-off" | "failed",
  errorCode = 0,
): SpeechAttemptOutcome => ({ kind: "unavailable", reason, diagnostic: diagnostic(errorCode) });
const dictationOff = { errorDomain: "kLSRErrorDomain", errorCode: 201 } as const;

describe("speechAttemptOutcomeOf", () => {
  const table: readonly (readonly [string, SpeechResult, SpeechAttemptOutcome])[] = [
    ["recognized 카드", resultOf("recognized", { text: "카드" }), heardFrom("카드")],
    ["recognized 빈 글자도 heard", resultOf("recognized", { text: "" }), heardFrom("")],
    ["permission-denied", resultOf("permission-denied"), failedFrom("blocked")],
    ["recognizer-unavailable", resultOf("recognizer-unavailable"), failedFrom("blocked")],
    [
      "recognition-failed + kLSRErrorDomain 201",
      resultOf("recognition-failed", dictationOff),
      failedFrom("dictation-off", 201),
    ],
    [
      "permission-denied + kLSRErrorDomain 201 (도메인 판정이 먼저)",
      resultOf("permission-denied", dictationOff),
      failedFrom("dictation-off", 201),
    ],
    [
      "recognition-failed 다른 코드",
      resultOf("recognition-failed", { errorDomain: "kLSRErrorDomain", errorCode: 203 }),
      failedFrom("failed", 203),
    ],
    [
      "recognition-failed 다른 도메인의 201",
      resultOf("recognition-failed", { errorDomain: "other", errorCode: 201 }),
      failedFrom("failed", 201),
    ],
    ["audio-failed", resultOf("audio-failed"), failedFrom("failed")],
    ["already-listening", resultOf("already-listening"), failedFrom("failed")],
    ["invalid-arguments", resultOf("invalid-arguments"), failedFrom("failed")],
    ["malformed", resultOf("malformed"), failedFrom("failed")],
  ];

  test.each(table)("SA1. %s", (_name, result, expected) => {
    expect(speechAttemptOutcomeOf(result)).toEqual(expected);
  });

  test("SA1. speechBlocked는 blocked 결말이고 진단이 없다(인식기가 결과를 올리지 않았다)", () => {
    expect(speechBlocked).toEqual(unavailable("blocked"));
    expect(speechBlocked).not.toHaveProperty("diagnostic");
  });

  test("SA1b. 진단은 오류 코드 · 되돌아감 · 한국어 팩을 결과에서 그대로 옮긴다", () => {
    const failed = resultOf("recognition-failed", {
      errorDomain: "android.speech.SpeechRecognizer",
      errorCode: 13,
      fallback: "on-device-error",
      koreanPack: "available",
    });
    expect(speechAttemptOutcomeOf(failed)).toEqual({
      kind: "unavailable",
      reason: "failed",
      diagnostic: { errorCode: 13, fallback: "on-device-error", koreanPack: "available" },
    });
    const recovered = resultOf("recognized", {
      text: "카드",
      fallback: "pack-missing",
      koreanPack: "available",
    });
    expect(speechAttemptOutcomeOf(recovered)).toEqual({
      kind: "heard",
      text: "카드",
      diagnostic: { errorCode: 0, fallback: "pack-missing", koreanPack: "available" },
    });
  });
});

describe("speechAvailabilityAfter", () => {
  test("SA2. open은 blocked 결말에서만 blocked가 된다", () => {
    expect(speechAvailabilityAfter("open", unavailable("blocked"))).toBe("blocked");
    expect(speechAvailabilityAfter("open", unavailable("failed"))).toBe("open");
    expect(speechAvailabilityAfter("open", unavailable("dictation-off"))).toBe("open");
    expect(speechAvailabilityAfter("open", heard("카드"))).toBe("open");
  });

  test("SA2. blocked는 무엇이 와도 되돌아가지 않는다", () => {
    for (const outcome of [
      heard("카드"),
      unavailable("failed"),
      unavailable("dictation-off"),
      unavailable("blocked"),
    ]) {
      expect(speechAvailabilityAfter("blocked", outcome)).toBe("blocked");
    }
  });
});

describe("speechPhaseFor", () => {
  test("SA3. open은 ready, blocked는 unavailable(blocked)이다", () => {
    expect(speechPhaseFor("open")).toEqual({ kind: "ready" });
    expect(speechPhaseFor("blocked")).toEqual({ kind: "unavailable", reason: "blocked" });
    expect(speechPhaseFor("blocked")).toEqual(speechBlocked);
  });
});

describe("speechWavesStateOf", () => {
  const table: readonly (readonly [string, SpeechAttemptPhase, string])[] = [
    ["ready", { kind: "ready" }, "idle"],
    ["listening", { kind: "listening" }, "listening"],
    ["heard", heard("카드"), "off"],
    ["blocked", unavailable("blocked"), "off"],
    ["dictation-off", unavailable("dictation-off"), "off"],
    ["failed", unavailable("failed"), "off"],
  ];

  test.each(table)("SA4. %s → %s", (_name, phase, expected) => {
    expect(speechWavesStateOf(phase)).toBe(expected);
  });
});

describe("speechControlLabel", () => {
  const table: readonly (readonly [SpeechControl, string])[] = [
    ["speak", "⟦speaking.speak⟧"],
    ["stop", "⟦speaking.stopSpeaking⟧"],
    ["next", "다음 라벨"],
    ["skip", "⟦common.skip⟧"],
    ["retry", "⟦speaking.tryAgain⟧"],
  ];

  test.each(table)("SA5. %s의 라벨", (control, expected) => {
    expect(speechControlLabel(control, "다음 라벨", markedUiCopy)).toBe(expected);
  });
});
