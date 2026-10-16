import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import type { CatalogActivity, CatalogLessonPlan } from "./catalog-lesson-plan";
import {
  boot,
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
  throughS8,
  title,
  u01,
  u02,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 새 형식 내장본(모킹 없음) 그대로 앱 전체를 걷습니다 - S5의 읽기(SHADOW)와 S6의
// 낱말 말하기(SPEAK_WORD)가 실제로 서고, 음성 인식 대역(경계)에 따라 들림 · 오답 · 권한 막힘 → Skip이 진행되며,
// 통과 분모가 건너뛴 문항을 세지 않고, 이벤트가 건너뜀 수를 싣는지를 한 트리에서 봅니다.
// 정답과 문장은 계약 함수(`catalogLessonPlanOf`)가 내는 계획에서 읽습니다.

afterEach(resetApp);

type Form = CatalogActivity["form"];
type ReadAloudActivity = Extract<CatalogActivity, { form: "read-aloud" }>;
type SpeakWordActivity = Extract<CatalogActivity, { form: "speak-word" }>;

const beforeS5 = ["intro", "S1", "S2", "S3", "S4"];
const beforeS6 = [...beforeS5, "S5"];

function indexOfForm(plan: CatalogLessonPlan, form: Form): number {
  const index = plan.activities.findIndex((activity) => activity.form === form);
  if (index < 0) throw new Error(`no ${form} activity`);
  return index;
}

/** 대상 활동 앞의 활동을 모두 정답으로 풀고, 대상 활동의 위치를 돌려줍니다. */
function solveBefore(plan: CatalogLessonPlan, form: Form): number {
  const target = indexOfForm(plan, form);
  plan.activities.slice(0, target).forEach((activity) => solveActivity(activity, true, false));
  return target;
}

/** 대상 뒤의 활동을 모두 정답으로 풉니다. 대상이 마지막이면 완료 카드의 결과 보기를 누릅니다. */
function solveAfter(plan: CatalogLessonPlan, target: number): void {
  if (target === plan.activities.length - 1) {
    tapId("learning-shell-action");
    return;
  }
  plan.activities.forEach((activity, index) => {
    if (index > target) solveActivity(activity, true, index === plan.activities.length - 1);
  });
}

function readAloudOf(plan: CatalogLessonPlan): ReadAloudActivity {
  const found = plan.activities[indexOfForm(plan, "read-aloud")];
  return found as ReadAloudActivity;
}

function speakWordOf(plan: CatalogLessonPlan): SpeakWordActivity {
  const found = plan.activities[indexOfForm(plan, "speak-word")];
  return found as SpeakWordActivity;
}

const phase = (id: string): string | null => screen.getByTestId(id).getAttribute("data-phase");
const questionIndex = (id: string): string | null =>
  screen.getByTestId(id).getAttribute("data-questionindex");
const wavesState = (id: string): string | null => screen.getByTestId(id).getAttribute("data-state");

function loadPicture(): void {
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
}

function skipSpeakWord(): void {
  expect(screen.getByTestId("speak-word-content")).toBeInTheDocument();
  loadPicture();
  tapId("learning-shell-action");
  expect(phase("speak-word-content")).toBe("unavailable");
  tapId("learning-shell-action");
}

test("SPK1. (AC4 접점 없음) S5: 인식 접점이 없으면 첫 Speak가 불가가 되고 Skip 셋으로 LESSON COMPLETE!(실수 0) → S5 끝 · S6 열림 · 이벤트의 건너뜀 수 3", async () => {
  const { rpcs, events } = await boot({ [u01]: beforeS5 });
  const plan = lessonPlan(u01, "S5");
  expect(readAloudOf(plan).questions).toHaveLength(3);
  expect(plan.questionCount).toBe(6);

  tapNode(u01, "S5");
  solveBefore(plan, "read-aloud");

  expect(screen.getByTestId("read-aloud-content")).toBeInTheDocument();
  expect(questionIndex("read-aloud-content")).toBe("0");
  expect(phase("read-aloud-content")).toBe("ready");
  expect(wavesState("read-aloud-waves")).toBe("idle");
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("Speak");

  tapId("learning-shell-action");
  expect(phase("read-aloud-content")).toBe("unavailable");
  expect(screen.getByTestId("read-aloud-content")).toHaveAttribute("data-reason", "blocked");
  expect(wavesState("read-aloud-waves")).toBe("off");
  expect(screen.getByTestId("read-aloud-hint")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("Skip");

  tapId("learning-shell-action");
  expect(questionIndex("read-aloud-content")).toBe("1");
  expect(phase("read-aloud-content")).toBe("unavailable");
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("Skip");

  tapId("learning-shell-action");
  expect(questionIndex("read-aloud-content")).toBe("2");
  expect(phase("read-aloud-content")).toBe("unavailable");

  tapId("learning-shell-action");
  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE NO MISTAKES IN THIS LESSON",
  );
  exitResult();
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S5")).toBe("clear");
  expect(status(u01, "S6")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S5"));
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "S5",
      unitRole: "lesson",
      questionCount: "6",
      shownItemCount: "9",
      skippedItemCount: "3",
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "S5",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: "6",
      questionCount: "6",
      skippedCount: "3",
    },
  ]);
});

