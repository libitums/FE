import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { SentenceOrderScreen } from "./SentenceOrderScreen";
import type { SentenceOrderQuestion } from "./sentence-order";
import type { JourneyStepId } from "../journey-map/journey-map";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 뼈대(상단 바 · 세션 헤더 · 지시문 ·
// 무대 카드 · 아래 버튼 · 스크롤)는 `LearningShell`이 집니다 — 그 모양은
// `LearningShell.ui.test.tsx`가 보고, 여기서는 카드 안 · 창고 · 아래 버튼이 무엇을 하는가만
// 봅니다.
//
// 문항은 대역입니다 — 실물 표(`sentenceOrderQuestionsByStep`)는 임시 값이라 단언하지
// 않습니다. 둘째 문항에 오답 낱말(`버스`)이 섞여 있습니다.
const ORDERING_QUESTIONS: readonly SentenceOrderQuestion[] = [
  {
    prompt: "뭐 했어?",
    // chips[1]="나는" chips[0]="밥을" chips[2]="먹었다" → 정답 문장은 "나는 밥을 먹었다".
    chips: ["밥을", "나는", "먹었다"],
    answerOrder: [1, 0, 2],
  },
  {
    prompt: "어디 가?",
    // chips[2]="학교에" chips[0]="친구와" chips[1]="간다" · chips[3]="버스"는 오답 낱말입니다.
    chips: ["친구와", "간다", "학교에", "버스"],
    answerOrder: [0, 2, 1],
  },
] as const;

vi.mock("./sentence-order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sentence-order")>();
  return {
    ...actual,
    sentenceOrderQuestionsForStep: (id: JourneyStepId) =>
      id === "ordering" ? ORDERING_QUESTIONS : [],
  };
});

afterEach(() => {
  // announce 대역이 세운 전역을 원복합니다 — 지우지 않으면 다른 파일로 샙니다.
  vi.unstubAllGlobals();
});

function renderOrdering(
  overrides: {
    onExit?: () => void;
    onFinish?: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
  } = {},
) {
  return render(
    <SentenceOrderScreen
      stepId="ordering"
      onExit={overrides.onExit ?? (() => {})}
      onFinish={overrides.onFinish ?? (() => {})}
    />,
  );
}

// 아래 버튼은 껍데기가 그립니다. 라벨이 국면을 말합니다 — `Check` · `Next` · `See results`.
function actionLabel(): string | null {
  return screen.queryByTestId("learning-shell-action")?.getAttribute("accessibility-label") ?? null;
}

function tapAction(label: string): void {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);

// ------------------------------------------------------------ announce 대역
//
// `lib/accessibility.ts`가 만지는 접점 하나(`NativeModules.LynxAccessibilityModule`)에
// 대역을 둡니다 — `lib/accessibility.ts` 자체를 mock하지 않습니다.

type AnnounceCall = { content: string };

function stubAnnounce(): AnnounceCall[] {
  const calls: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        calls.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return calls;
}

// 채점 builtin과 완료 custom 채널을 함께 셉니다.
function stubCompletionHost(): { builtin: AnnounceCall[]; completion: AnnounceCall[] } {
  const builtin: AnnounceCall[] = [];
  const completion: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        builtin.push({ content: args.content });
        callback("announced");
      },
    },
    CompletionAnnouncementModule: {
      announce: (args: { content: string }, callback: (result: unknown) => void) => {
        completion.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return { builtin, completion };
}

// 조각을 정답 순서대로 눌러 놓습니다.
function placeAllCorrectly(question: SentenceOrderQuestion): void {
  for (const chipIndex of question.answerOrder) {
    fireEvent.tap(chip(chipIndex), {});
  }
}

// 문항 전부를 정답으로 배치 · 확인하고 넘겨 완료 상태까지 몹니다.
function completeAllQuestions(): void {
  for (const question of ORDERING_QUESTIONS) {
    placeAllCorrectly(question);
    tapAction("Check");
    tapAction("Next");
  }
}

// 채점 발화를 걷어 내고 완료 채널만 셉니다.
const nonGradingCalls = (calls: readonly AnnounceCall[]): AnnounceCall[] =>
  calls.filter((call) => !call.content.startsWith("Result, "));

// ---------------------------------------------------------------- 대화 카드

test("[SO1] 상대 말풍선이 제시문이고, 내 말풍선은 빈 표시(----)이며 낭독하지 않는다", () => {
  renderOrdering();

  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent("뭐 했어?");
  const reply = screen.getByTestId("sentence-order-screen-reply");
  expect(reply).toHaveTextContent("----");
  expect(reply).toHaveAttribute("accessibility-elements-hidden", "true");
});

test("[SO2] 채점하면 내 말풍선에 놓은 순서대로 만든 문장이 서고 낭독된다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");

  const reply = screen.getByTestId("sentence-order-screen-reply");
  expect(reply).toHaveTextContent("나는 밥을 먹었다");
  expect(reply).toHaveAttribute("accessibility-elements-hidden", "false");
});

