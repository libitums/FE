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
  readAloudStepOf,
} from "./read-aloud";
import type { ReadAloudQuestion, ReadAloudSessionState } from "./read-aloud.contract";

// `unit` 계층: 따라 읽기 활동의 리듀서 · 걸음 · 조작 표 · 맞은 수 · 안내 문구의 입출력만 봅니다(순수 함수).

const ready: SpeechAttemptPhase = { kind: "ready" };
const listening: SpeechAttemptPhase = { kind: "listening" };
const heard = (text: string): SpeechAttemptPhase => ({ kind: "heard", text });
const blocked: SpeechAttemptPhase = { kind: "unavailable", reason: "blocked" };
const dictationOff: SpeechAttemptPhase = { kind: "unavailable", reason: "dictation-off" };
const failed: SpeechAttemptPhase = { kind: "unavailable", reason: "failed" };

const stateOf = (overrides: Partial<ReadAloudSessionState>): ReadAloudSessionState => ({
  ...initialReadAloudSessionState,
  ...overrides,
});

const minaQuestion: ReadAloudQuestion = {
  sentence: "미나 씨는 어느 나라에서 왔어요?",
  romanization: null,
  translation: null,
};

describe("readAloudSessionReducer — start", () => {
  it("RA1. 준비 · 들음 · 받아쓰기 꺼짐에서는 듣는 중이 된다", () => {
    for (const phase of [ready, heard("카드"), dictationOff]) {
      const next = readAloudSessionReducer(stateOf({ phase }), { type: "start" });

      expect(next.phase).toEqual(listening);
    }
  });

  it("RA1. 듣는 중 · blocked · failed에서는 같은 참조다", () => {
    for (const phase of [listening, blocked, failed]) {
      const state = stateOf({ phase });

      expect(readAloudSessionReducer(state, { type: "start" })).toBe(state);
    }
  });

  it("RA1. 시작해도 문항 번호 · 건너뜀 수는 그대로다", () => {
    const next = readAloudSessionReducer(stateOf({ questionIndex: 2, skippedCount: 1 }), {
      type: "start",
    });

    expect(next).toMatchObject({ questionIndex: 2, skippedCount: 1 });
  });
});

describe("readAloudSessionReducer — outcome", () => {
  it("RA2. 듣는 중에 들린 글자는 들음 국면이 된다", () => {
    const next = readAloudSessionReducer(stateOf({ phase: listening }), {
      type: "outcome",
      outcome: { kind: "heard", text: "카드로 할게요" },
    });

    expect(next.phase).toEqual(heard("카드로 할게요"));
    expect(next.availability).toBe("open");
  });

  it("RA2. 듣는 중에 blocked가 오면 불가 국면이 되고 가용성도 blocked가 된다", () => {
    const next = readAloudSessionReducer(stateOf({ phase: listening }), {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "blocked" },
    });

    expect(next.phase).toEqual(blocked);
    expect(next.availability).toBe("blocked");
  });

  it("RA2. failed · dictation-off 결말은 가용성을 잠그지 않는다", () => {
    for (const reason of ["failed", "dictation-off"] as const) {
      const next = readAloudSessionReducer(stateOf({ phase: listening }), {
        type: "outcome",
        outcome: { kind: "unavailable", reason },
      });

      expect(next.phase).toEqual({ kind: "unavailable", reason });
      expect(next.availability).toBe("open");
    }
  });

  it("RA2. 듣는 중이 아닐 때 온 결과는 같은 참조다(늦게 온 결과)", () => {
    for (const phase of [ready, heard("카드"), blocked, failed, dictationOff]) {
      const state = stateOf({ phase });

      expect(
        readAloudSessionReducer(state, {
          type: "outcome",
          outcome: { kind: "heard", text: "늦게 온 글자" },
        }),
      ).toBe(state);
    }
  });
});

describe("readAloudSessionReducer — next", () => {
  it("RA3. 준비 · 들음에서 다음 문항으로 가고 시작 국면은 가용성이 정한다", () => {
    for (const phase of [ready, heard("카드")]) {
      const next = readAloudSessionReducer(stateOf({ phase, questionIndex: 0, skippedCount: 1 }), {
        type: "next",
      });

      expect(next).toEqual({
        questionIndex: 1,
        phase: ready,
        availability: "open",
        skippedCount: 1,
      });
    }
  });

  it("RA3. 듣는 중 · 불가 국면에서는 같은 참조다", () => {
    for (const phase of [listening, blocked, failed, dictationOff]) {
      const state = stateOf({ phase });

      expect(readAloudSessionReducer(state, { type: "next" })).toBe(state);
    }
  });
});

