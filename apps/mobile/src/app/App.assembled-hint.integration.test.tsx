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
import { choiceRomanizationStorageKey } from "../lib/session-options-storage";

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

/** u01 S2의 첫 로마자 있는 듣고 조립(활동 · 문항 위치)입니다. */
function listenBuildTarget() {
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
        question.audio?.kind === "listen" && question.chipReading?.shown === "setting",
    );
  if (target === undefined) throw new Error("u01 S2에 로마자 있는 듣고 조립이 없습니다");
  return { plan, target };
}

const romans = () => screen.queryAllByTestId(/^sentence-order-chip-\d+-roman$/);

// 사용자 결정 2026-11-20(ADR-0153 ⟨2026-11-20⟩) — 보기 로마자 설정이 켜졌으면(기본) 첫 시도부터 조각 로마자가 서고,
// 틀린 뒤에는 정답 한글 · 로마자 · 뜻이 답 줄 아래에 선다(QA 3번).
test("AI2. 듣고 조립은 설정이 켜졌으면 첫 시도에 조각 로마자가 서고, 틀린 뒤 정답 상자 · 로마자 · 뜻이 선다", async () => {
  const { plan, target } = listenBuildTarget();
  await bootItemAudioApp({ progress: { [u01]: ["intro", "S1"] }, files: "all" });
  tapNode(u01, "S2");

  for (const [activityIndex, activity] of plan.activities.entries()) {
    if (activityIndex === target.activityIndex) break;
    solveActivity(activity, true, false);
  }
  const activity = plan.activities[target.activityIndex];
  if (activity === undefined) throw new Error("no activity");
  for (let index = 0; index < target.questionIndex; index += 1) {
    answerQuestion(activity, index, true);
    advanceAfterAnswer(activity, index);
  }

  expect(romans()).toHaveLength(target.question.chips.length);
  expect(target.question.meaning).toBeTruthy();
  answerQuestion(activity, target.questionIndex, false);

  const korean = target.question.answerOrder.map((index) => target.question.chips[index]).join(" ");
  expect(screen.getByTestId("sentence-order-reveal")).toHaveTextContent(korean);
  expect(screen.getByTestId("sentence-order-reading")).toHaveTextContent(
    target.question.reading?.romanization ?? "",
  );
  expect(screen.getByTestId("sentence-order-reveal-meaning")).toHaveTextContent(
    target.question.meaning ?? "",
  );
});

test("AI3. 보기 로마자 설정을 끄면 첫 시도에는 조각 로마자가 없고, 틀린 뒤 레슨 끝 다시 풀기에서 선다", async () => {
  const { plan, target } = listenBuildTarget();
  await bootItemAudioApp({
    progress: { [u01]: ["intro", "S1"] },
    files: "all",
    seed: { [choiceRomanizationStorageKey]: "off" },
  });
  tapNode(u01, "S2");

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
      if (isTarget) expect(screen.queryByTestId("sentence-order-reading")).toBeNull();
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

// QA 2026-11-20(위키 QA 2번, u00 S2-01): 빈칸 채우기 로마자 줄이 답 전에 빈칸 자리 정답 로마자를 보여 줬습니다. 매핑(채운 줄 +
// 범위) → 화면(답 전 숨김)이 실제 앱 트리에서 이어지는지 봅니다(내장 u01 S1의 첫 빈칸 채우기).
test("AI4. 빈칸 채우기는 답 전 로마자 줄의 빈칸 자리가 ___이고, 답한 뒤 정답 로마자가 선다", async () => {
  const plan = lessonPlanWith(u01, "S1");
  const at = plan.activities.findIndex(
    (activity) =>
      activity.form === "word-choice" && activity.questions[0]?.romanizationEmphasis !== undefined,
  );
  const activity = plan.activities[at];
  if (activity?.form !== "word-choice") throw new Error("u01 S1에 빈칸 채우기가 없습니다");
  const [question] = activity.questions;
  const span = question?.romanizationEmphasis;
  if (question?.romanization === undefined || span === undefined) throw new Error("no span");
  const answerRoman = question.romanization.slice(span.start, span.start + span.length);
  await bootItemAudioApp({ progress: { [u01]: ["intro"] }, files: "all" });
  tapNode(u01, "S1");
  plan.activities.slice(0, at).forEach((earlier) => solveActivity(earlier, true, false));

  const line = () => screen.getByTestId("word-choice-screen-romanization");
  expect(line()).toHaveTextContent("___");
  expect(line().textContent).not.toContain(answerRoman);
  answerQuestion(activity, 0, false);
  expect(line()).toHaveTextContent(answerRoman);
});
