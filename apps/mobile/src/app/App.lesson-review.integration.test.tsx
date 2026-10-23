import { afterEach, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import type { CatalogLessonPlan } from "./catalog-lesson-plan";
import type { CatalogReviewItem } from "./catalog-review";
import {
  boot,
  contentIdOf,
  exitResult,
  flush,
  learningEvents,
  lessonPlan,
  resetApp,
  savedUnits,
  status,
  tapButtonIn,
  tapId,
  tapNode,
  title,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";
import {
  advanceAfterAnswer,
  allReviewItemsOf,
  answerQuestion,
  reviewableForms,
  solveReviewItem,
} from "./test-helpers/catalog-review-solver";

// `integration` 계층: 틀린 문제 다시 풀기(사용자 결정 2026-10-23)를 앱 전체에서 걷습니다 — 레슨을 둘 틀리게 풀면
// 결과 대신 「Let’s fix 2 mistakes」와 함께 첫 틀린 문항이 원래 학습형 화면으로 다시 서고, 또 틀리면 줄 뒤로 가
// 다른 문항 뒤에 돌아오며, 맞히면 「Fixed it!」 판이 서고, 줄이 비면 결과 화면이 **첫 시도** 판정 · 기록 · 이벤트를
// 냅니다. 대역은 경계뿐입니다(공용 헬퍼 참고). 정답은 계약 함수가 내는 계획에서 읽어 탭합니다.

afterEach(resetApp);

const sameItem = (a: CatalogReviewItem, b: CatalogReviewItem): boolean =>
  a.activityIndex === b.activityIndex && a.questionIndex === b.questionIndex;

/** 계획을 처음부터 풀되 `wrong`의 문항만 틀립니다. 마지막 활동 뒤 결과 보기까지 누릅니다. */
function solveLessonWith(plan: CatalogLessonPlan, wrong: readonly CatalogReviewItem[]): void {
  plan.activities.forEach((activity, activityIndex) => {
    const last = activityIndex === plan.activities.length - 1;
    expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
    if (!reviewableForms.includes(activity.form)) {
      solveActivity(activity, true, last);
      return;
    }
    activity.questions.forEach((_, questionIndex) => {
      const right = !wrong.some((item) => sameItem(item, { activityIndex, questionIndex }));
      answerQuestion(activity, questionIndex, right);
      advanceAfterAnswer(activity, questionIndex);
    });
    if (last) tapId("learning-shell-action");
  });
}

const chapter = () => screen.getByTestId("learning-shell-chapter");

/** 다시 풀기 화면이 그 문항의 학습형 화면인지 봅니다. */
function expectShowing(plan: CatalogLessonPlan, item: CatalogReviewItem): void {
  const activity = plan.activities[item.activityIndex];
  if (activity === undefined) throw new Error("no activity");
  expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
  // 단어 선택은 제시문이 그 문항의 것인지까지 봅니다(그림 문항은 제시문 줄이 없습니다).
  const prompt = screen.queryByTestId("word-choice-screen-prompt");
  const expected =
    activity.form === "word-choice" && prompt !== null
      ? (activity.questions[item.questionIndex]?.prompt ?? "")
      : null;
  expect(expected === null || (prompt?.textContent ?? "").includes(expected)).toBe(true);
}

test("LR1. 둘 틀리면 Let’s fix 2 mistakes → 틀린 문항이 다시 서고, 또 틀리면 뒤로 가 돌아오며, 맞히면 Fixed it! → 결과는 첫 시도 판정 · 기록", async () => {
  const plan = lessonPlan(u01, "S1");
  const [first, second] = allReviewItemsOf(plan);
  if (first === undefined || second === undefined)
    throw new Error("S1에 다시 풀 문항이 둘 없습니다");
  const { rpcs, events } = await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, [first, second]);

  // 결과 대신 다시 풀기 첫 화면입니다 — 시작 배지 · 연한 주황 헤더 · Review 1 / 2.
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-review-badge")).toHaveTextContent("Let’s fix 2 mistakes");
  expect(screen.getByTestId("learning-shell-session-layer")).toHaveAttribute("data-review", "true");
  expect(chapter()).toHaveTextContent("Review 1 / 2");
  expect(screen.getByTestId("learning-shell-form")).toHaveTextContent("· try again");
  expectShowing(plan, first);

  // 또 틀리면 줄 맨 뒤로 갑니다 — 다음 문항이 서고, 풀 화면이 하나 늘어 Review 2 / 3입니다.
  solveReviewItem(plan, first, false);
  expect(screen.queryByTestId("lesson-review-badge")).not.toBeInTheDocument();
  expect(chapter()).toHaveTextContent("Review 2 / 3");
  expectShowing(plan, second);

  // 맞히면 Fixed it! 판의 Continue로 넘어가고(헬퍼가 판을 확인합니다), 뒤로 갔던 문항이 돌아옵니다.
  solveReviewItem(plan, second, true);
  expect(chapter()).toHaveTextContent("Review 3 / 3");
  expectShowing(plan, first);

  solveReviewItem(plan, first, true);

  // 결과는 첫 시도(둘 틀림)로 판정합니다 — 다시 푼 답은 정답 수 · 기록 · 이벤트를 바꾸지 않습니다.
  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(title()).not.toHaveTextContent("PERFECT LESSON!");
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  exitResult();
  await flush();
  expect(status(u01, "S1")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S1"));
  const finished = learningEvents(events).filter(
    (event) => event.name === "episode_lesson_finished",
  );
  expect(finished).toEqual([
    expect.objectContaining({
      unitKey: "S1",
      verdict: "passed",
      correctCount: String(plan.questionCount - 2),
      questionCount: String(plan.questionCount),
    }),
  ]);
});

test("LR2. 다시 풀기 도중 나가면 기록 없이 맵으로 가고 끝 이벤트가 없다", async () => {
  const plan = lessonPlan(u01, "S1");
  const [first] = allReviewItemsOf(plan);
  if (first === undefined) throw new Error("S1에 다시 풀 문항이 없습니다");
  const { rpcs, events } = await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, [first]);
  expect(chapter()).toHaveTextContent("Review 1 / 1");

  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
  await flush();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  // 끝내지 않았지만 티켓을 쓰고 연 유닛이라 진한 색(`active`)으로 섭니다(ADR-0075 적용 기록 2026-10-23).
  expect(status(u01, "S1")).toBe("active");
  expect(savedUnits(rpcs, u01)).not.toContain("S1");
  expect(learningEvents(events).map((event) => event.name)).toEqual(["episode_lesson_started"]);
});