test("SPK2. (AC2 인식) S5: 들은 글자가 문장과 같으면 조각이 모두 칠해지고 안내가 n of n이며 PERFECT · 건너뜀 0 · 정답 수는 읽기를 세지 않는다", async () => {
  const plan = lessonPlan(u01, "S5");
  const sentences = readAloudOf(plan).questions.map((question) => question.sentence);
  const { rpcs, events } = await boot(
    { [u01]: beforeS5 },
    { speech: { granted: true, heard: (attempt) => sentences[attempt] ?? null } },
  );

  tapNode(u01, "S5");
  solveBefore(plan, "read-aloud");

  for (const [index, sentence] of sentences.entries()) {
    expect(questionIndex("read-aloud-content")).toBe(String(index));
    expect(screen.getByTestId("read-aloud-sentence")).toBeInTheDocument();
    tapId("learning-shell-action");
    expect(phase("read-aloud-content")).toBe("heard");

    const chunks = Array.from(document.querySelectorAll('[data-testid^="read-aloud-chunk-"]'));
    const words = sentence
      .replace(/[.,!?~…"'“”‘’]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0);
    expect(chunks.length).toBeGreaterThanOrEqual(words.length);
    for (const chunk of chunks) expect(chunk.getAttribute("data-matched")).toBe("true");
    expect(screen.getByTestId("read-aloud-hint")).toHaveTextContent(
      `You said all ${words.length} words.`,
    );
    expect(screen.getByTestId("learning-shell-action")).toHaveTextContent(
      index === sentences.length - 1 ? "See results" : "Next",
    );
    tapId("learning-shell-action");
  }

  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "S5")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S5"));
  expect(learningEvents(events)[1]).toEqual({
    name: "episode_lesson_finished",
    episodeId: u01,
    unitKey: "S5",
    unitRole: "lesson",
    verdict: "passed",
    correctCount: "6",
    questionCount: "6",
    skippedCount: "0",
  });
});

test("SPK3. (AC3 정답) S6: 낱말 활동에서 그림이 서고 정답을 말하면 정답 배지 · 정답 상자 → 넘김 → PERFECT · S6 기록 · 이벤트", async () => {
  const plan = lessonPlan(u01, "S6");
  const question = speakWordOf(plan).questions[0];
  if (question === undefined) throw new Error("empty speak-word activity");
  const { rpcs, events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => question.answers[0] } },
  );

  tapNode(u01, "S6");
  const target = solveBefore(plan, "speak-word");

  expect(screen.getByTestId("speak-word-content")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  loadPicture();
  expect(screen.getByTestId("speak-word-picture")).toHaveAttribute("data-loadstate", "loaded");
  tapId("learning-shell-action");

  expect(phase("speak-word-content")).toBe("heard");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("speak-word-reveal")).toHaveTextContent(question.answers[0]);
  expect(screen.getByTestId("speak-word-reveal")).toHaveTextContent(question.romanization ?? "");
  tapId("learning-shell-advance");
  solveAfter(plan, target);

  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "S6")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S6"));
  expect(learningEvents(events)[1]).toEqual({
    name: "episode_lesson_finished",
    episodeId: u01,
    unitKey: "S6",
    unitRole: "lesson",
    verdict: "passed",
    correctCount: "8",
    questionCount: "8",
    skippedCount: "0",
  });
});

