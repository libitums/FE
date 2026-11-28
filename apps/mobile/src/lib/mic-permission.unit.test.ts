import { describe, expect, test } from "vitest";

import { micAnswerOf, micGateOf, micSheetOnOpen } from "./mic-permission";
import type { MicGate } from "./mic-permission";
import type { SpeechPermissionState, SpeechStatus } from "./speech-recognition";

// `unit` 계층: 마이크 권한 상태 → 띄울 시트의 순수 규칙입니다(ADR-0206 D1 · D2).

function statusOf(
  microphone: SpeechPermissionState,
  speechRecognition: SpeechPermissionState,
  recognizerAvailable = true,
): SpeechStatus {
  return {
    microphone,
    speechRecognition,
    recognizerAvailable,
    supportsOnDevice: true,
    locale: "ko-KR",
    listening: false,
    bufferCount: 0,
    level: 0,
    peakLevel: 0,
  };
}

describe("micGateOf", () => {
  const table: readonly (readonly [string, SpeechStatus, MicGate])[] = [
    ["둘 다 허용 · 인식기 있음", statusOf("granted", "granted"), "ready"],
    ["둘 다 허용 · 인식기 없음", statusOf("granted", "granted", false), "unavailable"],
    ["마이크 미요청", statusOf("not-determined", "granted"), "ask"],
    ["인식 미요청(마이크 거부여도 묻기가 먼저)", statusOf("denied", "not-determined"), "ask"],
    ["마이크 거부", statusOf("denied", "granted"), "denied"],
    ["인식만 거부(iOS)", statusOf("granted", "denied"), "denied"],
    ["거부 + 제한 — 되돌릴 수 있는 쪽이 있으면 거부", statusOf("denied", "restricted"), "denied"],
    ["제한(기기 정책)", statusOf("granted", "restricted"), "unavailable"],
    ["모름", statusOf("unknown", "granted"), "unavailable"],
  ];
  test.each(table)("MP-U1. %s", (_label, status, gate) => {
    expect(micGateOf(status)).toBe(gate);
  });
});

describe("micSheetOnOpen", () => {
  test("MP-U2. 아직 묻지 않았고 사전 안내를 본 적 없으면 사전 안내다", () => {
    expect(micSheetOnOpen("ask", false)).toBe("prime");
  });

  test("MP-U3. 사전 안내를 한 번 본 뒤에는 다시 띄우지 않는다(마이크를 누를 때 시스템 창)", () => {
    expect(micSheetOnOpen("ask", true)).toBeNull();
  });

  test("MP-U4. 거부면 사전 안내를 봤든 말든 거부 시트, 준비 · 되돌릴 수 없음은 시트가 없다", () => {
    expect(micSheetOnOpen("denied", false)).toBe("denied");
    expect(micSheetOnOpen("denied", true)).toBe("denied");
    expect(micSheetOnOpen("ready", false)).toBeNull();
    expect(micSheetOnOpen("unavailable", false)).toBeNull();
  });
});

describe("micAnswerOf", () => {
  test("MP-U5. 둘 다 허용이면 allowed — 인식기가 없어도 권한 답은 허용이다", () => {
    expect(micAnswerOf(statusOf("granted", "granted"))).toBe("allowed");
    expect(micAnswerOf(statusOf("granted", "granted", false))).toBe("allowed");
  });

  test("MP-U6. 하나라도 거부 · 제한이면 denied", () => {
    expect(micAnswerOf(statusOf("denied", "granted"))).toBe("denied");
    expect(micAnswerOf(statusOf("granted", "restricted"))).toBe("denied");
  });

  test("MP-U7. 아직 미요청 · 모름이 남아 있으면 답이 없다(이벤트를 내지 않음)", () => {
    expect(micAnswerOf(statusOf("not-determined", "granted"))).toBeNull();
    expect(micAnswerOf(statusOf("granted", "unknown"))).toBeNull();
  });
});
