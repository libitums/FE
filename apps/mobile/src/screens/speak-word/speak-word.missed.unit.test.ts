import { describe, expect, it } from "vitest";

import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import {
  initialSpeakWordSessionState,
  speakWordControlsOf,
  speakWordHintOf,
  speakWordResultAt,
  speakWordSessionReducer,
} from "./speak-word";
import type { SpeakWordQuestion, SpeakWordSessionState } from "./speak-word.contract";

// `unit` 계층: 못 알아들음(missed)에서 낱말 말하기가 판정 없이 같은 문항을 다시 듣게 하는 표입니다(ADR-0179).

const listening: SpeechAttemptPhase = { kind: "listening" };
const noMatch: SpeechAttemptPhase = { kind: "missed", reason: "no-match" };
const network: SpeechAttemptPhase = { kind: "missed", reason: "network" };

const stateOf = (overrides: Partial<SpeakWordSessionState>): SpeakWordSessionState => ({
  ...initialSpeakWordSessionState,
  ...overrides,
});

const question: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};

describe("speakWordSessionReducer — 못 알아들음", () => {
  it("SW-M1. 듣는 중에 온 missed는 국면이 되고 들은 목록 · 가용성은 그대로다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: listening, heard: ["카드"] }), {
      type: "outcome",
      outcome: { kind: "missed", reason: "no-match" },
    });
    expect(next.phase).toEqual(noMatch);
    expect(next.heard).toEqual(["카드"]);
    expect(next.availability).toBe("open");
    expect(next.questionIndex).toBe(0);
  });

  it("SW-M2. missed에서 start는 같은 문항을 다시 듣는다(문항 · 목록은 그대로)", () => {
    for (const phase of [noMatch, network]) {
      const next = speakWordSessionReducer(stateOf({ phase, questionIndex: 1 }), {
        type: "start",
      });
      expect(next.phase).toEqual(listening);
      expect(next.questionIndex).toBe(1);
      expect(next.heard).toEqual([]);
    }
  });

  it("SW-M3. missed에서 Skip은 목록에 null을 더하고 다음 문항으로 간다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: noMatch }), { type: "skip" });
    expect(next.questionIndex).toBe(1);
    expect(next.heard).toEqual([null]);
    expect(next.phase).toEqual({ kind: "ready" });
  });

  it("SW-M4. missed에서 next는 같은 참조다 — 판정이 없어 넘어가지 않는다", () => {
    const state = stateOf({ phase: noMatch });
    expect(speakWordSessionReducer(state, { type: "next" })).toBe(state);
  });

  it("SW-M5. missed는 판정을 내지 않는다(틀림으로 세지 않는다)", () => {
    expect(speakWordResultAt(question, stateOf({ phase: noMatch }))).toBeNull();
  });
});

describe("조작 · 안내 — 못 알아들음", () => {
  it("SW-M6. 주 버튼은 Try again, 보조는 Skip이다(그림 상태와 상관없이)", () => {
    for (const phase of [noMatch, network]) {
      expect(speakWordControlsOf(phase, "loaded")).toEqual({ primary: "retry", secondary: "skip" });
      expect(speakWordControlsOf(phase, "failed")).toEqual({ primary: "retry", secondary: "skip" });
    }
  });

  it("SW-M7. 안내 줄은 까닭마다 다르다 — 못 알아들음 · 네트워크", () => {
    expect(speakWordHintOf(noMatch, markedUiCopy)).toBe("⟦speaking.notCaught⟧");
    expect(speakWordHintOf(network, markedUiCopy)).toBe("⟦speaking.networkRetry⟧");
  });
});
