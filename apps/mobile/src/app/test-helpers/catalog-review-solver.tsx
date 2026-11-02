// 틀린 문제 다시 풀기(2026-10-23) integration 테스트의 풀이 헬퍼입니다 — 문항 하나를 맞게 · 틀리게 답하고, 답한 뒤의
// 다음 걸음(넘김 · Next · 「Fixed it!」 판의 Continue)을 누릅니다. 정답은 계획에서 읽습니다.
// 제품 코드가 import하지 않습니다. 이름에 `.test.`를 넣지 않습니다.

import { expect } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { catalogSpellingOf } from "../catalog-build-map";
import type { CatalogActivity, CatalogLessonPlan } from "../catalog-lesson-plan";
import type { CatalogReviewItem } from "../catalog-review";
import { isTypeableAnswer, keystrokesFor } from "../../lib/hangul-keyboard";
import { tapTargetById } from "../../screens/sentence-order/sentence-order-check.test-support";

type Question<F extends CatalogActivity["form"]> = Extract<
  CatalogActivity,
  { form: F }
>["questions"][number];

const tapId = (id: string): void => void fireEvent.tap(tapTargetById(id), {});
const tapChoice = (index: number): void => tapId(`ui-lynx-option-selector-item-choice-${index}`);
const lettersOnly = (text: string) => text.normalize("NFC").replace(/[^ㄱ-ㆎ가-힣]/g, "");
const typeKeys = (text: string): void => {
  for (const key of keystrokesFor(text)) tapId(`messenger-key-${key}`);
};

function tapSentenceCheck(): void {
  const check = screen.queryByTestId("sentence-order-check");
  if (check === null) tapId("learning-shell-action");
  else fireEvent.tap(within(check).getByTestId("ui-lynx-button"), {});
}