// ---------------------------------------------------------------- 조각 이동

test("[SO3] 처음에는 조각이 전부 창고에 있고 답 칸 줄은 비어 있다", () => {
  renderOrdering();

  const bank = screen.getByTestId("sentence-order-screen-bank");
  const sentence = screen.getByTestId("sentence-order-screen-sentence");
  for (const index of [0, 1, 2]) {
    expect(within(bank).getByTestId(`sentence-order-chip-${index}`)).toHaveAttribute(
      "data-placed",
      "none",
    );
  }
  expect(sentence.children).toHaveLength(0);
});

test("[SO4] 조각을 누르면 답 칸 줄로 옮겨 가고, 창고의 그 자리에는 회색 빈칸이 남는다", () => {
  renderOrdering();

  fireEvent.tap(chip(1), {});

  const sentence = screen.getByTestId("sentence-order-screen-sentence");
  expect(within(sentence).getByTestId("sentence-order-chip-1")).toHaveAttribute("data-placed", "1");
  const slot = within(screen.getByTestId("sentence-order-screen-bank")).getByTestId(
    "sentence-order-bank-slot-1",
  );
  expect(slot).toHaveAttribute("accessibility-elements-hidden", "true");
});

test("[SO5] 놓인 조각을 다시 누르면 창고로 돌아가고 빈칸이 걷힌다", () => {
  renderOrdering();

  fireEvent.tap(chip(1), {});
  fireEvent.tap(chip(1), {});

  expect(chip(1)).toHaveAttribute("data-placed", "none");
  expect(screen.queryByTestId("sentence-order-bank-slot-1")).toBeNull();
});

test("[SO6] 놓인 조각의 낭독 이름이 자리 번호를 싣는다", () => {
  renderOrdering();

  fireEvent.tap(chip(1), {});
  fireEvent.tap(chip(0), {});

  expect(chip(1)).toHaveAttribute("accessibility-label", "나는, position 1");
  expect(chip(0)).toHaveAttribute("accessibility-label", "밥을, position 2");
});

// ---------------------------------------------------------------- 오답 낱말

test("[SO7] 오답 낱말이 섞이면 정답 길이만큼 놓았을 때 확인이 선다 — 창고를 다 비울 필요가 없다", () => {
  renderOrdering();
  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");

  fireEvent.tap(chip(0), {});
  fireEvent.tap(chip(2), {});
  expect(actionLabel()).toBeNull();

  fireEvent.tap(chip(1), {});
  expect(actionLabel()).toBe("Check");
  // 오답 낱말은 창고에 남아 있습니다.
  expect(chip(3)).toHaveAttribute("data-placed", "none");
});

test("[SO8] 칸이 다 차면 창고의 조각은 누를 수 없다 — 놓인 조각을 빼야 다시 놓을 수 있다", () => {
  renderOrdering();
  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");

  placeAllCorrectly(ORDERING_QUESTIONS[1]);
  const distractor = chip(3);
  expect(distractor).toHaveAttribute("accessibility-traits", "disabled");
  fireEvent.tap(distractor, {});
  expect(distractor).toHaveAttribute("data-placed", "none");

  fireEvent.tap(chip(1), {});
  expect(chip(3)).toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(chip(3), {});
  expect(chip(3)).toHaveAttribute("data-placed", "3");
});

// ---------------------------------------------------------------- 채점 · 다음 · 완료

test("[SO9] 덜 놓았으면 아래 버튼이 없다", () => {
  renderOrdering();

  expect(actionLabel()).toBeNull();
  fireEvent.tap(chip(1), {});
  expect(actionLabel()).toBeNull();
});

test("[SO10] 정답 순서로 확인하면 판정 배지가 정답이고 버튼이 다음으로 바뀐다", () => {
  renderOrdering();

  expect(screen.queryByTestId("answer-verdict")).toBeNull();
  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(actionLabel()).toBe("Next");
});

test("[SO11] 틀린 순서로 확인하면 판정 배지가 오답이다", () => {
  renderOrdering();

  fireEvent.tap(chip(0), {});
  fireEvent.tap(chip(1), {});
  fireEvent.tap(chip(2), {});
  tapAction("Check");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
});

