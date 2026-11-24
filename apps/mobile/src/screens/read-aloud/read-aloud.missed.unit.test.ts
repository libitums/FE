import { describe, expect, it } from "vitest";

import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import {
  initialReadAloudSessionState,
  readAloudControlsOf,
  readAloudHintOf,
  readAloudInstructionOf,
  readAloudMatchedCount,
  readAloudSessionReducer,
} from "./read-aloud";
import type { ReadAloudQuestion, ReadAloudSessionState } from "./read-aloud.contract";

// `unit` 계층: 못 알아들음(missed)에서 따라 읽기가 같은 문장을 곧바로 다시 듣게 하는 표입니다(ADR-0181).

const listening: SpeechAttemptPhase = { kind: "listening" };
const noMatch: SpeechAttemptPhase = { kind: "missed", reason: "no-match" };
const network: SpeechAttemptPhase = { kind: "missed", reason: "network" };

const stateOf = (overrides: Partial<ReadAloudSessionState>): ReadAloudSessionState => ({
  ...initialReadAloudSessionState,
  ...overrides,
});

const question: ReadAloudQuestion = {
  sentence: "카드로 할게요.",
  romanization: null,
  translation: null,
};

describe("readAloudSessionReducer — 못 알아들음", () => {
  it("RA-M1. 듣는 중에 온 missed는 국면이 되고 가용성을 잠그지 않는다", () => {
    const next = readAloudSessionReducer(stateOf({ phase: listening }), {
      type: "outcome",
      outcome: { kind: "missed", reason: "no-match" },
    });
    expect(next.phase).toEqual(noMatch);
    expect(next.availability).toBe("open");
  });

  it("RA-M2. missed에서 start는 같은 문장을 다시 듣는다", () => {
    for (const phase of [noMatch, network]) {
      const next = readAloudSessionReducer(stateOf({ phase, questionIndex: 2 }), { type: "start" });
      expect(next.phase).toEqual(listening);
      expect(next.questionIndex).toBe(2);
    }
  });

  it("RA-M3. missed에서 Skip은 건너뜀 수 +1로 다음 문장이다", () => {
    const next = readAloudSessionReducer(stateOf({ phase: noMatch }), { type: "skip" });
    expect(next.questionIndex).toBe(1);
    expect(next.skippedCount).toBe(1);
  });
});

describe("조작 · 안내 — 못 알아들음", () => {
  it("RA-M4. 주 버튼은 Try again, 보조는 Skip이다", () => {
    expect(readAloudControlsOf(noMatch)).toEqual({ primary: "retry", secondary: "skip" });
    expect(readAloudControlsOf(network)).toEqual({ primary: "retry", secondary: "skip" });
  });

  it("RA-M5. 안내 줄은 까닭마다 다르고 지시문 · 맞은 수는 그대로다", () => {
    expect(readAloudHintOf(question, noMatch, markedUiCopy)).toBe("⟦speaking.notCaught⟧");
    expect(readAloudHintOf(question, network, markedUiCopy)).toBe("⟦speaking.networkRetry⟧");
    expect(readAloudInstructionOf(noMatch, markedUiCopy)).toBe("⟦speaking.instruction⟧");
    expect(readAloudMatchedCount(question, noMatch)).toBe(0);
  });
});
