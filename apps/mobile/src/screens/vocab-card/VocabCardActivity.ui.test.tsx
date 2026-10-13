import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { VocabCardActivity } from "./VocabCardActivity";
import type { VocabCardQuestion } from "./vocab-card.contract";

// `ui` 계층: 단어 카드 활동 — 카드를 한 장씩 보이고 넘기며, 판정 없이 빈 결과를 한 번 올립니다.
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
  options: { readonly motion?: "reduced" } = {},
) {
  const onFinish = vi.fn<Finish>();
  const onExit = vi.fn<() => void>();
  const element = (
    <VocabCardActivity questions={questions} gemCount={0} onExit={onExit} onFinish={onFinish} />
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
const tapAction = (): void => void fireEvent.tap(id("learning-shell-action"), {});
const actionLabel = () => id("learning-shell-action").getAttribute("accessibility-label");

describe.each([
  { name: "기본 모션", motion: undefined },
  { name: "동작 줄이기", motion: "reduced" as const },
])("VocabCardActivity — $name", ({ motion }) => {
  test("UV1. 첫 렌더는 머리 라벨 · 지시문 · 표식 · 표제어 · 로마자 · 뜻 · 예문 · 지원 줄을 접근성 이름과 함께 보이고 버튼 Next가 처음부터 있다", () => {
    mount(three, { motion });

    expect(id("learning-shell-form")).toHaveTextContent("New words");
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
    expect(id("vocab-card-example-title")).toHaveTextContent("Example");
    expect(id("vocab-card-example-title")).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(id("vocab-card-example-text")).toHaveAttribute(
      "accessibility-label",
      "Example: 아니요, 괜찮아요.",
    );
    expect(id("vocab-card-example-support")).toHaveAttribute(
      "accessibility-label",
      "Pronunciation: aniyo, gwaenchanayo. Meaning: No, I'm fine.",
    );
    expect(id("vocab-card-example-translation")).toHaveTextContent("No, I'm fine.");
    expect(actionLabel()).toBe("Next");
  });

  test("UV3. Next를 누르면 둘째 카드가 서고 번역이 없으면 지원 줄은 발음만 읽으며 카운터가 한 칸 간다", () => {
    mount(three, { motion });

    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 3");
    tapAction();

    expect(id("vocab-card-content")).toHaveAttribute("data-card-index", "1");
    expect(id("vocab-card-word")).toHaveTextContent("물");
    expect(maybe("vocab-card-example-translation")).not.toBeInTheDocument();
    expect(id("vocab-card-example-support")).toHaveAttribute(
      "accessibility-label",
      "Pronunciation: mul juseyo.",
    );
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3");
  });
});

test("UV2. 판정이 없다 — 배지 · 결과 표식 · 완료 카드가 첫 렌더에도 Next 뒤에도 없다", () => {
  const { container } = mount(three);

  const assertNoVerdict = (): void => {
    expect(maybe("answer-verdict")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-result]")).toHaveLength(0);
    expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
  };
  assertNoVerdict();
  tapAction();
  assertNoVerdict();
  tapAction();
  assertNoVerdict();
});

test("UV4. 예문이 없는 카드는 예문 상자 없이 표제어와 뜻만 선다", () => {
  mount(three);

  tapAction();
  tapAction();

  expect(id("vocab-card-content")).toHaveAttribute("data-card-index", "2");
  expect(maybe("vocab-card-example")).not.toBeInTheDocument();
  expect(id("vocab-card-word")).toHaveTextContent("오다");
  expect(id("vocab-card-meaning")).toHaveTextContent("to come");
});

test("UV5. 마지막 카드의 버튼은 See results이고 두 번 눌러도 판정 없는 빈 결과가 한 번만 올라가며 완료 카드가 없다", () => {
  const { onFinish } = mount(three);

  tapAction();
  tapAction();
  expect(actionLabel()).toBe("See results");
  expect(onFinish).toHaveBeenCalledTimes(0);

  tapAction();
  tapAction();

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 0);
  expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
});

test("UV6. 로마자와 예문 지원 줄이 없는 카드는 그 줄들을 그리지 않는다", () => {
  mount([bare]);

  expect(id("vocab-card-word")).toHaveTextContent("네");
  expect(maybe("vocab-card-romanization")).not.toBeInTheDocument();
  expect(id("vocab-card-example-text")).toBeInTheDocument();
  expect(maybe("vocab-card-example-support")).not.toBeInTheDocument();
});

test("UV7. 문항이 0개여도 던지지 않고 루트와 See results 버튼이 서며 빈 결과를 한 번 올린다", () => {
  const { onFinish } = mount([]);

  expect(id("vocab-card-content")).toBeInTheDocument();
  expect(actionLabel()).toBe("See results");

  tapAction();
  tapAction();

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

  test("UV8a. 나가기 버튼 → 확인창에서 Leave를 고르면 onExit이 한 번이고 결과는 올라가지 않는다", () => {
    const { onExit, onFinish, container } = mount(three);

    fireEvent.tap(id("learning-shell-exit"), {});
    leave(container);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(0);
  });

  test("UV8b. 시스템 뒤로 → 확인창에서 Leave를 고르면 onExit이 한 번이고 결과는 올라가지 않는다", () => {
    const { onExit, onFinish, container } = mount(three);

    act(() => {
      backHandlers.runTop();
    });
    leave(container);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(0);
  });
});
