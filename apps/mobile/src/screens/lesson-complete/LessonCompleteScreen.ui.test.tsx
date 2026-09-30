import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { LessonCompleteScreen } from "./LessonCompleteScreen";
import { lessonRewardPlaceholder } from "./lesson-complete";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

afterEach(() => {
  vi.unstubAllGlobals();
});

// 낭독 대역 — 이 화면은 builtin announce 하나로 낭독합니다.
function stubAnnounce(): string[] {
  const contents: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        contents.push(args.content);
        callback("announced");
      },
    },
  });
  return contents;
}

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). testid로 질의합니다.

function fixture(overrides: Partial<Parameters<typeof LessonCompleteScreen>[0]> = {}) {
  return {
    results: ["correct", "correct", "correct"] as const,
    skippedCount: 0,
    verdict: "passed" as const,
    streakDays: 1,
    trophyCount: 0,
    diamondCount: 0,
    reward: lessonRewardPlaceholder,
    onExit: vi.fn(),
    ...overrides,
  };
}

test("[LCS1] 실수가 없으면 PERFECT 제목과 설명이 서고, 제목은 header로 낭독된다", () => {
  render(<LessonCompleteScreen {...fixture()} />);

  const title = screen.getByTestId("lesson-complete-screen-title");
  expect(title).toHaveTextContent("PERFECT LESSON!");
  expect(title).toHaveAttribute("accessibility-traits", "header");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE NO MISTAKES IN THIS LESSON",
  );
});

test("[LCS2] 실수가 있으면 같은 틀에 제목 · 설명만 바뀐다", () => {
  render(<LessonCompleteScreen {...fixture({ results: ["correct", "incorrect", "correct"] })} />);

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON COMPLETE!");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE 1 MISTAKE IN THIS LESSON",
  );
  expect(screen.getByTestId("lesson-complete-screen-reward-diamond")).toBeInTheDocument();
});

test("[LA9-E][LCS3] 지표 칩 셋은 읽기 전용이고 이름을 단다", () => {
  render(<LessonCompleteScreen {...fixture({ streakDays: 3, trophyCount: 2, diamondCount: 5 })} />);

  const expected = [
    ["lesson-complete-screen-streak", "3-day streak"],
    ["lesson-complete-screen-trophy", "2 trophies"],
    ["lesson-complete-screen-diamond", "5 diamonds"],
  ] as const;
  for (const [id, label] of expected) {
    const chip = screen.getByTestId(id);
    expect(chip).toHaveAttribute("accessibility-label", label);
    expect(chip).not.toHaveAttribute("accessibility-traits", "button");
  }
});

test("[LCS4] 연속 알약은 연속이 있을 때만 선다", () => {
  const { unmount } = render(<LessonCompleteScreen {...fixture({ streakDays: 1 })} />);
  expect(screen.getByTestId("lesson-complete-screen-streak-pill")).toHaveTextContent(
    "1 Day Streak",
  );
  unmount();

  render(<LessonCompleteScreen {...fixture({ streakDays: 0 })} />);
  expect(screen.queryByTestId("lesson-complete-screen-streak-pill")).toBeNull();
});

test("[LA9-E][LCS5] 보상 카드 둘이 받은 보상을 그리고 이름을 단다", () => {
  render(<LessonCompleteScreen {...fixture({ reward: { diamondAmount: 7, grade: "GREAT" } })} />);

  const diamond = screen.getByTestId("lesson-complete-screen-reward-diamond");
  expect(diamond).toHaveTextContent("+ 7 REWARD");
  expect(diamond).toHaveAttribute("accessibility-label", "Reward, 7 diamonds");
  const grade = screen.getByTestId("lesson-complete-screen-reward-grade");
  expect(grade).toHaveTextContent("GREAT");
  expect(grade).toHaveAttribute("accessibility-label", "Grade GREAT");
});

