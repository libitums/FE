import { afterEach, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import {
  activityScreenIds,
  boot,
  contentIdOf,
  cover,
  exitResult,
  flush,
  learningEvents,
  lessonPlan,
  node,
  resetApp,
  savedUnits,
  status,
  tapNode,
  throughS8,
  title,
  trophyCount,
  u01,
  u02,
} from "./test-helpers/episode-format-harness";
import { solveActivity, solveLesson } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 새 형식 내장본(모킹 없음) 그대로 앱 전체를 걷습니다 - CULT 단계가 문화 카드 → 단어 선택으로
// 실제로 서고, 완료 키(`completion.requires`)에 따른 트로피 · 다음 표지 열림, 건너뜀이 섞인 단계의 진행,
// 대화 조립의 칸 화자, 옛 진행 키(`S9`) 내성을 한 트리에서 봅니다. 대역은 경계뿐입니다(공용 헬퍼 참고).
// 정답은 계약 함수(`catalogLessonPlanOf`)가 내는 계획에서 읽어 탭합니다.

const nodeKeys = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];

afterEach(resetApp);

test("EF1. (AC4) 표지만 끝낸 진행: u01 구획에 노드 10개(레슨 8 + 문화 + 최종)가 서고 S1만 열리며 CULT는 Culture로 잠겨 있다", async () => {
  await boot({ [u01]: ["intro"] });

  const nodes = Array.from(
    document.querySelectorAll(
      '[data-testid^="ui-lynx-learning-unit-catalog-unit-u01-water-"], [data-testid^="ui-lynx-special-unit-catalog-unit-u01-water-"]',
    ),
  ).filter((element) => /-u01-water-[A-Za-z0-9]+$/.test(element.getAttribute("data-testid") ?? ""));
  expect(nodes).toHaveLength(10);
  expect(status(u01, "S1")).toBe("available");
  for (const key of nodeKeys.slice(1)) expect(status(u01, key)).toBe("default");
  expect(node(u01, "CULT")).toHaveAttribute("accessibility-label", "Episode 1. Culture, locked");
  tapNode(u01, "CULT");
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  for (const id of activityScreenIds) expect(screen.queryByTestId(id)).not.toBeInTheDocument();
});

test("EF2. (AC4) CULT는 더는 즉시 결과가 아니다: 탭하면 문화 카드 화면이 서고 계획은 활동 2 · 건너뜀 0이다", async () => {
  const { events } = await boot({ [u01]: throughS8 });
  const plan = lessonPlan(u01, "CULT");
  expect(plan.activities).toHaveLength(2);
  expect(plan.skippedItemCount).toBe(0);
  expect(status(u01, "CULT")).toBe("available");
  expect(status(u01, "RP")).toBe("default");

  tapNode(u01, "CULT");

  expect(screen.getByTestId("culture-card-content")).toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-exit")).not.toBeInTheDocument();
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "CULT",
      unitRole: "lesson",
      questionCount: String(plan.questionCount),
      shownItemCount: String(plan.shownItemCount),
      skippedItemCount: "0",
    },
  ]);
});

test("EF3. (AC3) 옛 키 모양 진행(S2 · CULT 없음)은 완료가 아니고, S2 · CULT를 끝내면 트로피 +1 · u02 표지가 열린다", async () => {
  const oldShape = ["intro", "S1", "S3", "S4", "S5", "S6", "S7", "S8", "RP"];
  await boot({ [u01]: oldShape });
  const baseline = trophyCount();
  expect(cover(u02)).toHaveAttribute("data-status", "default");
  expect(status(u01, "S2")).toBe("available");
  expect(status(u01, "CULT")).toBe("available");

  tapNode(u01, "S2");
  solveLesson(lessonPlan(u01, "S2"), true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "S2")).toBe("clear");
  expect(trophyCount()).toBe(baseline);
  expect(cover(u02)).toHaveAttribute("data-status", "default");

  tapNode(u01, "CULT");
  solveLesson(lessonPlan(u01, "CULT"), true);
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();
  expect(status(u01, "CULT")).toBe("clear");
  expect(trophyCount()).toBe(baseline + 1);
  expect(cover(u02)).toHaveAttribute("data-status", "available");
});

