import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { VocabCardActivity } from "./VocabCardActivity";
import type { LessonPosition } from "../learning/activity-finish";
import type { VocabCardQuestion } from "./vocab-card.contract";

// `ui` 계층: 단어 카드 활동 — 카드를 한 장씩 보이고 `Got it` 하나로 넘기며, 판정 없이 빈 결과를 한 번
// 올립니다. 카드 구간 동안 세션 헤더 대신 가벼운 헤더(`×` · 칸 막대 · `Word i of n`)가 섭니다(ADR-0073).
// 문항은 매핑 모듈이 내는 꼴로 손으로 세웠습니다(매핑 계산은 unit이 집니다).

// 예문과 번역이 모두 있는 카드입니다.
const withTranslation: VocabCardQuestion = {
  word: "괜찮아요.",
  romanization: "gwaenchanayo.",
  meaning: "It's okay.",
  example: {
    text: "아니요, 괜찮아요.",
    romanization: "aniyo, gwaenchanayo.",
    translation: "No, I'm fine.",
  },
};

// 예문은 있으나 번역이 없는 카드입니다.
const withoutTranslation: VocabCardQuestion = {
  word: "물",
  romanization: "mul",
  meaning: "water",
  example: { text: "물 주세요.", romanization: "mul juseyo.", translation: null },
};

// 예문이 없는 카드입니다(예문이 표제어와 같은 경우).
const withoutExample: VocabCardQuestion = {
  word: "오다",
  romanization: "oda",
  meaning: "to come",
  example: null,
};

// 로마자도 예문 지원 줄도 없는 카드입니다.
const bare: VocabCardQuestion = {
  word: "네",
  romanization: null,
  meaning: "yes",
  example: { text: "네, 맞아요.", romanization: null, translation: null },
};