/** 칸을 다 채우되 어느 정답과도 다른 글자가 되는 타일 인덱스 열입니다. */
function wrongTiles(question: Question<"syllable-build">): readonly number[] {
  const path: number[] = [];
  const found = (): boolean => {
    if (path.length === question.slotCount) {
      return !question.answers.includes(path.map((index) => question.tiles[index] ?? "").join(""));
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

/** 다시 풀 수 있는(채점하고 이 헬퍼가 풀 줄 아는) 학습형입니다. 말하기 · 읽기 · 카드는 빠집니다. */
export const reviewableForms: readonly CatalogActivity["form"][] = [
  "word-choice",
  "listening",
  "sentence-order",
  "typing",
  "pair-match",
  "syllable-build",
];

/**
 * 화면에 선 문항 하나에 답합니다(다음 걸음은 누르지 않습니다). 낱말 말하기는 들리는 글자를 음성 인식 대역이 정하므로
 * `right`를 쓰지 않고 그림을 세운 뒤 Speak만 누릅니다.
 */
export function answerQuestion(activity: CatalogActivity, questionIndex: number, right: boolean) {
  switch (activity.form) {
    case "word-choice": {
      const question = activity.questions[questionIndex] as Question<"word-choice">;
      const picture = screen.queryByTestId("word-choice-picture-image");
      if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
      tapChoice(right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0);
      return;
    }
    case "listening": {
      const question = activity.questions[questionIndex] as Question<"listening">;
      tapChoice(right ? question.answerIndex : question.answerIndex === 0 ? 1 : 0);
      return;
    }
    case "sentence-order": {
      const question = activity.questions[questionIndex] as Question<"sentence-order">;
      const order = right ? question.answerOrder : [...question.answerOrder].reverse();
      const chipId =
        question.dialogue === undefined ? "sentence-order-chip" : "sentence-order-dialogue-chip";
      for (const chip of order) tapId(`${chipId}-${chip}`);
      tapSentenceCheck();
      return;
    }
    case "typing": {
      const question = activity.questions[questionIndex] as Question<"typing">;
      typeKeys(
        right ? lettersOnly(question.answers.find(isTypeableAnswer) ?? question.answers[0]) : "가",
      );
      tapId("learning-shell-action");
      return;
    }
    case "pair-match": {
      const question = activity.questions[questionIndex] as Question<"pair-match">;
      question.answer.forEach((meaning, word) => {
        tapId(`pair-match-word-${word}`);
        tapId(`pair-match-meaning-${right ? meaning : (meaning + 1) % question.meanings.length}`);
      });
      tapId("learning-shell-action");
      return;
    }
    case "syllable-build": {
      const question = activity.questions[questionIndex] as Question<"syllable-build">;
      const tiles = right
        ? catalogSpellingOf(question.tiles, question.answers[0])
        : wrongTiles(question);
      if (tiles === null) throw new Error(`no spelling: ${question.answers[0]}`);
      for (const index of tiles) tapId(`syllable-build-tile-${index}`);
      tapId("learning-shell-action");
      return;
    }
    case "speak-word": {
      const picture = screen.queryByTestId("speak-word-picture-image");
      if (picture !== null) fireEvent(picture, new window.Event("bindEvent:load"));
      tapId("learning-shell-action");
      return;
    }
    default:
      throw new Error(`not reviewable: ${activity.form}`);
  }
}

/** 답한 뒤 다음 걸음을 누릅니다 — 저절로 넘어가는 학습형은 화면 층, 나머지는 아래 버튼(Next · Continue)입니다. */
export function advanceAfterAnswer(activity: CatalogActivity, questionIndex: number): void {
  const advances =
    activity.form === "listening" ||
    activity.form === "speak-word" ||
    (activity.form === "word-choice" && activity.questions[questionIndex]?.culture === undefined);
  tapId(advances ? "learning-shell-advance" : "learning-shell-action");
}

/** 첫 다시 도전 문항 앞의 시작 게이트(알약)가 서 있으면 눌러 넘깁니다. */
export function passReviewIntro(): void {
  const gate = screen.queryByTestId("lesson-review-gate");
  if (gate !== null) fireEvent.tap(gate, {});
}

/** 다시 도전에서 답한 뒤 판(맞힘 초록 Fixed it! · 틀림 빨강)을 확인하고 판 안 Continue를 누릅니다. */
export function tapReviewContinue(right: boolean): void {
  const panel = screen.getByTestId("learning-shell-feedback");
  expect(panel).toHaveAttribute("data-tone", right ? "correct" : "incorrect");
  if (right) expect(panel).toHaveTextContent("Fixed it!");
  const slot = within(panel).getByTestId("learning-shell-review-continue");
  fireEvent.tap(within(slot).getByTestId("ui-lynx-button"), {});
}

/** 다시 도전 화면 하나를 풉니다 — 첫 화면이면 시작 게이트를 넘기고, 답한 뒤 판의 Continue로 넘어갑니다. */
export function solveReviewItem(
  plan: CatalogLessonPlan,
  item: CatalogReviewItem,
  right: boolean,
): void {
  const activity = plan.activities[item.activityIndex];
  if (activity === undefined) throw new Error(`no activity: ${item.activityIndex}`);
  passReviewIntro();
  expect(screen.getByTestId("learning-shell-session-layer")).toHaveAttribute("data-review", "true");
  answerQuestion(activity, item.questionIndex, right);
  tapReviewContinue(right);
}

/** 틀린 문항(레슨 순서)을 다시 풀기에서 차례로 맞혀 끝냅니다 — 다 맞히면 줄이 한 바퀴로 끝납니다. */
export function solveReview(plan: CatalogLessonPlan, items: readonly CatalogReviewItem[]): void {
  for (const item of items) solveReviewItem(plan, item, true);
  expect(screen.queryByTestId("learning-shell-session-layer")).toBeNull();
}

/** 레슨을 전부 틀렸을 때 다시 풀 문항입니다 — 풀 줄 아는 채점 학습형의 모든 문항(레슨 순서)입니다. */
export function allReviewItemsOf(plan: CatalogLessonPlan): readonly CatalogReviewItem[] {
  return plan.activities.flatMap((activity, activityIndex) =>
    reviewableForms.includes(activity.form)
      ? activity.questions.map((_, questionIndex) => ({ activityIndex, questionIndex }))
      : [],
  );
}

/** 다시 도전에서 주어진 문항(레슨 순서)을 모두 또 틀립니다 — 고친 수 0이라 판정은 첫 결과 그대로입니다(ADR-0058 ⟨2026-10-30⟩). */
export function missReview(plan: CatalogLessonPlan, items: readonly CatalogReviewItem[]): void {
  for (const item of items) solveReviewItem(plan, item, false);
  expect(screen.queryByTestId("learning-shell-session-layer")).toBeNull();
}
