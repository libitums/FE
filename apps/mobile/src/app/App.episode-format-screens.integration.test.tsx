import { afterEach, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import type { CatalogActivity } from "./catalog-lesson-plan";
import {
  boot,
  cover,
  exitResult,
  flush,
  learningEvents,
  lessonPlan,
  node,
  resetApp,
  savedUnits,
  status,
  tapButtonIn,
  tapId,
  tapNode,
  throughS8,
  title,
  u01,
  u02,
  u03,
} from "./test-helpers/episode-format-harness";
import {
  rightTiles,
  solveActivity,
  solveLesson,
  solveSyllable,
  wrongTiles,
} from "./test-helpers/episode-format-solvers";

// `integration` 계층: 새 형식 내장본(모킹 없음) 그대로 앱 전체를 걷습니다 - CULT가 문화 카드 → 문화 확인(보기 번역이
// 서는 단어 선택)으로 서서 통과 · 실패하고, 음절 조립이 섞인 S3가 진행되며, 같은 음절을 바꿔 놓아도 문자열로
// 판정되고, 맵의 문화 노드가 셋 모두 서는지, 다른 단계가 그대로인지를 한 트리에서 봅니다.
// 대역은 경계뿐입니다(공용 헬퍼 참고). 정답은 계약 함수가 내는 계획에서 읽습니다.

afterEach(resetApp);

type WordChoiceActivity = Extract<CatalogActivity, { form: "word-choice" }>;

function activityOf<Form extends CatalogActivity["form"]>(
  activities: readonly CatalogActivity[],
  form: Form,
): Extract<CatalogActivity, { form: Form }> {
  const found = activities.find((activity) => activity.form === form);
  if (found === undefined) throw new Error(`no ${form} activity`);
  return found as Extract<CatalogActivity, { form: Form }>;
}

/** 문화 카드를 `Next`로 끝까지 넘깁니다 - 완료 카드 없이 다음 활동(문화 확인)으로 이어집니다. */
function passCards(cardCount: number): void {
  for (let index = 0; index < cardCount; index += 1) {
    expect(screen.getByTestId("culture-card-content")).toHaveAttribute(
      "data-card-index",
      String(index),
    );
    tapId("learning-shell-action");
  }
}

/** 문화 확인 문항을 차례로 풀되, `rightAt`이 참인 문항만 맞힙니다. 보기 번역 줄이 서는지도 확인합니다. */
function answerChecks(activity: WordChoiceActivity, rightAt: (index: number) => boolean): void {
  activity.questions.forEach((question, index) => {
    const translations = question.choiceTranslations;
    expect(translations).toBeDefined();
    (translations ?? []).forEach((text, choice) => {
      expect(screen.getByTestId(`word-choice-option-${choice}-translation`)).toHaveTextContent(
        text,
      );
    });
    const picked = rightAt(index) ? question.answerIndex : question.answerIndex === 0 ? 1 : 0;
    tapId(`word-choice-option-${picked}`);
    tapId("learning-shell-advance");
  });
}

test("ES1. (AC1 · 2 통과) CULT: 카드 셋을 넘기면 보기 번역이 선 문화 확인 셋을 전부 맞혀 PERFECT → 나가기 → CULT 끝 · RP 열림 · 기록 · 이벤트", async () => {
  const { rpcs, events } = await boot({ [u01]: throughS8 });
  const plan = lessonPlan(u01, "CULT");
  const cards = activityOf(plan.activities, "culture-card");
  const checks = activityOf(plan.activities, "word-choice");
  expect(status(u01, "CULT")).toBe("available");
  expect(status(u01, "RP")).toBe("default");

  tapNode(u01, "CULT");
  passCards(cards.questions.length);
  // 완료 카드 없이 곧바로 문화 확인이 선다.
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  answerChecks(checks, () => true);
  tapId("learning-shell-action");

  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "CULT")).toBe("clear");
  expect(status(u01, "RP")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("CULT"));
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "CULT",
      unitRole: "lesson",
      questionCount: "3",
      shownItemCount: "6",
      skippedItemCount: "0",
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "CULT",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "3",
      questionCount: "3",
    },
  ]);
});

test("ES2. (AC2 실패) CULT: 문화 확인을 하나만 맞히면 실패 → Try again은 첫 카드부터 → 나가면 CULT 끝이 아니고 RP 잠김 · 기록 없음 · finished failed", async () => {
  const { rpcs, events } = await boot({ [u01]: throughS8 });
  const plan = lessonPlan(u01, "CULT");
  const cards = activityOf(plan.activities, "culture-card");
  const checks = activityOf(plan.activities, "word-choice");

  tapNode(u01, "CULT");
  passCards(cards.questions.length);
  answerChecks(checks, (index) => index === 0);
  tapId("learning-shell-action");

  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  expect(title()).not.toHaveTextContent("PERFECT LESSON!");

  tapButtonIn("lesson-complete-screen-retry");
  expect(screen.getByTestId("culture-card-content")).toHaveAttribute("data-card-index", "0");

  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
  await flush();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "CULT")).toBe("available");
  expect(status(u01, "RP")).toBe("default");
  expect(savedUnits(rpcs, u01)).not.toContain("CULT");
  const finished = learningEvents(events).filter((e) => e.name === "episode_lesson_finished");
  expect(finished[0]).toMatchObject({ unitKey: "CULT", verdict: "failed", correctCount: "1" });
});

