import { describe, expect, it } from "vitest";

import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import {
  initialReadAloudSessionState,
  readAloudControlsOf,
  readAloudHintOf,
  readAloudRemainingCount,
  readAloudSessionReducer,
} from "./read-aloud";
import type { ReadAloudQuestion, ReadAloudSessionState } from "./read-aloud.contract";

// `unit` 계층: 따라 읽기의 권한 다시 열림 · 인식 실패 다시 말하기 · 남은 문항 수(ADR-0206 D3 · D4 · D5).

const blocked: SpeechAttemptPhase = { kind: "unavailable", reason: "blocked" };
const failed: SpeechAttemptPhase = { kind: "unavailable", reason: "failed" };

const stateOf = (overrides: Partial<ReadAloudSessionState>): ReadAloudSessionState => ({
  ...initialReadAloudSessionState,
  ...overrides,
});

const question: ReadAloudQuestion = {
  sentence: "안녕하세요.",
  romanization: "annyeonghaseyo",
  translation: "Hello.",
};

describe("readAloudSessionReducer — reopen", () => {
  it("RA-P1. 잠긴 활동의 불가(blocked) 국면은 준비로, 잠금은 열림으로 돌아간다", () => {
    const next = readAloudSessionReducer(
      stateOf({ phase: blocked, availability: "blocked", skippedCount: 1 }),
      { type: "reopen" },
    );
    expect(next.phase).toEqual({ kind: "ready" });
    expect(next.availability).toBe("open");
    expect(next.skippedCount).toBe(1);
  });

  it("RA-P2. 열려 있고 불가 국면이 아니면 같은 참조다", () => {
    const state = stateOf({ phase: { kind: "heard", text: "안녕" } });
    expect(readAloudSessionReducer(state, { type: "reopen" })).toBe(state);
  });
});

describe("인식 실패(failed) — 다시 말하기", () => {
  it("RA-P3. 인식 실패에서 start는 듣는 중, 조작은 Try again · Skip, 안내는 거부와 다르다", () => {
    expect(readAloudSessionReducer(stateOf({ phase: failed }), { type: "start" }).phase).toEqual({
      kind: "listening",
    });
    expect(readAloudControlsOf(failed)).toEqual({ primary: "retry", secondary: "skip" });
    expect(readAloudHintOf(question, failed, markedUiCopy)).toBe("⟦micPermission.listenFailed⟧");
    expect(readAloudHintOf(question, blocked, markedUiCopy)).toBe(
      "⟦speaking.recognitionUnavailable⟧",
    );
  });
});

describe("readAloudRemainingCount", () => {
  it("RA-P4. 지금 문항을 포함해 남은 문항 수다", () => {
    expect(readAloudRemainingCount(stateOf({ questionIndex: 1 }), 3)).toBe(2);
    expect(readAloudRemainingCount(initialReadAloudSessionState, 3)).toBe(3);
    expect(readAloudRemainingCount(stateOf({ questionIndex: 3 }), 3)).toBe(0);
  });
});