test("[SO12] 채점 뒤에는 조각을 눌러도 배치 · 판정이 그대로다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  fireEvent.tap(chip(1), {});

  expect(chip(1)).toHaveAttribute("data-placed", "1");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
});

test("[SO13] 다음을 누르면 둘째 문항으로 넘어가고 배치 · 판정이 초기화된다", () => {
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");

  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent("어디 가?");
  expect(screen.getByTestId("sentence-order-screen-sentence").children).toHaveLength(0);
  expect(screen.queryByTestId("answer-verdict")).toBeNull();
});

test("[SO14] 문항을 다 마치면 완료 문구와 결과 보기가 서고, 결과 보기는 onFinish를 판정 배열로 한 번 부른다", () => {
  const onFinish = vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>();
  renderOrdering({ onFinish });

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");
  fireEvent.tap(chip(1), {});
  fireEvent.tap(chip(0), {});
  fireEvent.tap(chip(2), {});
  tapAction("Check");
  tapAction("Next");

  expect(screen.getByTestId("sentence-order-screen-complete")).toHaveTextContent(
    "All questions done",
  );
  tapAction("See results");
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith("ordering", ["correct", "incorrect"], 0);
});

// ---------------------------------------------------------------- 채점 발화

test("마운트만으로는 announce가 불리지 않는다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  expect(calls).toHaveLength(0);
});

test("채점 시점에 announce가 한 번 불리고 content가 '채점 결과, 정답'이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("Result, correct");
});

test("오답 채점은 content가 '채점 결과, 오답'이다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  fireEvent.tap(chip(0), {});
  fireEvent.tap(chip(1), {});
  fireEvent.tap(chip(2), {});
  tapAction("Check");

  expect(calls).toHaveLength(1);
  expect(calls[0]?.content).toBe("Result, incorrect");
});

test("대역이 없어도 화면이 던지지 않는다", () => {
  expect(() => renderOrdering()).not.toThrow();
});

// ---------------------------------------------------------------- 완료 발화
//
// 이 화면의 둘째 능동 채널입니다. 여기서 세는 것은 `nonGradingCalls`로 걸러 낸 완료
// 채널 하나입니다.

test("[X-A] 완료 전이 뒤 완료 발화가 정확히 하나이고 content가 '문항을 모두 마쳤어요, 결과 보기'다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  completeAllQuestions();

  expect(screen.getByTestId("sentence-order-screen-complete")).toBeInTheDocument(); // 앵커
  expect(nonGradingCalls(calls)).toHaveLength(1);
  expect(nonGradingCalls(calls)[0]?.content).toBe("All questions done, See results");
});

test("[X-B] 첫 렌더 · 확인 · 중간 다음까지 완료 발화가 0건이다 — 채점 발화만 나간다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");

  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent("어디 가?"); // 앵커
  expect(nonGradingCalls(calls)).toHaveLength(0);
  expect(calls.map((call) => call.content)).toEqual(["Result, correct"]);
});

test("[X-C] 완료 상태에서 같은 props로 다시 렌더해도 완료 발화가 늘지 않는다", () => {
  const calls = stubAnnounce();
  const onExit = () => {};
  const onFinish = () => {};
  const view = render(
    <SentenceOrderScreen stepId="ordering" onExit={onExit} onFinish={onFinish} />,
  );

  completeAllQuestions();
  expect(nonGradingCalls(calls)).toHaveLength(1);

  view.rerender(<SentenceOrderScreen stepId="ordering" onExit={onExit} onFinish={onFinish} />);
  view.rerender(<SentenceOrderScreen stepId="ordering" onExit={onExit} onFinish={onFinish} />);

  expect(nonGradingCalls(calls)).toHaveLength(1);
});

// X-D. 소리에만 있는 낱말이 0건입니다(ADR-0016 D11-1). 발화를 리터럴로 다시 적지 않고
// DOM에서 파생해 짓습니다 — 앞절은 종료 문구, 뒷절은 그 순간의 아래 버튼 이름입니다.
test("[X-D] 완료 발화가 종료 문구와 그 순간 아래 버튼의 이름에서 그대로 나온다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  completeAllQuestions();

  const completeText = screen.getByTestId("sentence-order-screen-complete").textContent ?? "";
  const label = actionLabel() ?? "";
  expect(nonGradingCalls(calls)[0]?.content).toBe(`${completeText}, ${label}`);
});

