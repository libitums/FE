import { describe, expect, test } from "vitest";

import { speechDiagnosticField } from "./item-answer";
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

  test("ID2. 결과가 없던 국면(준비 · 듣는 중 · 접점 없음 · 권한)은 speech 키가 없다", () => {
    expect(speechDiagnosticField({ kind: "ready" })).toEqual({});
    expect(speechDiagnosticField({ kind: "listening" })).toEqual({});
    expect(speechDiagnosticField({ kind: "unavailable", reason: "blocked" })).toEqual({});
  });
});
