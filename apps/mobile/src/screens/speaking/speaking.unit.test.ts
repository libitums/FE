import { describe, expect, it } from "vitest";

import {
  initialSpeakingSessionState,
  judgeSpeaking,
  matchedWordCount,
  speakingAnnouncement,
  speakingSessionReducer,
  speakingWords,
} from "./speaking";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

describe("matchedWordCount · judgeSpeaking", () => {
  it("앞에서부터 연달아 맞은 낱말만 센다", () => {
    expect(matchedWordCount("이거 주세요", "이거")).toBe(1);
    expect(matchedWordCount("이거 주세요", "이거 주세요")).toBe(2);
    expect(matchedWordCount("이거 주세요", "저거 주세요")).toBe(0);
  });

  it("문장 부호와 겹친 공백은 무시한다", () => {
    expect(matchedWordCount("이거 주세요", "이거,  주세요.")).toBe(2);
  });

  it("빈 인식은 0이고 오답이다", () => {
    expect(matchedWordCount("이거 주세요", "")).toBe(0);
    expect(judgeSpeaking("이거 주세요", "")).toBe("incorrect");
  });

  it("낱말을 전부 맞게 말해야 정답이다", () => {
    expect(judgeSpeaking("이거 주세요", "이거 주세요")).toBe("correct");
    expect(judgeSpeaking("이거 주세요", "이거")).toBe("incorrect");
  });

  it("문장을 공백으로 낱말로 가른다", () => {
    expect(speakingWords("제 이름은 민수예요")).toEqual(["제", "이름은", "민수예요"]);
  });
});

describe("speakingSessionReducer", () => {
  it("준비 → 듣는 중 → 판정 → 다음 문항", () => {
    let state = speakingSessionReducer(initialSpeakingSessionState, { type: "start" });
    expect(state.phase).toBe("listening");
    state = speakingSessionReducer(state, { type: "recognized", text: "a", result: "correct" });
    expect(state).toMatchObject({ phase: "judged", recognized: "a", results: ["correct"] });
    state = speakingSessionReducer(state, { type: "next" });
    expect(state).toMatchObject({
      questionIndex: 1,
      phase: "ready",
      recognized: "",
      results: ["correct"],
    });
  });

  it("인식을 쓸 수 없으면 결과를 싣지 않고 건너뛴다 — 기기 탓을 오답으로 접지 않는다", () => {
    let state = speakingSessionReducer(initialSpeakingSessionState, { type: "start" });
    state = speakingSessionReducer(state, { type: "unavailable" });
    expect(state.phase).toBe("unavailable");
    state = speakingSessionReducer(state, { type: "next" });
    expect(state).toMatchObject({ questionIndex: 1, results: [] });
  });

  it("듣는 중이 아닐 때 온 인식 결과는 무시한다", () => {
    const state = speakingSessionReducer(initialSpeakingSessionState, {
      type: "recognized",
      text: "a",
      result: "correct",
    });
    expect(state).toBe(initialSpeakingSessionState);
  });

  it("준비 · 듣는 중에서는 다음으로 가지 않는다", () => {
    expect(speakingSessionReducer(initialSpeakingSessionState, { type: "next" })).toBe(
      initialSpeakingSessionState,
    );
  });

  it("채점 발화는 다른 학습형과 같은 형태다", () => {
    expect(speakingAnnouncement("correct")).toBe("채점 결과, 정답");
    expect(speakingAnnouncement("incorrect")).toBe("채점 결과, 오답");
  });
});