test("ES3. (AC3 · 4) S3: 계획의 활동을 차례로 풀면 음절 조립 활동이 서고, 철자 탐색으로 눌러 PERFECT · S3 기록 · 이벤트의 표시 수가 계획 값", async () => {
  const { rpcs, events } = await boot({ [u01]: ["intro", "S1", "S2"] });
  const plan = lessonPlan(u01, "S3");
  expect(plan.activities.map((activity) => activity.form)).toContain("syllable-build");
  expect(plan.shownItemCount).toBe(11);

  tapNode(u01, "S3");
  const seen = solveLesson(plan, true);

  expect(seen).toContain("syllable-build-content");
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "S3")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S3"));
  expect(learningEvents(events)[0]).toMatchObject({ unitKey: "S3", shownItemCount: "11" });
  expect(learningEvents(events)[1]).toMatchObject({ verdict: "passed" });
});

test("ES3b. (AC3) S3의 음절 조립: 칸이 다 차야 Check가 서고, 틀린 배치는 오답 배지와 정답 상자가 선다", async () => {
  await boot({ [u01]: ["intro", "S1", "S2"] });
  const plan = lessonPlan(u01, "S3");
  tapNode(u01, "S3");

  for (const activity of plan.activities) {
    if (activity.form !== "syllable-build") {
      solveActivity(activity, true, false);
      continue;
    }
    const question = activity.questions[0];
    if (question === undefined) throw new Error("empty syllable activity");
    expect(screen.getByTestId("syllable-build-content")).toBeInTheDocument();
    expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
    const wrong = wrongTiles(question);
    for (const index of wrong.slice(0, -1)) tapId(`syllable-build-tile-${index}`);
    expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
    tapId(`syllable-build-tile-${wrong[wrong.length - 1]}`);
    tapId("learning-shell-action");
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(screen.getByTestId("syllable-build-reveal")).toBeInTheDocument();
    return;
  }
  throw new Error("S3 has no syllable-build activity");
});

test("ES4. (AC3) u02 S3 일주일: 두 일 타일을 바꿔 놓아도 문자열이 같아 정답 배지가 선다", async () => {
  await boot({ [u01]: [...throughS8, "CULT", "RP"], [u02]: ["intro", "S1", "S2"] });
  const plan = lessonPlan(u02, "S3");
  const target = plan.activities
    .flatMap((activity) => (activity.form === "syllable-build" ? activity.questions : []))
    .find((question) => question.answers[0] === "일주일");
  if (target === undefined) throw new Error("일주일 question missing");
  const path = rightTiles(target);
  const ilPositions = path.flatMap((index, position) =>
    target.tiles[index] === "일" ? [position] : [],
  );
  expect(ilPositions).toHaveLength(2);
  const first = path[ilPositions[0] ?? 0];
  const second = path[ilPositions[1] ?? 0];
  if (first === undefined || second === undefined) throw new Error("tile indexes");
  const exchanged = path.map((index) =>
    index === first ? second : index === second ? first : index,
  );
  expect(exchanged).not.toEqual(path);

  tapNode(u02, "S3");
  tapButtonIn("learner-profile-gate-skip");
  for (const activity of plan.activities) {
    if (activity.form !== "syllable-build") {
      solveActivity(activity, true, false);
      continue;
    }
    for (const question of activity.questions) {
      if (question !== target) {
        solveSyllable(question, true);
        continue;
      }
      for (const index of exchanged) tapId(`syllable-build-tile-${index}`);
      tapId("learning-shell-action");
      expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
      return;
    }
  }
  throw new Error("target not reached");
});

test("ES5. (AC5) 맵: 세 에피소드 모두 CULT 노드가 Culture 라벨이고 구획의 노드는 10개이며 문화는 한 줄 전용이다", async () => {
  await boot({ [u01]: ["intro"], [u02]: ["intro"], [u03]: ["intro"] });

  for (const [index, episodeId] of [u01, u02, u03].entries()) {
    expect(node(episodeId, "CULT")).toHaveAttribute(
      "accessibility-label",
      `Episode ${index + 1}. Culture, locked`,
    );
    const nodes = Array.from(
      document.querySelectorAll(
        `[data-testid^="ui-lynx-learning-unit-catalog-unit-${episodeId}-"]`,
      ),
    ).filter((element) =>
      new RegExp(`-${episodeId}-[A-Za-z0-9]+$`).test(element.getAttribute("data-testid") ?? ""),
    );
    expect(nodes).toHaveLength(10);
    const row = node(episodeId, "CULT").closest('[data-testid="journey-map-row"]');
    expect(row?.getAttribute("data-row-kind")).toBe("solo");
    expect(cover(episodeId)).toBeInTheDocument();
  }
});

test.each([
  ["S1", 13, 2],
  ["S2", 8, 6],
  ["S4", 8, 7],
  ["S5", 6, 6],
  ["S6", 7, 1],
  ["S7", 5, 0],
  ["S8", 8, 5],
])(
  "ES6. (AC6) %s는 시작하면 표시 %i · 건너뜀 %i로 알린다 - 문화 단계 변경이 다른 단계를 바꾸지 않는다",
  async (key, shown, skipped) => {
    const keys = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
    const before = keys.slice(0, keys.indexOf(key));
    const { events } = await boot({ [u01]: ["intro", ...before] });

    tapNode(u01, key);

    expect(learningEvents(events)[0]).toMatchObject({
      name: "episode_lesson_started",
      unitKey: key,
      shownItemCount: String(shown),
      skippedItemCount: String(skipped),
    });
  },
);