test("EF4. (AC5) 건너뜀이 섞인 S5: 계획의 단어 선택 · 타자 문항을 끝까지 맞히면 PERFECT · 기록 · 이벤트의 건너뜀 수가 계획과 같다", async () => {
  const plan = lessonPlan(u01, "S5");
  const sentences = plan.activities.flatMap((activity) =>
    activity.form === "read-aloud" ? activity.questions.map((question) => question.sentence) : [],
  );
  const { rpcs, events } = await boot(
    { [u01]: ["intro", "S1", "S2", "S3", "S4"] },
    { speech: { granted: true, heard: (attempt) => sentences[attempt] ?? null } },
  );
  expect(plan.skippedItemCount).toBeGreaterThan(0);
  expect(plan.activities.map((activity) => activity.form)).toContain("word-choice");
  expect(plan.activities.map((activity) => activity.form)).toContain("read-aloud");

  tapNode(u01, "S5");
  const seen = solveLesson(plan, true);
  expect(seen).toEqual(plan.activities.map((activity) => contentIdOf[activity.form]));
  expect(seen).toContain("read-aloud-content");
  expect(title()).toHaveTextContent("PERFECT LESSON!");
  exitResult();
  await flush();

  expect(status(u01, "S5")).toBe("clear");
  expect(status(u01, "S6")).toBe("available");
  await vi.waitFor(() => expect(savedUnits(rpcs, u01)).toContain("S5"));
  expect(learningEvents(events)).toEqual([
    {
      name: "episode_lesson_started",
      episodeId: u01,
      unitKey: "S5",
      unitRole: "lesson",
      questionCount: String(plan.questionCount),
      shownItemCount: String(plan.shownItemCount),
      skippedItemCount: String(plan.skippedItemCount),
    },
    {
      name: "episode_lesson_finished",
      episodeId: u01,
      unitKey: "S5",
      unitRole: "lesson",
      verdict: "passed",
      correctCount: String(plan.questionCount),
      questionCount: String(plan.questionCount),
      skippedCount: "0",
    },
  ]);
});

test("EF5. (D9) S2의 대화 조립: 칸 0의 화자가 콘텐츠 턴 화자를 따른다 - 나부터 시작하는 문항은 me, 상대부터인 문항은 counterpart", async () => {
  await boot({ [u01]: ["intro", "S1"] });
  const plan = lessonPlan(u01, "S2");
  tapNode(u01, "S2");

  const expected: (string | undefined)[] = [];
  const shown: (string | null)[] = [];
  plan.activities.forEach((activity, index) => {
    expect(screen.getByTestId(contentIdOf[activity.form])).toBeInTheDocument();
    const first = activity.form === "sentence-order" ? activity.questions[0] : undefined;
    const slot = screen.queryByTestId("sentence-order-dialogue-slot-0");
    if (first !== undefined || slot !== null) {
      expected.push(first?.dialogue?.speakers[0]);
      shown.push(slot?.getAttribute("data-speaker") ?? null);
    }
    solveActivity(activity, true, index === plan.activities.length - 1);
  });
  expect(shown).toEqual(expected);
  expect(shown).toContain("me");
  expect(shown).toContain("counterpart");
});

test("EF6. (A3 옛 키) 옛 키 S9가 섞인 진행도 맵 · 시작이 던지지 않고 S9 노드는 서지 않는다", async () => {
  await boot({ [u01]: ["intro", "S1", "S9"] });

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(status(u01, "S1")).toBe("clear");
  expect(status(u01, "S2")).toBe("available");
  expect(document.querySelector('[data-testid$="-u01-water-S9"]')).toBeNull();
  tapNode(u01, "S2");
  const first = lessonPlan(u01, "S2").activities[0];
  expect(screen.getByTestId(contentIdOf[first?.form ?? "word-choice"])).toBeInTheDocument();
});
