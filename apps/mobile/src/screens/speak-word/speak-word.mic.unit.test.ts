import { describe, expect, it } from "vitest";

import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import {
  initialSpeakWordSessionState,
  speakWordControlsOf,
  speakWordHintOf,
  speakWordSessionReducer,
  speakWordSkipRest,
} from "./speak-word";
import type { SpeakWordSessionState } from "./speak-word.contract";

// `unit` 계층: 낱말 말하기의 권한 다시 열림 · 인식 실패 다시 말하기 · 이 레슨의 말하기 건너뜀(ADR-0206 D3 · D4 · D5).

const blocked: SpeechAttemptPhase = { kind: "unavailable", reason: "blocked" };
const failed: SpeechAttemptPhase = { kind: "unavailable", reason: "failed" };
const dictationOff: SpeechAttemptPhase = { kind: "unavailable", reason: "dictation-off" };

const stateOf = (overrides: Partial<SpeakWordSessionState>): SpeakWordSessionState => ({
  ...initialSpeakWordSessionState,
  ...overrides,
});

describe("speakWordSessionReducer — reopen", () => {
  it("SW-P1. 잠긴 활동의 불가(blocked) 국면은 준비로, 잠금은 열림으로 돌아간다", () => {
    const next = speakWordSessionReducer(
      stateOf({ phase: blocked, availability: "blocked", heard: [null] }),
      { type: "reopen" },
    );
    expect(next.phase).toEqual({ kind: "ready" });
    expect(next.availability).toBe("open");
    expect(next.heard).toEqual([null]);
  });

  it("SW-P2. 이미 열려 있고 불가 국면이 아니면 같은 참조다(듣는 중 · 들음 · 다른 불가)", () => {
    for (const phase of [
      { kind: "ready" },
      { kind: "listening" },
      { kind: "heard", text: "카드" },
      failed,
      dictationOff,
    ] as const) {
      const state = stateOf({ phase });
      expect(speakWordSessionReducer(state, { type: "reopen" })).toBe(state);
    }
  });
});

describe("인식 실패(failed) — 다시 말하기", () => {
  it("SW-P3. 인식 실패에서 start는 듣는 중이 되고 잠그지 않는다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: failed }), { type: "start" });
    expect(next.phase).toEqual({ kind: "listening" });
    expect(next.availability).toBe("open");
  });

  it("SW-P4. 인식 실패의 조작은 Try again(주) · Skip(보조), 거부는 그대로 Skip만이다", () => {
    expect(speakWordControlsOf(failed, "loaded")).toEqual({ primary: "retry", secondary: "skip" });
    expect(speakWordControlsOf(blocked, "loaded")).toEqual({ primary: "skip", secondary: null });
  });

  it("SW-P5. 인식 실패 안내는 거부와 다른 문구다", () => {
    expect(speakWordHintOf(failed, markedUiCopy)).toBe("⟦micPermission.listenFailed⟧");
    expect(speakWordHintOf(blocked, markedUiCopy)).toBe("⟦speakWord.recognitionUnavailable⟧");
  });
});

describe("Android 한국어 팩 없음(#555)은 그대로", () => {
  it("SW-P5b. 언어 없음 실패는 지금처럼 불가 안내 · Skip만이다", () => {
    const languageMissing: SpeechAttemptPhase = {
      kind: "unavailable",
      reason: "failed",
      diagnostic: { errorCode: 13, fallback: "none", koreanPack: "available" },
    };
    expect(speakWordControlsOf(languageMissing, "loaded")).toEqual({
      primary: "skip",
      secondary: null,
    });
    expect(speakWordHintOf(languageMissing, markedUiCopy)).toBe(
      "⟦speakWord.recognitionUnavailable⟧",
    );
    const state = stateOf({ phase: languageMissing });
    expect(speakWordSessionReducer(state, { type: "start" })).toBe(state);
  });
});

describe("speakWordSkipRest", () => {
  it("SW-P6. 지금 문항부터 끝까지 건너뜀(null)으로 채운다", () => {
    const state = stateOf({ questionIndex: 1, heard: ["카드"] });
    expect(speakWordSkipRest(state, 4)).toEqual(["카드", null, null, null]);
  });

  it("SW-P7. 첫 문항에서면 모두 건너뜀, 이미 끝났으면 그대로다", () => {
    expect(speakWordSkipRest(initialSpeakWordSessionState, 2)).toEqual([null, null]);
    const done = stateOf({ questionIndex: 2, heard: ["카드", null] });
    expect(speakWordSkipRest(done, 2)).toEqual(["카드", null]);
  });
});