const three = [withTranslation, withoutTranslation, withoutExample] as const;

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function mount(
  questions: readonly VocabCardQuestion[],
  options: { readonly motion?: "reduced"; readonly lesson?: LessonPosition } = {},
) {
  const onFinish = vi.fn<Finish>();
  const onExit = vi.fn<() => void>();
  const element = (
    <VocabCardActivity
      questions={questions}
      gemCount={0}
      onExit={onExit}
      onFinish={onFinish}
      lesson={options.lesson}
    />
  );
  const view = render(
    options.motion === undefined ? (
      element
    ) : (
      <MotionProvider motion={options.motion}>{element}</MotionProvider>
    ),
  );
  return { onFinish, onExit, container: view.container };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const gotIt = () => within(id("vocab-card-got-it")).getByTestId("ui-lynx-button");
const tapGotIt = (): void => void fireEvent.tap(gotIt(), {});
const segmentStates = () =>
  [
    ...id("learning-run-header-bar").querySelectorAll(
      '[data-testid^="learning-run-header-segment-"]',
    ),
  ].map((segment) => segment.getAttribute("data-state"));

describe.each([
  { name: "기본 모션", motion: undefined },
  { name: "동작 줄이기", motion: "reduced" as const },
])("VocabCardActivity — $name", ({ motion }) => {
  test("UV1. 첫 렌더는 지시문 · 표식 · 표제어 · 로마자 · 뜻을 접근성 이름과 함께 보이고 예문은 그리지 않는다", () => {
    mount(three, { motion });

    expect(id("learning-shell-instruction")).toHaveTextContent("Learn this word.");
    expect(id("vocab-card-badge")).toHaveTextContent("New word");
    expect(id("vocab-card-word")).toHaveTextContent("괜찮아요.");
    expect(id("vocab-card-word")).not.toHaveAttribute("accessibility-label");
    expect(id("vocab-card-romanization")).toHaveAttribute(
      "accessibility-label",
      "Pronunciation: gwaenchanayo.",
    );
    expect(id("vocab-card-meaning")).toHaveTextContent("It's okay.");
    expect(id("vocab-card-meaning")).toHaveAttribute("accessibility-label", "Meaning: It's okay.");
    expect(screen.queryByText("아니요, 괜찮아요.")).toBeNull();
    expect(screen.queryByText("No, I'm fine.")).toBeNull();
    expect(screen.queryByText("Example")).toBeNull();
  });

  test("UV2. 세션 헤더 대신 가벼운 헤더가 선다 — 칸 셋(current · upcoming · upcoming)과 Word 1 of 3", () => {
    mount(three, { motion });

    expect(maybe("learning-shell-session")).not.toBeInTheDocument();
    expect(maybe("learning-shell-chapter")).not.toBeInTheDocument();
    expect(segmentStates()).toEqual(["current", "upcoming", "upcoming"]);
    expect(id("learning-run-header-caption")).toHaveTextContent("Word 1 of 3");
    expect(id("learning-run-header-progress")).toHaveAttribute(
      "accessibility-label",
      "Word 1 of 3",
    );
  });

  test("UV3. 버튼은 Got it 하나 — 브랜드 · xl · 꽉 찬 폭의 ui-lynx 버튼이고 기본 아래 버튼은 없다", () => {
    mount(three, { motion });

    expect(within(id("vocab-card-got-it")).getAllByTestId("ui-lynx-button")).toHaveLength(1);
    expect(gotIt()).toHaveAttribute("accessibility-label", "Got it");
    expect(gotIt()).toHaveAttribute("accessibility-traits", "button");
    expect(gotIt()).toHaveAttribute("data-variant", "brand");
    expect(gotIt()).toHaveAttribute("data-size", "xl");
    expect(gotIt()).toHaveAttribute("data-width", "fill");
    expect(maybe("learning-shell-action")).not.toBeInTheDocument();
    expect(screen.queryByText("New to me")).toBeNull();
    expect(screen.queryByText("I know it")).toBeNull();
  });

  test("UV4. Got it을 누르면 둘째 카드가 서고 지난 칸이 done이 되며 캡션이 Word 2 of 3이다", () => {
    mount(three, { motion });

    tapGotIt();

    expect(id("vocab-card-content")).toHaveAttribute("data-card-index", "1");
    expect(id("vocab-card-word")).toHaveTextContent("물");
    expect(segmentStates()).toEqual(["done", "current", "upcoming"]);
    expect(id("learning-run-header-caption")).toHaveTextContent("Word 2 of 3");
  });
});

test("UV5. 판정이 없다 — 배지 · 결과 표식 · 완료 카드가 첫 렌더에도 Got it 뒤에도 없다", () => {
  const { container } = mount(three);

  const assertNoVerdict = (): void => {
    expect(maybe("answer-verdict")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-result]")).toHaveLength(0);
    expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
  };
  assertNoVerdict();
  tapGotIt();
  assertNoVerdict();
  tapGotIt();
  assertNoVerdict();
});

test("UV6. 마지막 카드도 버튼은 Got it이고 두 번 눌러도 판정 없는 빈 결과가 한 번만 올라가며 완료 카드가 없다", () => {
  const { onFinish } = mount(three);

  tapGotIt();
  tapGotIt();
  expect(gotIt()).toHaveAttribute("accessibility-label", "Got it");
  expect(segmentStates()).toEqual(["done", "done", "current"]);
  expect(onFinish).toHaveBeenCalledTimes(0);

  tapGotIt();
  tapGotIt();

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
  expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
});

test("UV7. 레슨 중간 활동이어도 카드 구간에는 Lesson 카운터가 서지 않고 마지막 Got it이 빈 결과를 넘긴다", () => {
  const { onFinish } = mount(three, { lesson: { offset: 0, total: 3, last: false } });

  expect(screen.queryByText(/Lesson \d+ \/ \d+/)).toBeNull();
  tapGotIt();
  tapGotIt();
  tapGotIt();

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
});

test("UV8. 로마자가 없는 카드는 그 줄을 그리지 않는다", () => {
  mount([bare]);

  expect(id("vocab-card-word")).toHaveTextContent("네");
  expect(maybe("vocab-card-romanization")).not.toBeInTheDocument();
  expect(segmentStates()).toEqual(["current"]);
});

test("UV9. 문항이 0개여도 던지지 않고 루트와 Got it이 서며 빈 결과를 한 번 올린다", () => {
  const { onFinish } = mount([]);

  expect(id("vocab-card-content")).toBeInTheDocument();
  expect(gotIt()).toHaveAttribute("accessibility-label", "Got it");

  tapGotIt();
  tapGotIt();

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
});

describe("나가기", () => {
  const leave = (container: Element): void => {
    const button = [...container.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
      (el) => el.getAttribute("accessibility-label") === "Leave",
    );
    expect(button).toBeDefined();
    fireEvent.tap(button as Element, {});
  };

  test("UV10a. 가벼운 헤더의 × → 확인창에서 Leave를 고르면 onExit이 한 번이고 결과는 올라가지 않는다", () => {
    const { onExit, onFinish, container } = mount(three);

    fireEvent.tap(id("learning-run-header-exit"), {});
    leave(container);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(0);
  });

  test("UV10b. 시스템 뒤로 → 확인창에서 Leave를 고르면 onExit이 한 번이고 결과는 올라가지 않는다", () => {
    const { onExit, onFinish, container } = mount(three);

    act(() => {
      backHandlers.runTop();
    });
    leave(container);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(0);
  });
});
