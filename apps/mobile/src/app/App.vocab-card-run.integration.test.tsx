import { afterEach, expect, test } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import {
  boot,
  contentIdOf,
  exitResult,
  flush,
  learningEvents,
  lessonPlan,
  resetApp,
  status,
  tapButtonIn,
  tapNode,
  title,
  u01,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 새 형식 내장본(모킹 없음) u01 S1을 앱 전체에서 걷습니다 — 카드 구간 동안 세션 헤더
// 대신 카드 진행 헤더(`Word i of n`)가 서고, 카드를 다 넘긴 뒤 첫 문제가 카드를 뺀 분모로
// `Lesson 1 / N`에서 시작하는지, 그리고 결과 · 이벤트의 수(분석 `shownItemCount`는 카드를 셉니다)가
// 그대로인지 봅니다(ADR-0073). 대역은 경계뿐입니다(공용 헬퍼 참고).

afterEach(resetApp);

const chapter = () => screen.getByTestId("learning-shell-chapter");
const caption = () => screen.getByTestId("learning-run-header-caption");

test("VR1. u01 S1: 카드 7장 동안 Lesson 카운터가 없고 Word i of 7이 가며, 카드 뒤 첫 문제는 카드를 뺀 Lesson 1 / N이다", async () => {
  const { events } = await boot({ [u01]: ["intro"] });
  const plan = lessonPlan(u01, "S1");
  const [cards, ...questions] = plan.activities;
  expect(cards?.form).toBe("vocab-card");
  expect(cards?.questions).toHaveLength(7);
  expect(questions.every((activity) => activity.form !== "vocab-card")).toBe(true);
  const counted = questions.reduce((sum, activity) => sum + activity.questions.length, 0);
  expect(counted).toBe(plan.shownItemCount - 7);

  tapNode(u01, "S1");
  for (let index = 0; index < 7; index += 1) {
    expect(screen.getByTestId("vocab-card-content")).toBeInTheDocument();
    expect(screen.queryByTestId("learning-shell-chapter")).not.toBeInTheDocument();
    expect(caption()).toHaveTextContent(`Word ${String(index + 1)} of 7`);
    tapButtonIn("vocab-card-got-it");
  }

  // 카드 뒤에는 완료 카드도 결과 화면도 없이 곧바로 첫 문제이고, 세션 헤더가 돌아와 1부터 셉니다.
  expect(screen.queryByTestId("lesson-complete-screen")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-run-header")).not.toBeInTheDocument();
  expect(screen.getByTestId(contentIdOf[questions[0]?.form ?? "word-choice"])).toBeInTheDocument();
  expect(chapter()).toHaveTextContent(`Lesson 1 / ${String(counted)}`);

  let ordinal = 0;
  questions.forEach((activity, index) => {
    expect(chapter()).toHaveTextContent(`Lesson ${String(ordinal + 1)} / ${String(counted)}`);
    ordinal += activity.questions.length;
    solveActivity(activity, true, index === questions.length - 1);
  });
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(status(u01, "S1")).toBe("clear");
  // 분석의 표시 문항 수는 그대로 카드를 셉니다 — 카운터와 다른 질문입니다.
  expect(learningEvents(events)[0]).toMatchObject({
    name: "episode_lesson_started",
    unitKey: "S1",
    shownItemCount: String(plan.shownItemCount),
    questionCount: String(plan.questionCount),
  });
});