test("[LCS6] Check tap → onExit 정확히 1회", () => {
  const onExit = vi.fn();
  render(<LessonCompleteScreen {...fixture({ onExit })} />);

  const button = screen
    .getByTestId("lesson-complete-screen-exit")
    .querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  expect(button).toHaveAttribute("accessibility-label", "Check →");
  fireEvent.tap(button as Element, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- 미통과 (2026-09-28)
//
// 통과와 미통과가 **같은 화면**이 됐습니다. 그전에는 미통과가 옆의 평가 화면이라 같은
// 순간의 두 결과가 전혀 다르게 보였습니다. 아래 셋이 그 통일의 계약입니다: 틀은 같고,
// 표식 · 제목 · 보상만 갈립니다.

test("[LCS6] 미통과는 같은 틀에 FAILED 제목이 서고 보상 카드가 아예 없다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({ verdict: "failed", results: ["incorrect", "incorrect", "correct"] })}
    />,
  );

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("LESSON FAILED");
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE 2 MISTAKES IN THIS LESSON",
  );
  // 틀은 같습니다 — 지표 칩은 그대로 섭니다.
  expect(screen.getByTestId("lesson-complete-screen-streak")).toBeInTheDocument();
  // 얻지 않은 것을 그리지 않습니다. 빈 상자도 두지 않습니다.
  expect(screen.queryByTestId("lesson-complete-screen-reward-diamond")).not.toBeInTheDocument();
  expect(screen.queryByTestId("lesson-complete-screen-reward-grade")).not.toBeInTheDocument();
});

// 색이 유일한 채널이 되지 않게 모양도 갈립니다(WCAG 1.4.1). `data-verdict`가 그 프로브입니다.
test("[LCS7] 표식이 판정마다 갈린다", () => {
  const { container, unmount } = render(<LessonCompleteScreen {...fixture()} />);
  expect(container.querySelector(".lesson-complete-screen-badge")).toHaveAttribute(
    "data-verdict",
    "passed",
  );
  unmount();

  const failed = render(<LessonCompleteScreen {...fixture({ verdict: "failed" })} />);
  expect(failed.container.querySelector(".lesson-complete-screen-badge")).toHaveAttribute(
    "data-verdict",
    "failed",
  );
});

