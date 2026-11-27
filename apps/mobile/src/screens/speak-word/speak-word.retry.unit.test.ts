import { describe, expect, it } from "vitest";

import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  initialSpeakWordSessionState,
  speakWordJudgedControls,
  speakWordMicStateOf,
  speakWordResultAnnouncement,
  speakWordSessionReducer,
} from "./speak-word";
import type { SpeakWordQuestion, SpeakWordSessionState } from "./speak-word.contract";

// `unit` 계층: 말하기 퀴즈 결과 시트(시안 S2 ~ S4) — 다시 말하기 한 번 · 자동 넘김 없음 · 마이크 국면 · 알림.

const heard = (text: string): SpeechAttemptPhase => ({ kind: "heard", text });
const judgement = (grade: SpokenAnswerJudgement["grade"]): SpokenAnswerJudgement => ({
  result: grade === "incorrect" ? "incorrect" : "correct",
  grade,
  expected: "카드",
  similarity: grade === "perfect" ? 1 : 0.5,
});
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

describe("SR1 다시 말하기 한 번", () => {
  it("처음 오답이면 start가 같은 문항을 다시 듣고, 틀린 말은 목록에서 빠진다", () => {
    const wrong = stateOf({
      phase: heard("카페"),
      heard: ["카페"],
      judgement: judgement("incorrect"),
    });
    const next = speakWordSessionReducer(wrong, { type: "start" });
    expect(next.phase).toEqual({ kind: "listening" });
    expect(next.heard).toEqual([]);
    expect(next.attempt).toBe(1);
    expect(next.judgement).toBeNull();
    expect(next.questionIndex).toBe(0);
  });

  it("두 번째 오답 · 정답 뒤의 start는 같은 참조다", () => {
    for (const state of [
      stateOf({ phase: heard("카페"), judgement: judgement("incorrect"), attempt: 1 }),
      stateOf({ phase: heard("카드"), judgement: judgement("perfect") }),
      stateOf({ phase: heard("카트"), judgement: judgement("close") }),
    ]) {
      expect(speakWordSessionReducer(state, { type: "start" })).toBe(state);
    }
  });

  it("다음 문항으로 가면 시도 수가 0으로 돌아간다", () => {
    const second = stateOf({ phase: heard("카페"), judgement: judgement("incorrect"), attempt: 1 });
    expect(speakWordSessionReducer(second, { type: "next" }).attempt).toBe(0);
  });
});

describe("SR2 결과 뒤 조작 — 자동 넘김 없이 Continue", () => {
  it("맞으면 Continue 하나", () => {
    expect(speakWordJudgedControls(judgement("perfect"), 0)).toEqual({
      primary: "next",
      secondary: null,
    });
    expect(speakWordJudgedControls(judgement("close"), 0)).toEqual({
      primary: "next",
      secondary: null,
    });
  });

  it("처음 오답이면 Try again + Next, 두 번째면 Continue 하나", () => {
    expect(speakWordJudgedControls(judgement("incorrect"), 0)).toEqual({
      primary: "retry",
      secondary: "next",
    });
    expect(speakWordJudgedControls(judgement("incorrect"), 1)).toEqual({
      primary: "next",
      secondary: null,
    });
  });
});

describe("SR3 마이크 국면", () => {
  it("그림 로딩 · 쓸 수 없음은 꺼짐, 듣는 중은 멈춤을 누르면 확인 중", () => {
    expect(speakWordMicStateOf({ kind: "ready" }, "loading", false)).toBe("disabled");
    expect(speakWordMicStateOf({ kind: "ready" }, "loaded", false)).toBe("idle");
    expect(speakWordMicStateOf({ kind: "listening" }, "loaded", false)).toBe("listening");
    expect(speakWordMicStateOf({ kind: "listening" }, "loaded", true)).toBe("checking");
    expect(speakWordMicStateOf({ kind: "unavailable", reason: "blocked" }, "loaded", false)).toBe(
      "disabled",
    );
    expect(
      speakWordMicStateOf({ kind: "unavailable", reason: "dictation-off" }, "loaded", false),
    ).toBe("idle");
    expect(speakWordMicStateOf({ kind: "missed", reason: "no-match" }, "loaded", false)).toBe(
      "idle",
    );
  });

  it("인식 실패(다시 말할 수 있음)는 마이크가 눌린다 — 다시 말하기를 마이크 하나가 맡는다(2026-11-27 사용자 결정)", () => {
    expect(speakWordMicStateOf({ kind: "unavailable", reason: "failed" }, "loaded", false)).toBe(
      "idle",
    );
  });
});

describe("SR4 결과 알림(live region 대신 announce)", () => {
  it("perfect는 판정만, close는 모범 답안, 오답은 들은 말과 정답", () => {
    expect(speakWordResultAnnouncement(question, judgement("perfect"), "카드", uiCopyEn)).toBe(
      "Result, correct",
    );
    expect(speakWordResultAnnouncement(question, judgement("close"), "카트", uiCopyEn)).toBe(
      "Result, correct, Model answer: 카드 · kadeu",
    );
    expect(speakWordResultAnnouncement(question, judgement("incorrect"), "카페", uiCopyEn)).toBe(
      "Result, incorrect, You said: 카페, Answer: 카드 · kadeu",
    );
  });
});