describe("readAloudSessionReducer — skip", () => {
  it("RA4. 불가 국면 셋에서는 다음 문항으로 가며 건너뜀 수가 하나 늘어난다", () => {
    for (const phase of [blocked, dictationOff, failed]) {
      const next = readAloudSessionReducer(stateOf({ phase, skippedCount: 1 }), {
        type: "skip",
      });

      expect(next).toMatchObject({ questionIndex: 1, skippedCount: 2 });
    }
  });

  it("RA4. 준비 · 들음 · 듣는 중에서는 같은 참조이고 건너뜀으로 세지 않는다", () => {
    for (const phase of [ready, heard("카드"), listening]) {
      const state = stateOf({ phase });

      expect(readAloudSessionReducer(state, { type: "skip" })).toBe(state);
    }
  });

  it("RA4. blocked 뒤 Skip하면 다음 문항이 곧장 불가 국면으로 선다", () => {
    let state = readAloudSessionReducer(initialReadAloudSessionState, { type: "start" });
    state = readAloudSessionReducer(state, {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "blocked" },
    });
    state = readAloudSessionReducer(state, { type: "skip" });

    expect(state).toEqual({
      questionIndex: 1,
      phase: blocked,
      availability: "blocked",
      skippedCount: 1,
    });
  });

  it("RA4. failed 뒤 Skip하면 다음 문항은 준비 국면이다(잠기지 않는다)", () => {
    let state = readAloudSessionReducer(initialReadAloudSessionState, { type: "start" });
    state = readAloudSessionReducer(state, {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "failed" },
    });
    state = readAloudSessionReducer(state, { type: "skip" });

    expect(state).toMatchObject({ questionIndex: 1, phase: ready, availability: "open" });
  });

  it("RA4. 잠긴 활동은 문항마다 Skip을 세어 간다", () => {
    let state = stateOf({ phase: blocked, availability: "blocked" });
    state = readAloudSessionReducer(state, { type: "skip" });
    state = readAloudSessionReducer(state, { type: "skip" });
    state = readAloudSessionReducer(state, { type: "skip" });

    expect(state).toMatchObject({ questionIndex: 3, skippedCount: 3, phase: blocked });
  });
});

describe("readAloudStepOf", () => {
  it("RA5. 레슨 밖 활동은 마지막 문항 전까지 advance, 마지막은 finish다", () => {
    expect(readAloudStepOf(undefined, 0, 3)).toBe("advance");
    expect(readAloudStepOf(undefined, 2, 3)).toBe("finish");
  });

  it("RA5. 레슨 중간 활동의 마지막 문항은 hand-off, 레슨의 마지막 활동이면 finish다", () => {
    expect(readAloudStepOf({ offset: 0, total: 9, last: false }, 2, 3)).toBe("hand-off");
    expect(readAloudStepOf({ offset: 6, total: 9, last: true }, 2, 3)).toBe("finish");
    expect(readAloudStepOf({ offset: 0, total: 9, last: false }, 1, 3)).toBe("advance");
  });
});

describe("readAloudControlsOf", () => {
  it("RA6. 국면별 주 · 보조 조작 표", () => {
    expect(readAloudControlsOf(ready)).toEqual({ primary: "speak", secondary: "next" });
    expect(readAloudControlsOf(listening)).toEqual({ primary: "stop", secondary: null });
    expect(readAloudControlsOf(heard("카드"))).toEqual({ primary: "next", secondary: "retry" });
    expect(readAloudControlsOf(dictationOff)).toEqual({ primary: "skip", secondary: "retry" });
    expect(readAloudControlsOf(blocked)).toEqual({ primary: "skip", secondary: null });
    expect(readAloudControlsOf(failed)).toEqual({ primary: "skip", secondary: null });
  });
});

describe("readAloudMatchedCount", () => {
  it("RA7. 들은 글자가 문장 앞에서부터 연달아 맞은 낱말 수다", () => {
    expect(readAloudMatchedCount(minaQuestion, heard("미나 씨는 어느 나라"))).toBe(3);
    expect(readAloudMatchedCount(minaQuestion, heard("미나 씨는 어느 나라에서 왔어요"))).toBe(5);
  });

  it("RA7. 빈 글자 · 다른 국면은 0이다", () => {
    expect(readAloudMatchedCount(minaQuestion, heard(""))).toBe(0);
    for (const phase of [ready, listening, blocked, failed, dictationOff]) {
      expect(readAloudMatchedCount(minaQuestion, phase)).toBe(0);
    }
  });
});

describe("readAloudHintOf · readAloudInstructionOf", () => {
  it("RA8. 들음 국면은 맞은 수 / 문장 낱말 수 안내를 낸다", () => {
    expect(readAloudHintOf(minaQuestion, heard("미나 씨는 어느 나라"), markedUiCopy)).toBe(
      "⟦readAloud.matched⟧(3, 5)",
    );
  });

  it("RA8. blocked · failed는 인식 불가 안내를 낸다", () => {
    expect(readAloudHintOf(minaQuestion, blocked, markedUiCopy)).toBe(
      "⟦speaking.recognitionUnavailable⟧",
    );
    expect(readAloudHintOf(minaQuestion, failed, markedUiCopy)).toBe(
      "⟦speaking.recognitionUnavailable⟧",
    );
  });

  it("RA8. 받아쓰기 꺼짐 · 준비 · 듣는 중은 안내 줄이 없다", () => {
    for (const phase of [dictationOff, ready, listening]) {
      expect(readAloudHintOf(minaQuestion, phase, markedUiCopy)).toBeNull();
    }
  });

  it("RA8. 지시문은 받아쓰기 꺼짐만 바뀐다", () => {
    expect(readAloudInstructionOf(dictationOff, markedUiCopy)).toBe("⟦speaking.dictationDisabled⟧");
    for (const phase of [ready, listening, heard("카드"), blocked, failed]) {
      expect(readAloudInstructionOf(phase, markedUiCopy)).toBe("⟦speaking.instruction⟧");
    }
  });
});
