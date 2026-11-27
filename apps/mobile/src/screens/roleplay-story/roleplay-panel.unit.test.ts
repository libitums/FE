import { describe, expect, it } from "vitest";

import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import { wordDiff } from "../../lib/syllable-diff";
import { initialRoleplayTalkState, roleplayTalkReducer } from "./roleplay-story";
import {
  roleplayAutoAdvanceReady,
  roleplayDialogLinesOf,
  roleplayHeaderLabel,
  roleplayProgressSegments,
  roleplayTurnReportOf,
} from "./roleplay-panel";
import type { RoleplayTalkState } from "./roleplay-story.contract";

// `unit` 계층: 롤플레이 아래 패널(시안 R1 ~ R5) — 힌트 단계 · 판정 담기 · 턴 보고 · 낱말 차이 · 머리 · 칸 막대.

const judged = (grade: SpokenAnswerJudgement["grade"]): SpokenAnswerJudgement => ({
  result: grade === "incorrect" ? "incorrect" : "correct",
  grade,
  expected: "카드로 할게요.",
  similarity: 1,
});
const stateOf = (overrides: Partial<RoleplayTalkState>): RoleplayTalkState => ({
  ...initialRoleplayTalkState,
  ...overrides,
});

describe("RP1 힌트 단계 — 뜻(늘) → 소리 → 한국어", () => {
  it("hint는 패널을 열고, 소리 · 한국어는 쓴 힌트를 남긴다(한국어가 더 강하다)", () => {
    let state = roleplayTalkReducer(initialRoleplayTalkState, { type: "hint" });
    expect(state.hintShown).toBe(true);
    expect(state.hintUsed).toBeNull();
    state = roleplayTalkReducer(state, { type: "hintListen" });
    expect(state.hintUsed).toBe("listen");
    state = roleplayTalkReducer(state, { type: "hintShow" });
    expect(state.hintUsed).toBe("show");
    state = roleplayTalkReducer(state, { type: "hintListen" });
    expect(state.hintUsed).toBe("show");
  });

  it("다음 턴이면 힌트가 접히고 기록이 비워진다", () => {
    const state = roleplayTalkReducer(
      stateOf({
        phase: "heard",
        verdict: "correct",
        judgement: judged("perfect"),
        hintUsed: "show",
      }),
      { type: "next" },
    );
    expect(state.hintShown).toBe(false);
    expect(state.hintUsed).toBeNull();
    expect(state.judgement).toBeNull();
  });
});

describe("RP2 판정 담기", () => {
  it("heard는 등급 · 모범 문장까지 담는다", () => {
    const state = roleplayTalkReducer(stateOf({ phase: "listening" }), {
      type: "heard",
      text: "카드루 할게요",
      verdict: "correct",
      judgement: judged("close"),
    });
    expect(state.judgement?.grade).toBe("close");
    expect(state.verdict).toBe("correct");
  });
});

describe("RP3 턴 보고(측정)", () => {
  it("넘길 때 결과 · 등급 · 힌트를 싣는다 — 들은 글자는 싣지 않는다", () => {
    const report = roleplayTurnReportOf(
      stateOf({
        turnIndex: 1,
        phase: "heard",
        verdict: "correct",
        judgement: judged("close"),
        heard: "카드루",
        hintUsed: "listen",
      }),
      "next",
    );
    expect(report).toEqual({ turn: 2, result: "correct", grade: "close", hintUsed: "listen" });
  });

  it("건너뛰면 skipped이고 등급이 없다", () => {
    expect(roleplayTurnReportOf(stateOf({ turnIndex: 0 }), "skip")).toEqual({
      turn: 1,
      result: "skipped",
    });
  });
});

describe("RP4 낱말 차이(오답 패널)", () => {
  it("다른 낱말 통째로 표시하고 부호는 비교하지 않는다", () => {
    const diff = wordDiff("현금으로 할게요", "카드로 할게요.");
    expect(diff.heard).toEqual([
      { text: "현금으로", differs: true },
      { text: " 할게요", differs: false },
    ]);
    expect(diff.expected).toEqual([
      { text: "카드로", differs: true },
      { text: " 할게요.", differs: false },
    ]);
  });

  it("같으면 표시가 없다", () => {
    expect(wordDiff("카드로 할게요", "카드로 할게요.").expected.every((p) => !p.differs)).toBe(
      true,
    );
  });
});

describe("RP5 머리 · 진행 칸", () => {
  it("에피소드 이름표의 끝 마침표를 뗀다", () => {
    expect(roleplayHeaderLabel("Episode 1.")).toBe("Episode 1");
    expect(roleplayHeaderLabel("အပိုင်း 1။")).toBe("အပိုင်း 1");
    expect(roleplayHeaderLabel("第1集")).toBe("第1集");
  });

  it("칸 막대 — 지난 칸 done, 지금 칸은 맞힌 뒤에 done, 나머지 todo", () => {
    expect(roleplayProgressSegments(1, 3, false)).toEqual(["done", "current", "todo"]);
    expect(roleplayProgressSegments(1, 3, true)).toEqual(["done", "done", "todo"]);
    expect(roleplayProgressSegments(3, 3, false)).toEqual(["done", "done", "done"]);
  });
});

describe("RP7 맞힌 뒤 저절로 넘김 — 한 번에 한 목소리(2026-11-27 제보)", () => {
  const gate = {
    correct: true,
    minElapsed: true,
    replyEnded: true,
    waitsForReply: true,
    away: false,
  };

  it("최소 시간이 지나고 내 문장 소리가 끝나야 넘긴다", () => {
    expect(roleplayAutoAdvanceReady(gate)).toBe(true);
    expect(roleplayAutoAdvanceReady({ ...gate, replyEnded: false })).toBe(false);
    expect(roleplayAutoAdvanceReady({ ...gate, minElapsed: false })).toBe(false);
  });

  it("내 문장 소리가 없으면 최소 시간만 본다", () => {
    expect(roleplayAutoAdvanceReady({ ...gate, waitsForReply: false, replyEnded: false })).toBe(
      true,
    );
  });

  it("맞힌 국면이 아니거나 앱이 뒤로 간 뒤에는 넘기지 않는다(누르면 넘어감)", () => {
    expect(roleplayAutoAdvanceReady({ ...gate, correct: false })).toBe(false);
    expect(roleplayAutoAdvanceReady({ ...gate, away: true })).toBe(false);
  });
});

describe("RP6 대사 상자 아래 줄 — 로마자 스위치(ADR-0188) · 뜻", () => {
  const line = { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "需要塑膠袋嗎？" };

  it("켬이면 로마자 줄과 뜻 줄이 함께 선다", () => {
    expect(roleplayDialogLinesOf(line, "shown")).toEqual({
      romanization: "bongtu deurilkkayo?",
      translation: "需要塑膠袋嗎？",
    });
  });

  it("끔이면 로마자 줄이 없고 뜻 줄만 — 뜻이 없어도 로마자로 떨어지지 않는다", () => {
    expect(roleplayDialogLinesOf(line, "hidden")).toEqual({
      romanization: undefined,
      translation: "需要塑膠袋嗎？",
    });
    expect(roleplayDialogLinesOf({ ...line, en: null }, "hidden")).toEqual({
      romanization: undefined,
      translation: undefined,
    });
  });

  it("콘텐츠 로마자가 없으면 한글을 변환한 읽기", () => {
    expect(roleplayDialogLinesOf({ ko: "네", roman: null, en: null }, "shown").romanization).toBe(
      "ne",
    );
  });
});
