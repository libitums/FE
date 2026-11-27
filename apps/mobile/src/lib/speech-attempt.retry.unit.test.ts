import { describe, expect, test } from "vitest";

import {
  hearAnswerAfterFailures,
  speechFailuresAfter,
  speechRetryable,
  speechWavesStateOf,
} from "./speech-attempt";
import type { SpeechAttemptPhase } from "./speech-attempt";

// `unit` 계층: 인식 실패(failed)도 못 알아들음처럼 같은 문항을 다시 말하게 하는 규칙 · 연달아 실패 수(ADR-0206 D5).

const phases: Record<string, SpeechAttemptPhase> = {
  ready: { kind: "ready" },
  listening: { kind: "listening" },
  heard: { kind: "heard", text: "카드" },
  noMatch: { kind: "missed", reason: "no-match" },
  network: { kind: "missed", reason: "network" },
  failed: { kind: "unavailable", reason: "failed" },
  blocked: { kind: "unavailable", reason: "blocked" },
  dictationOff: { kind: "unavailable", reason: "dictation-off" },
};

describe("speechRetryable", () => {
  test.each([
    ["noMatch", true],
    ["network", true],
    ["failed", true],
    ["blocked", false],
    ["dictationOff", false],
    ["ready", false],
    ["listening", false],
    ["heard", false],
  ] as const)("SA-R1. %s → %s", (name, retryable) => {
    expect(speechRetryable(phases[name] as SpeechAttemptPhase)).toBe(retryable);
  });
});

describe("speechRetryable — Android 한국어 팩 없음(#555)", () => {
  const languageFailed = (koreanPack: "available" | "unknown"): SpeechAttemptPhase => ({
    kind: "unavailable",
    reason: "failed",
    diagnostic: { errorCode: 13, fallback: "none", koreanPack },
  });

  test("SA-R5. Android 언어 없음(12 · 13)은 지금 안내 그대로 — 다시 말하기가 아니다", () => {
    expect(speechRetryable(languageFailed("available"))).toBe(false);
    expect(
      speechRetryable({
        kind: "unavailable",
        reason: "failed",
        diagnostic: { errorCode: 12, fallback: "on-device-error", koreanPack: "unsupported" },
      }),
    ).toBe(false);
  });

  test("SA-R6. 한국어 팩을 싣지 않은 옛 호스트의 언어 없음도 그대로이고, 다른 코드의 실패는 다시 말하기다", () => {
    expect(speechRetryable(languageFailed("unknown"))).toBe(false);
    expect(
      speechRetryable({
        kind: "unavailable",
        reason: "failed",
        diagnostic: { errorCode: 3, fallback: "none", koreanPack: "available" },
      }),
    ).toBe(true);
  });
});

describe("speechWavesStateOf — 인식 실패", () => {
  test("SA-R2. 인식 실패는 마이크가 대기라 눌러 다시 듣고, 거부 · 받아쓰기 꺼짐은 그대로 꺼짐이다", () => {
    expect(speechWavesStateOf(phases.failed as SpeechAttemptPhase)).toBe("idle");
    expect(speechWavesStateOf(phases.blocked as SpeechAttemptPhase)).toBe("off");
    expect(speechWavesStateOf(phases.dictationOff as SpeechAttemptPhase)).toBe("off");
  });
});

describe("speechFailuresAfter", () => {
  test("SA-R3. 다시 말할 수 있는 실패마다 하나씩 쌓이고, 들으면 0, 준비 · 듣는 중 · 거부는 그대로다", () => {
    let failures = 0;
    failures = speechFailuresAfter(failures, phases.noMatch as SpeechAttemptPhase);
    failures = speechFailuresAfter(failures, phases.listening as SpeechAttemptPhase);
    failures = speechFailuresAfter(failures, phases.failed as SpeechAttemptPhase);
    expect(failures).toBe(hearAnswerAfterFailures);
    expect(speechFailuresAfter(failures, phases.blocked as SpeechAttemptPhase)).toBe(2);
    expect(speechFailuresAfter(failures, phases.ready as SpeechAttemptPhase)).toBe(2);
    expect(speechFailuresAfter(failures, phases.heard as SpeechAttemptPhase)).toBe(0);
  });

  test("SA-R4. 「정답 듣기」는 두 번 실패한 뒤에 선다", () => {
    expect(hearAnswerAfterFailures).toBe(2);
  });
});