test("[X-E] 문항이 0인 스텝은 마운트가 곧 완료라 그 순간 완료 발화가 하나 나간다", () => {
  const calls = stubAnnounce();

  render(<SentenceOrderScreen stepId="introduction" onExit={() => {}} onFinish={() => {}} />);

  expect(screen.getByTestId("sentence-order-screen-complete")).toBeInTheDocument(); // 앵커
  expect(nonGradingCalls(calls)).toHaveLength(1);
  expect(nonGradingCalls(calls)[0]?.content).toBe("All questions done, See results");
});

test("[X-F] 전체 경로의 발화가 채점들 뒤에 완료 하나로 끝난다", () => {
  const calls = stubAnnounce();
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");
  placeAllCorrectly(ORDERING_QUESTIONS[1]);
  tapAction("Check");
  expect(calls.map((call) => call.content)).toEqual(["Result, correct", "Result, correct"]);

  tapAction("Next");
  expect(calls.map((call) => call.content)).toEqual([
    "Result, correct",
    "Result, correct",
    "All questions done, See results",
  ]);
});

test("마지막 다음 뒤 custom 완료 발화가 한 번이고 builtin 채점 발화만 유지된다", () => {
  const { builtin, completion } = stubCompletionHost();
  renderOrdering();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  tapAction("Check");
  tapAction("Next");
  placeAllCorrectly(ORDERING_QUESTIONS[1]);
  tapAction("Check");
  const builtinBeforeCompletion = builtin.length;
  tapAction("Next");

  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("All questions done, See results");
  expect(builtin).toHaveLength(builtinBeforeCompletion);
});

// ---------------------------------------------------------------- 나가기

test("나가기를 누르고 그만두기를 고르면 onExit이 한 번, onFinish는 불리지 않는다", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>();
  const { container } = renderOrdering({ onExit, onFinish });

  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});
  const leave = [...container.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
    (el) => el.getAttribute("accessibility-label") === "Leave",
  );
  expect(leave).toBeDefined();
  fireEvent.tap(leave as Element, {});

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});

test("accessibility-value가 화면 어디에도 없다", () => {
  const { container } = renderOrdering();

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
});

// ---------------------------------------------------------------- 영어 렌더 · 문구표 (LA3)

test("[LA3-E] 지시문이 영어이고 대화 문장은 학습 콘텐츠(한국어) 그대로다", () => {
  renderOrdering();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Complete the conversation.",
  );
  expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent("뭐 했어?");
});

function renderOrderingMarked(): ReturnType<typeof render> {
  return render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SentenceOrderScreen stepId="ordering" onExit={() => {}} onFinish={() => {}} />
    </UiCopyContext.Provider>,
  );
}

test("[LA3-M] 문구표를 주입하면 지시문 · 나가기 · 아래 버튼이 표의 경로로 나온다", () => {
  renderOrderingMarked();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "⟦sentenceOrder.instruction⟧",
  );
  expect(screen.getByTestId("learning-shell-exit")).toHaveAttribute(
    "accessibility-label",
    "⟦learningShell.exitLesson⟧",
  );
});

test("[LA3-M] 문구표를 주입하고 조각을 놓으면 조각 이름 · 확인 · 다음 버튼이 표의 경로로 나온다", () => {
  renderOrderingMarked();
  const question = ORDERING_QUESTIONS[0];

  placeAllCorrectly(question);
  expect(chip(1)).toHaveAttribute("accessibility-label", "⟦sentenceOrder.placedChip⟧(나는, 1)");
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "⟦common.check⟧",
  );

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "⟦common.next⟧",
  );
});

test("[LA3-M] 문구표를 주입하고 채점하면 낭독이 resultAnnouncement 경로로 나온다", () => {
  const calls = stubAnnounce();
  renderOrderingMarked();

  placeAllCorrectly(ORDERING_QUESTIONS[0]);
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(calls.map((call) => call.content)).toEqual(["⟦common.resultAnnouncement⟧(correct)"]);
});

test("[LA3-M] 문구표를 주입하고 문항을 마치면 완료 문구 · 마치기 · 낭독이 표의 경로로 나온다", () => {
  const { completion } = stubCompletionHost();
  renderOrderingMarked();

  for (const question of ORDERING_QUESTIONS) {
    placeAllCorrectly(question);
    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  }

  expect(screen.getByTestId("sentence-order-screen-complete")).toHaveTextContent(
    "⟦common.allQuestionsDone⟧",
  );
  expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
    "accessibility-label",
    "⟦common.seeResults⟧",
  );
  expect(completion).toHaveLength(1);
  expect(completion[0]?.content).toBe("⟦common.allQuestionsDone⟧, ⟦common.seeResults⟧");
});
