// 말하기 퀴즈 결과 시트의 보기 모형입니다(순수, 시안 S2 ~ S4 · ADR-0201 D6).
//
// - perfect: 초록 · 「Perfect!」 · 정답 상자만.
// - close: 초록 · 「Correct」 + 「Almost perfect」 · 「Model answer」 정답 상자 · 들은 말(다른 음절 밑줄).
// - incorrect: 흰 면 · 「Not quite」 · 「You said」 들은 말 ↔ 「Answer」 정답(양쪽 다른 음절 밑줄). 정답 상자는 늘 중립색.

import type { DiffPiece } from "../../lib/syllable-diff";
import { syllableDiff } from "../../lib/syllable-diff";
import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import type { SpeakWordQuestion } from "./speak-word.contract";

export type SpeakWordResultView = {
  /** 시트 면의 색 — 판정 색은 시트에만, 정답 상자는 늘 중립입니다. */
  readonly tone: "correct" | "incorrect";
  readonly title: "perfect" | "close" | "incorrect";
  /** 정답 상자 머리 줄 — close는 「Model answer」, 오답은 「Answer」, perfect는 없음. */
  readonly answerLabel: "model" | "answer" | null;
  /** 정답(가장 가까운 정답) — 오답일 때만 다른 음절이 표시됩니다. */
  readonly answer: readonly DiffPiece[];
  /** 정답이 첫 정답이면 그 로마자, 아니면 null. */
  readonly romanization: string | null;
  /** 들은 말 — perfect이거나 들은 글자가 비면 null. */
  readonly heard: readonly DiffPiece[] | null;
};

const plain = (text: string): readonly DiffPiece[] => [{ text, differs: false }];

export function speakWordResultView(
  question: SpeakWordQuestion,
  judgement: SpokenAnswerJudgement,
  heard: string,
): SpeakWordResultView {
  const { expected, grade } = judgement;
  const romanization = expected === question.answers[0] ? (question.romanization ?? null) : null;
  const diff = syllableDiff(heard, expected);
  const heardPieces = heard.trim() === "" || grade === "perfect" ? null : diff.heard;
  switch (grade) {
    case "perfect":
      return {
        tone: "correct",
        title: "perfect",
        answerLabel: null,
        answer: plain(expected),
        romanization,
        heard: null,
      };
    case "close":
      return {
        tone: "correct",
        title: "close",
        answerLabel: "model",
        answer: plain(expected),
        romanization,
        heard: heardPieces,
      };
    case "incorrect":
      return {
        tone: "incorrect",
        title: "incorrect",
        answerLabel: "answer",
        answer: heardPieces === null ? plain(expected) : diff.expected,
        romanization,
        heard: heardPieces,
      };
  }
}
