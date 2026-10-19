// 새 형식 내장본 integration 테스트의 문항 풀이 헬퍼입니다(정답은 계획에서 읽습니다).
// 제품 코드가 import하지 않습니다. 이름에 `.test.`를 넣지 않습니다.

import { expect } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import type { CatalogActivity, CatalogLessonPlan } from "../catalog-lesson-plan";
import { catalogSpellingOf } from "../catalog-build-map";
import { isTypeableAnswer, keystrokesFor } from "../../lib/hangul-keyboard";
import type { TypingQuestion } from "../../screens/typing/typing.contract";
import { contentIdOf, tapId } from "./episode-format-harness";

const lettersOnly = (text: string) => text.normalize("NFC").replace(/[^ㄱ-ㆎ가-힣]/g, "");
export function typeKeys(text: string): void {
  for (const key of keystrokesFor(text)) tapId(`messenger-key-${key}`);
}
export function typeAnswer(question: TypingQuestion): void {
  typeKeys(lettersOnly(question.answers.find(isTypeableAnswer) ?? question.answers[0]));
}

export type SyllableQuestion = Extract<
  CatalogActivity,
  { form: "syllable-build" }
>["questions"][number];

/** 정답으로 이어지는 타일 인덱스 열입니다(철자 탐색). */
export function rightTiles(question: SyllableQuestion): readonly number[] {
  const spelling = catalogSpellingOf(question.tiles, question.answers[0]);
  if (spelling === null) throw new Error(`no spelling: ${question.answers[0]}`);
  return spelling;
}

/** 칸을 다 채우되 어느 정답과도 이어진 글자가 다른 타일 인덱스 열입니다. */
export function wrongTiles(question: SyllableQuestion): readonly number[] {
  const path: number[] = [];
  const found = (): boolean => {
    if (path.length === question.slotCount) {
      const word = path.map((index) => question.tiles[index] ?? "").join("");
      return !question.answers.includes(word);
    }
    for (let index = 0; index < question.tiles.length; index += 1) {
      if (path.includes(index)) continue;
      path.push(index);
      if (found()) return true;
      path.pop();
    }
    return false;
  };
  if (!found()) throw new Error("no wrong placement");
  return [...path];
}

export function solveSyllable(question: SyllableQuestion, right: boolean): void {
  for (const index of right ? rightTiles(question) : wrongTiles(question)) {
    tapId(`syllable-build-tile-${index}`);
  }
  tapId("learning-shell-action");
  tapId("learning-shell-action");
}

const phaseOf = (testId: string): string | null =>
  screen.getByTestId(testId).getAttribute("data-phase");

/** 읽기: 말하기를 눌러 국면을 읽고, 들렸으면 `Next`(마지막이면 `See results`), 불가면 `Skip`을 누릅니다. */
function solveReadAloud(questionCount: number): void {
  for (let index = 0; index < questionCount; index += 1) {
    if (phaseOf("read-aloud-content") === "ready") tapId("learning-shell-action");
    expect(["heard", "unavailable"]).toContain(phaseOf("read-aloud-content"));
    tapId("learning-shell-action");
  }
}

/** 낱말: 그림이 서면 말하기를 누르고, 들렸으면 넘김(`advance`), 불가면 `Skip`을 누릅니다. */
function solveSpeakWord(questionCount: number): void {
  for (let index = 0; index < questionCount; index += 1) {
    const picture = screen.queryByTestId("speak-word-picture-image");
    if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
    if (phaseOf("speak-word-content") === "ready") tapId("learning-shell-action");
    if (phaseOf("speak-word-content") === "heard") tapId("learning-shell-advance");
    else tapId("learning-shell-action");
  }
}

/**
 * 활동 하나를 끝까지 풉니다. 레슨의 마지막 활동이면 완료 카드의 `See results`까지 누르고, 중간 활동이면
 * 마지막 문항 뒤 곧바로 다음 활동으로 넘어가므로 누르지 않습니다(E-1). `right`가 거짓이면 전부 틀립니다.
 */
export function solveActivity(activity: CatalogActivity, right: boolean, last = true): void {
  switch (activity.form) {
    case "word-choice":
      for (const question of activity.questions) {
        // 그림 문항은 그림이 서야 답을 받습니다 — 먼저 load를 쏩니다.
        const picture = screen.queryByTestId("word-choice-picture-image");
        if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
        tapId(
          `word-choice-option-${right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0}`,
        );
        tapId("learning-shell-advance");
      }
      break;
    case "listening":
      for (const question of activity.questions) {
        tapId(
          `listening-choice-${right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0}`,
        );
        tapId("learning-shell-advance");
      }
      break;
    case "sentence-order":
      for (const question of activity.questions) {
        const order = right ? question.answerOrder : [...question.answerOrder].reverse();
        for (const chip of order) tapId(`sentence-order-chip-${chip}`);
        tapId("learning-shell-action");
        tapId("learning-shell-action");
      }
      break;
    case "typing":
      for (const question of activity.questions) {
        if (right) typeAnswer(question);
        else typeKeys("가");
        tapId("learning-shell-action");
        tapId("learning-shell-action");
      }
      break;
    case "vocab-card":
      // 카드는 문항 수만큼 버튼을 누릅니다 — 마지막 카드의 버튼이 곧 다음 걸음이라 완료 카드가 없습니다.
      for (let index = 0; index < activity.questions.length; index += 1) {
        tapId("learning-shell-action");
      }
      return;
    case "culture-card":
      // 문화 카드는 한 장에 두 번입니다 — 앞면의 버튼이 뒤집고(`Flip card`) 뒷면의 버튼이 넘깁니다.
      for (let index = 0; index < activity.questions.length * 2; index += 1) {
        tapId("learning-shell-action");
      }
      return;
    case "pair-match":
      for (const question of activity.questions) {
        question.answer.forEach((meaning, word) => {
          tapId(`pair-match-word-${word}`);
          tapId(`pair-match-meaning-${right ? meaning : (meaning + 1) % question.meanings.length}`);
        });
        tapId("learning-shell-action");
        tapId("learning-shell-action");
      }
      break;
    case "syllable-build":
      for (const question of activity.questions) solveSyllable(question, right);
      break;
    case "read-aloud":
      // 마지막 문항의 버튼이 곧 결과 보기라 완료 카드가 없습니다.
      solveReadAloud(activity.questions.length);
      return;
    case "speak-word":
      solveSpeakWord(activity.questions.length);
      break;
  }
  if (last) tapId("learning-shell-action");
}

/** 계획의 활동을 순서대로 풀며 서는 화면의 루트 testid를 모읍니다. */
export function solveLesson(plan: CatalogLessonPlan, right: boolean): string[] {
  const seen: string[] = [];
  plan.activities.forEach((activity, index) => {
    const id = contentIdOf[activity.form];
    expect(screen.getByTestId(id)).toBeInTheDocument();
    seen.push(id);
    solveActivity(activity, right, index === plan.activities.length - 1);
  });
  return seen;
}