// 나가는 수단은 어느 경우에도 하나입니다(ADR-0022 D1). 미통과의 `Try again`은 뒤로 가는
// 것이 아니라 새 세션을 여는 **나아가는** 수단이라 그 규칙과 부딪히지 않습니다.
test("[LCS8] 미통과에만 다시 풀기가 서고, 나가기는 두 경우 모두 하나다", () => {
  const onRetry = vi.fn();
  const onExit = vi.fn();

  const passed = render(<LessonCompleteScreen {...fixture({ onRetry, onExit })} />);
  expect(screen.queryByTestId("lesson-complete-screen-retry")).not.toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-exit")).toBeInTheDocument();
  passed.unmount();

  render(<LessonCompleteScreen {...fixture({ verdict: "failed", onRetry, onExit })} />);
  expect(screen.getByTestId("lesson-complete-screen-retry")).toBeInTheDocument();
  expect(screen.getByTestId("lesson-complete-screen-exit")).toBeInTheDocument();

  // 탭 대상은 감싼 상자가 아니라 그 안의 버튼입니다(위 [LCS5]와 같은 형태입니다).
  const retryButton = screen
    .getByTestId("lesson-complete-screen-retry")
    .querySelector('[data-testid="ui-lynx-button"]');
  fireEvent.tap(retryButton as Element, {});

  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onExit).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------- UI-P1~P3 (D8)
//
// **「만점이 아니다」와 「통과가 아니다」는 다른 축입니다.** 건너뛴 문항이 있으면 실수가
// 0이어도 만점이 아니고, 그래도 통과는 통과입니다 — 건너뛴 문항이 `correct`로 실려
// 통과 계산(`judgeAssessment`)에는 세어지기 때문입니다(spec §2.8.2a).
//
// 화면에 `LESSON COMPLETE!` + `YOU MADE NO MISTAKES IN THIS LESSON` 조합이 설 수
// 있고 그것이 참입니다 — 「틀리지는 않았지만 다 풀지도 않았다」. 부제는 **실수**를
// 세므로 고치지 않습니다: 건너뛴 것을 실수로 세면 그 문장이 거짓말이 됩니다.

test("[UI-P1] 건너뛴 문항이 있으면 실수가 없어도 만점이 아니다", () => {
  render(
    <LessonCompleteScreen
      {...fixture({ results: ["correct", "correct", "correct"], skippedCount: 3 })}
    />,
  );

  const title = screen.getByTestId("lesson-complete-screen-title");
  expect(title).toHaveTextContent("LESSON COMPLETE!");
  expect(title).not.toHaveTextContent("PERFECT LESSON!");
  // 부제는 그대로입니다 — 센 것이 실수이고 실수는 정말 0입니다.
  expect(screen.getByTestId("lesson-complete-screen-subtitle")).toHaveTextContent(
    "YOU MADE NO MISTAKES IN THIS LESSON",
  );
});

test("[UI-P2] 같은 화면의 표식은 통과(✓)다 — 만점이 아닌 것과 통과는 다른 축이다", () => {
  const { container } = render(
    <LessonCompleteScreen
      {...fixture({ results: ["correct", "correct", "correct"], skippedCount: 3 })}
    />,
  );

  expect(container.querySelector(".lesson-complete-screen-badge")).toHaveAttribute(
    "data-verdict",
    "passed",
  );
  // 통과했으므로 보상도 그대로 섭니다 — 얻은 것을 지우지 않습니다.
  expect(screen.getByTestId("lesson-complete-screen-reward-diamond")).toBeInTheDocument();
});

// 표지의 스킵(가)은 **유닛**을 건너뛰고 서사에는 문항이 0개라 건너뛸 문항도 0개입니다
// ⇒ `skippedCount = 0`이고 만점이 그대로 나옵니다. **이것이 예외가 아닌 것이 중요합니다**
// — 「표지만 특별히 만점을 준다」는 규칙을 두지 않았는데도 답이 맞습니다(spec §2.8.2b).
test("[UI-P3] 표지 스킵으로 온 결과 화면은 만점이다", () => {
  render(<LessonCompleteScreen {...fixture({ results: [], skippedCount: 0 })} />);

  expect(screen.getByTestId("lesson-complete-screen-title")).toHaveTextContent("PERFECT LESSON!");
});

// ---------------------------------------------------------------- 영어 렌더 · 문구표 (LA9)

test("[LA9-E] 다이아 1개 · 트로피 1개는 단수로 말한다", () => {
  render(<LessonCompleteScreen {...fixture({ trophyCount: 1, diamondCount: 1 })} />);

  expect(screen.getByTestId("lesson-complete-screen-trophy")).toHaveAttribute(
    "accessibility-label",
    "1 trophy",
  );
  expect(screen.getByTestId("lesson-complete-screen-diamond")).toHaveAttribute(
    "accessibility-label",
    "1 diamond",
  );
});

test("[LA9-E] 연속 알약의 이름이 영어 3-day streak이고 알약의 보이는 영어 문구는 그대로다", () => {
  render(<LessonCompleteScreen {...fixture({ streakDays: 3 })} />);

  expect(screen.getByTestId("lesson-complete-screen-streak-pill")).toHaveAttribute(
    "accessibility-label",
    "3-day streak",
  );
  expect(screen.getByTestId("lesson-complete-screen-streak-pill")).toHaveTextContent(
    "3 Day Streak",
  );
});

test("[LA9-E] 미통과의 나가기 버튼 이름이 Back to map이다", () => {
  render(<LessonCompleteScreen {...fixture({ verdict: "failed", onRetry: vi.fn() })} />);

  const button = screen
    .getByTestId("lesson-complete-screen-exit")
    .querySelector('[data-testid="ui-lynx-button"]');
  expect(button).toHaveAttribute("accessibility-label", "Back to map");
});

test("[LA9-E] 낭독이 통과 · 실수 수 · 건너뛴 수를 영어로 말한다", () => {
  const contents = stubAnnounce();

  render(
    <LessonCompleteScreen
      {...fixture({ results: ["incorrect", "incorrect", "correct"], skippedCount: 1 })}
    />,
  );

  expect(contents).toEqual(["Lesson complete, 2 mistakes, 1 skipped question"]);
});

test("[LA9-E] 실수도 건너뜀도 없으면 낭독이 no mistakes로 끝난다", () => {
  const contents = stubAnnounce();

  render(<LessonCompleteScreen {...fixture()} />);

  expect(contents).toEqual(["Lesson complete, no mistakes"]);
});

test("[LA9-E] 미통과의 낭독이 Lesson not passed로 시작한다", () => {
  const contents = stubAnnounce();

  render(
    <LessonCompleteScreen
      {...fixture({ verdict: "failed", results: ["incorrect", "incorrect", "correct"] })}
    />,
  );

  expect(contents).toEqual(["Lesson not passed, 2 mistakes"]);
});

test("[LA9-M] 문구표를 주입하면 지표 칩 · 보상 카드의 이름이 표의 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <LessonCompleteScreen
        {...fixture({
          streakDays: 3,
          trophyCount: 2,
          diamondCount: 5,
          reward: { diamondAmount: 7, grade: "GREAT" },
        })}
      />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("lesson-complete-screen-streak")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.streakDays⟧(3)",
  );
  expect(screen.getByTestId("lesson-complete-screen-trophy")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.trophies⟧(2)",
  );
  expect(screen.getByTestId("lesson-complete-screen-diamond")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.diamonds⟧(5)",
  );
  expect(screen.getByTestId("lesson-complete-screen-reward-diamond")).toHaveAttribute(
    "accessibility-label",
    "⟦lessonComplete.rewardDiamonds⟧(7)",
  );
  expect(screen.getByTestId("lesson-complete-screen-reward-grade")).toHaveAttribute(
    "accessibility-label",
    "⟦lessonComplete.grade⟧(GREAT)",
  );
});

