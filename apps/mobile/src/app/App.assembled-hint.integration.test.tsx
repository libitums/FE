import { afterEach, expect, test } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { boot, lessonPlan, resetApp, tapNode, u01 } from "./test-helpers/episode-format-harness";
import { bootItemAudioApp, lessonPlanWith } from "./test-helpers/item-audio-harness";
import {
  advanceAfterAnswer,
  answerQuestion,
  passReviewIntro,
  reviewableForms,
  solveReviewItem,
} from "./test-helpers/catalog-review-solver";
import { solveActivity, solveSyllable } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 조립 문항 타일 로마자 · 힌트(ADR-0153)가 실제 앱 트리에서 — 하네스 내장 튜토리얼 u00 S4의 음절
// 조립이 콘텐츠 로마자를 창고 타일에 싣고, 힌트 「정답 보기」를 쓴 판정이 측정 이벤트에 hintUsed로 닿는다.
// 계획 · 매핑 · 화면 · 결선은 실물이고 대역은 경계뿐입니다.

afterEach(resetApp);

const u00 = "u00-tutorial";

test("AI1. 튜토리얼 음절 조립은 타일 로마자 · 힌트가 서고, 정답 보기를 쓴 판정은 hintUsed show로 나간다", async () => {
  const booted = await boot({ [u00]: ["intro", "S1", "S2", "S3"] });
  tapNode(u00, "S4");
  const plan = lessonPlan(u00, "S4");
  const at = plan.activities.findIndex((activity) => activity.form === "syllable-build");
  expect(at).toBeGreaterThanOrEqual(0);
  plan.activities.slice(0, at).forEach((activity) => solveActivity(activity, true, false));

  const activity = plan.activities[at];
  if (activity?.form !== "syllable-build") throw new Error("no syllable-build");
  const [question] = activity.questions;
  if (question === undefined) throw new Error("no question");
  expect(question.tileReading?.shown).toBe("always");
  const romans = screen.getAllByText(
    (_, node) => node?.getAttribute("class")?.includes("tile-romanization") ?? false,
  );
  expect(romans.length).toBe(question.tiles.length);

  fireEvent.tap(screen.getByTestId("assembled-hint-button"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-bottom-sheet-action-show")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("syllable-build-slot-0-ghost")).toBeInTheDocument();
  solveSyllable(question, true);

  const answered = booted.events.filter(
    (event) =>
      event.name === "episode_item_answered" &&
      (event as { itemType?: string }).itemType === "SYLLABLE_BUILD",
  ) as unknown as Record<string, unknown>[];
  expect(answered.at(-1)).toMatchObject({ result: "correct", hintUsed: "show" });
});

test("AI2. 듣고 조립은 첫 시도에 조각 로마자가 없고, 틀린 뒤 레슨 끝 다시 풀기에서 로마자가 선다", async () => {
  const plan = lessonPlanWith(u01, "S2");
  const target = plan.activities
    .flatMap((activity, activityIndex) =>
      activity.form === "sentence-order"
        ? activity.questions.map((question, questionIndex) => ({
            activityIndex,
            questionIndex,
            question,
          }))
        : [],
    )
    .find(
      ({ question }) =>
        question.audio?.kind === "listen" && question.chipReading?.shown === "review",
    );
  if (target === undefined) throw new Error("u01 S2에 로마자 있는 듣고 조립이 없습니다");
  await bootItemAudioApp({ progress: { [u01]: ["intro", "S1"] }, files: "all" });
  tapNode(u01, "S2");

  const romans = () => screen.queryAllByTestId(/^sentence-order-chip-\d+-roman$/);
  plan.activities.forEach((activity, activityIndex) => {
    const last = activityIndex === plan.activities.length - 1;
    if (!reviewableForms.includes(activity.form)) {
      solveActivity(activity, true, last);
      return;
    }
    activity.questions.forEach((_, questionIndex) => {
      const isTarget =
        activityIndex === target.activityIndex && questionIndex === target.questionIndex;
      if (isTarget) expect(romans()).toHaveLength(0);
      answerQuestion(activity, questionIndex, !isTarget);
      advanceAfterAnswer(activity, questionIndex);
    });
  });
  passReviewIntro();

  // 다시 풀기 판 — 같은 문항이 조각 로마자와 함께 선다(render-catalog-activity의 inReview 결선).
  expect(romans()).toHaveLength(target.question.chips.length);
  solveReviewItem(
    plan,
    { activityIndex: target.activityIndex, questionIndex: target.questionIndex },
    true,
  );
});