test("SPK4. (AC3 오답) S6: 다른 낱말을 말하면 오답 배지 · 정답 상자 → 다른 문항은 정답이면 LESSON COMPLETE!(실수 1) · 통과 · 정답 수 7", async () => {
  const plan = lessonPlan(u01, "S6");
  const { rpcs, events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: true, heard: () => "카트" } },
  );

  tapNode(u01, "S6");
  const target = solveBefore(plan, "speak-word");
  loadPicture();
  tapId("learning-shell-action");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(screen.getByTestId("speak-word-reveal")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
  tapId("learning-shell-advance");
  solveAfter(plan, target);

  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(title()).not.toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "S6")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S6"));
  expect(learningEvents(events)[1]).toMatchObject({
    verdict: "passed",
    correctCount: "7",
    questionCount: "8",
    skippedCount: "0",
  });
});

test("SPK5. (AC4 거부) S6: 권한을 거부하면 낱말 Speak가 불가가 되어 Skip → 나머지가 정답이면 LESSON COMPLETE!(실수 0) · 통과 · 건너뜀 1", async () => {
  const plan = lessonPlan(u01, "S6");
  const { rpcs, events } = await boot(
    { [u01]: beforeS6 },
    { speech: { granted: false, heard: () => "카드" } },
  );

  tapNode(u01, "S6");
  const target = solveBefore(plan, "speak-word");
  loadPicture();
  tapId("learning-shell-action");

  expect(phase("speak-word-content")).toBe("unavailable");
  expect(screen.getByTestId("speak-word-hint")).toBeInTheDocument();
  expect(screen.getByTestId("learning-shell-action")).toHaveTextContent("Skip");
  expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
  tapId("learning-shell-action");
  solveAfter(plan, target);

  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(title()).not.toHaveTextContent("PERFECT LESSON!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE NO MISTAKES IN THIS LESSON",
  );
  exitResult();
  await flush();
  expect(status(u01, "S6")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S6"));
  expect(learningEvents(events)[1]).toMatchObject({
    verdict: "passed",
    correctCount: "7",
    questionCount: "8",
    skippedCount: "1",
  });
});

test("SPK6. (AC4 분모) u02 S6: 낱말을 건너뛰고 나머지 11 중 7만 맞혀도 통과한다 - 통과 분모는 건너뛴 문항을 뺀 판정 수다", async () => {
  const plan = lessonPlan(u02, "S6");
  expect(plan.questionCount).toBe(12);
  const { rpcs, events } = await boot({
    [u01]: [...throughS8, "CULT", "RP"],
    [u02]: ["intro", "S1", "S2", "S3", "S4", "S5"],
  });

  tapNode(u02, "S6");
  const gate = screen.queryByTestId("learner-profile-gate-skip");
  if (gate !== null) tapButtonIn("learner-profile-gate-skip");
  let graded = 0;
  plan.activities.forEach((activity, index) => {
    if (activity.form === "speak-word") {
      skipSpeakWord();
      return;
    }
    solveActivity(activity, graded < 7, index === plan.activities.length - 1);
    graded += activity.questions.length;
  });

  expect(graded).toBe(11);
  expect(title()).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  exitResult();
  await flush();
  expect(status(u02, "S6")).toBe("clear");
  await vi.waitFor(() => expect(savedUnits(rpcs, u02)).toContain("S6"));
  expect(learningEvents(events)[1]).toMatchObject({
    verdict: "passed",
    correctCount: "7",
    questionCount: "12",
    skippedCount: "1",
  });
});

test.each([
  ["S1", 13, 2, 6],
  ["S2", 8, 6, 8],
  ["S3", 11, 2, 7],
  ["S4", 8, 7, 8],
  ["S7", 5, 0, 5],
  ["CULT", 6, 0, 3],
])(
  "SPK7. (가드) %s의 계획은 표시 %i · 건너뜀 %i · 채점 %i - 말하기 문항 추가가 다른 단계를 바꾸지 않는다",
  (key, shown, skipped, graded) => {
    const plan = lessonPlan(u01, key);

    expect(plan.shownItemCount).toBe(shown);
    expect(plan.skippedItemCount).toBe(skipped);
    expect(plan.questionCount).toBe(graded);
    expect(plan.activities.map((activity) => activity.form)).not.toContain("read-aloud");
    expect(plan.activities.map((activity) => activity.form)).not.toContain("speak-word");
  },
);