test("[LA9-M] 문구표를 주입하고 연속이 있으면 연속 알약의 이름이 streakDays 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <LessonCompleteScreen {...fixture({ streakDays: 3 })} />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("lesson-complete-screen-streak-pill")).toHaveAttribute(
    "accessibility-label",
    "⟦common.count.streakDays⟧(3)",
  );
});

test("[LA9-M] 문구표를 주입하면 낭독이 outcome · mistakes · skippedSuffix 경로로 나온다", () => {
  const contents = stubAnnounce();

  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <LessonCompleteScreen
        {...fixture({ results: ["incorrect", "incorrect", "correct"], skippedCount: 1 })}
      />
    </UiCopyContext.Provider>,
  );

  expect(contents).toEqual([
    "⟦lessonComplete.outcome.passed⟧, ⟦lessonComplete.mistakes⟧(2)⟦lessonComplete.skippedSuffix⟧(1)",
  ]);
});

test("[LA9-M] 문구표를 주입하고 미통과면 나가기 버튼의 이름이 exitTo.journey 경로로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <LessonCompleteScreen {...fixture({ verdict: "failed", onRetry: vi.fn() })} />
    </UiCopyContext.Provider>,
  );

  const button = screen
    .getByTestId("lesson-complete-screen-exit")
    .querySelector('[data-testid="ui-lynx-button"]');
  expect(button).toHaveAttribute("accessibility-label", "⟦common.exitTo.journey⟧");
});
