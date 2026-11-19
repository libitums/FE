import { describe, expect, test } from "vitest";

import { speechDiagnosticField, speechItemReportOf } from "./item-answer";
import type { SpeechDiagnostic } from "./speech-attempt";

// `unit` 계층: 말하기 국면 → 보고의 `speech` 키(인식 진단)만 봅니다.

const diagnostic: SpeechDiagnostic = {
  errorCode: 13,
  fallback: "on-device-error",
  koreanPack: "available",
};

describe("speechDiagnosticField", () => {
  test("ID1. 인식기가 결과를 올린 국면은 진단을 speech로 싣는다", () => {
    expect(
      speechDiagnosticField({ kind: "unavailable", reason: "failed", diagnostic }),
    ).toEqual({ speech: diagnostic });
    expect(speechDiagnosticField({ kind: "heard", text: "카드", diagnostic })).toEqual({
      speech: diagnostic,
    });
  });

  test("ID3. 말하기 보고: 건너뜀은 까닭과 진단을, 판정은 진단만 싣는다", () => {
    const failed = { kind: "unavailable", reason: "failed", diagnostic } as const;
    expect(speechItemReportOf(1, "skipped", "compact", failed)).toEqual({
      questionIndex: 1,
      outcome: "skipped",
      density: "compact",
      skipReason: "unavailable:failed",
      speech: diagnostic,
    });
    expect(speechItemReportOf(0, "skipped", "regular", { kind: "ready" })).toEqual({
      questionIndex: 0,
      outcome: "skipped",
      density: "regular",
      skipReason: "user",
    });
    expect(
      speechItemReportOf(2, "correct", "regular", { kind: "heard", text: "카드", diagnostic }),
    ).toEqual({ questionIndex: 2, outcome: "correct", density: "regular", speech: diagnostic });
  });

  test("ID2. 결과가 없던 국면(준비 · 듣는 중 · 접점 없음 · 권한)은 speech 키가 없다", () => {
    expect(speechDiagnosticField({ kind: "ready" })).toEqual({});
    expect(speechDiagnosticField({ kind: "listening" })).toEqual({});
    expect(speechDiagnosticField({ kind: "unavailable", reason: "blocked" })).toEqual({});
  });
});
