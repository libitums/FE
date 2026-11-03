import { afterEach, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import type { CatalogLessonPlan } from "./catalog-lesson-plan";
import { catalogPassCriterion } from "./catalog-lesson-plan";
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
  passReviewIntro,
  reviewableForms,
  solveReviewItem,
} from "./test-helpers/catalog-review-solver";

// `integration` 계층: 틀린 문제 다시 도전(ADR-0058 ⟨2026-10-30⟩)을 앱 전체에서 걷습니다 — 레슨 순서는 늘 「일반 학습 →
// 틀린 문항 다시 도전 → 결과」입니다. 완료 카드 · 진입 화면 없이 틀린 문항이 원래 학습형 화면으로 한 번씩 다시 서고(연한
// 주황 헤더 · 칩 · 첫 화면 알약), 다 풀면 고친 수를 반영해 판정 · 기록 · 이벤트 · 결과 화면을 냅니다.
// 대역은 경계뿐입니다(공용 헬퍼 참고). 정답은 계약 함수가 내는 계획에서 읽어 탭합니다.

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

/** 통과선에 하나 모자라게 틀릴 문항들입니다(레슨 순서) — 하나만 고치면 통과합니다. */
function oneShortOf(plan: CatalogLessonPlan): readonly CatalogReviewItem[] {
  const wrongCount =
    plan.questionCount - catalogPassCriterion(plan.questionCount).minCorrectCount + 1;
  const items = allReviewItemsOf(plan).slice(0, wrongCount);
  if (items.length < wrongCount) throw new Error("다시 풀 문항이 모자랍니다");
  return items;
}

const chip = () => screen.getByTestId("learning-shell-review-chip");
const itemAnswered = (events: Parameters<typeof learningEvents>[0]) =>
  learningEvents(events).filter((event) => event.name === "episode_item_answered").length;
const finishedEvents = (events: Parameters<typeof learningEvents>[0]) =>
  learningEvents(events).filter((event) => event.name === "episode_lesson_finished");

test("LR1. 하나 모자라 미통과 → 완료 카드 · 진입 화면 없이 곧바로 다시 도전 → 하나 고치면 Pass unlocked → 고친 수로 통과 · 기록 · 요약", async () => {
  const plan = lessonPlan(u01, "S1");
  const wrong = oneShortOf(plan);
  const [first, ...rest] = wrong;
  if (first === undefined || rest.length === 0)
    throw new Error("S1에 다시 풀 문항이 둘 이상 필요합니다");
  const { rpcs, events } = await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, wrong);

  // 결과 · 완료 카드 대신 시작 게이트입니다 — 문항보다 알약이 먼저 섭니다.
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-activity-complete")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-review-badge")).toHaveTextContent(
    `Let\u2019s fix ${wrong.length} mistakes`,
  );
  expect(screen.queryByTestId("learning-shell-session-layer")).not.toBeInTheDocument();
  passReviewIntro();
  // 첫 다시 도전 문항 — 연한 주황 헤더 · Review 1 / n · 칩.
  expect(screen.getByTestId("learning-shell-session-layer")).toHaveAttribute("data-review", "true");
  expect(chapter()).toHaveTextContent(`Review 1 / ${wrong.length}`);
  expect(chip()).toHaveTextContent("1 more to pass");
  expectShowing(plan, first);
  solveReviewItem(plan, first, true);

  // 통과선을 넘었습니다 — 칩이 바뀌고 나머지는 한 번씩 풉니다(틀려도 뒤로 가지 않습니다).
  expect(chapter()).toHaveTextContent(`Review 2 / ${wrong.length}`);
  expect(chip()).toHaveTextContent("Pass unlocked");
  for (const item of rest) {
    expectShowing(plan, item);
    solveReviewItem(plan, item, false);
  }

  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    `YOU FIXED 1 OF ${wrong.length} MISTAKES`,
  );
  expect(screen.getByTestId("lesson-complete-review-dots")).toBeInTheDocument();
  exitResult();
  await flush();
  expect(status(u01, "S1")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S1"));
  expect(finishedEvents(events)).toEqual([
    expect.objectContaining({
      unitKey: "S1",
      verdict: "passed",
      correctCount: String(plan.questionCount - wrong.length + 1),
    }),
  ]);
});

test("LR2. 다시 도전에서도 모두 틀리면 SO CLOSE! · Try again이고 기록하지 않는다", async () => {
  const plan = lessonPlan(u01, "S1");
  const wrong = oneShortOf(plan);
  const { rpcs, events } = await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, wrong);
  const answeredBefore = itemAnswered(events);
  for (const item of wrong) solveReviewItem(plan, item, false);
  // 다시 도전의 답은 문항 이벤트를 내지 않습니다(판정 · 기록 · 이벤트는 최종 결과로 한 번).
  expect(itemAnswered(events)).toBe(answeredBefore);

  expect(title()).toHaveTextContent("SO CLOSE!");
  expect(screen.getByTestId("lesson-complete-review-needed")).toHaveTextContent(
    "You needed 1 more right.",
  );
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  await flush();
  expect(savedUnits(rpcs, u01)).not.toContain("S1");
  expect(finishedEvents(events)).toEqual([expect.objectContaining({ verdict: "failed" })]);

  // Try again은 같은 유닛을 첫 문항부터 새로 엽니다 — 다시 도전 상태가 남지 않습니다.
  tapButtonIn("lesson-complete-screen-retry");
  const firstForm = plan.activities[0]?.form;
  if (firstForm === undefined) throw new Error("S1에 활동이 없습니다");
  expect(screen.getByTestId(contentIdOf[firstForm])).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-review-gate")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-review-chip")).not.toBeInTheDocument();
});

test("LR3. 통과여도 틀린 문항이 있으면 다시 도전한다 — 칩은 처음부터 Pass unlocked", async () => {
  const plan = lessonPlan(u01, "S1");
  const [first] = allReviewItemsOf(plan);
  if (first === undefined) throw new Error("S1에 다시 풀 문항이 없습니다");
  await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, [first]);
  passReviewIntro();

  expect(chapter()).toHaveTextContent("Review 1 / 1");
  expect(chip()).toHaveTextContent("Pass unlocked");
  solveReviewItem(plan, first, true);

  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU FIXED 1 OF 1 MISTAKE",
  );
});

test("LR4. 틀린 문항이 없으면 완료 카드 없이 곧바로 결과다", async () => {
  const plan = lessonPlan(u01, "S1");
  await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, []);

  expect(screen.queryByTestId("learning-shell-session-layer")).not.toBeInTheDocument();
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  expect(screen.queryByTestId("lesson-complete-review-dots")).not.toBeInTheDocument();
});

test("LR5. 다시 도전 도중 나가면 기록 없이 맵으로 가고 끝 이벤트가 없다", async () => {
  const plan = lessonPlan(u01, "S1");
  const wrong = oneShortOf(plan);
  const { rpcs, events } = await boot({ [u01]: ["intro"] });

  tapNode(u01, "S1");
  solveLessonWith(plan, wrong);
  passReviewIntro();
  expect(chapter()).toHaveTextContent(`Review 1 / ${wrong.length}`);

  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
  await flush();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S1")).toBe("active");
  expect(savedUnits(rpcs, u01)).not.toContain("S1");
  expect(learningEvents(events).map((event) => event.name)).toEqual(["episode_lesson_started"]);
});
