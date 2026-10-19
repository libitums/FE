import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { keyboardDockBodyStyle, keyboardDockEdgesOf } from "../../lib/keyboard-dock";
import type { KeyboardDockBottom } from "../../lib/keyboard-dock";
import type { SafeAreaInsets } from "../../lib/safe-area";
import { keystrokesFor } from "../messenger/hangul-keyboard";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";

// `ui` 계층: 타자 화면의 트리(자판이 껍데기 밖 형제)와 국면별 인라인 바깥 여백을 봅니다.
// 여백 값은 같은 순수 함수에서 만들고, 국면 판정은 다시 적지 않습니다.

const ios: SafeAreaInsets = { top: 59, bottom: 34, left: 0, right: 0 };

const dictation: TypingQuestion = {
  id: "S6-01",
  kind: "dictation",
  instruction: "Type what you read.",
  cue: "yeogwon yeogi isseoyo.",
  cueSupport: "Here's my passport.",
  hint: null,
  answers: ["여권 여기 있어요.", "여권 여기 있어요"],
  audioSource: null,
};

const translation: TypingQuestion = {
  id: "S4-13",
  kind: "translation",
  instruction: "Say this in Korean.",
  cue: "I'm staying a week.",
  cueSupport: null,
  hint: null,
  answers: ["일주일 묵어요."],
  audioSource: null,
};

afterEach(() => {
  cleanup();
});

function mount(list: readonly TypingQuestion[] = [dictation, translation]) {
  render(
    <TypingActivity
      insets={ios}
      questions={list}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
    />,
  );
}

function typeText(text: string): void {
  for (const key of keystrokesFor(text)) {
    fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
  }
}

function tapAction(): void {
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
}

/** 요소가 없으면 `null`이라 단언이 실패로 말합니다. */
function marginsOf(testId: string) {
  const node = screen.queryByTestId(testId);
  if (node === null) return null;
  const { marginBottom, marginLeft, marginRight } = node.style;
  return { marginBottom, marginLeft, marginRight };
}

const bodyMargins = (owner: KeyboardDockBottom) =>
  keyboardDockBodyStyle(keyboardDockEdgesOf(ios), owner);
// 테스트 렌더러는 정적 형제 옆의 조건부 자식을 이름 없는 `<wrapper>`로 감쌉니다 — 기기 트리에는 없는 상자라 펼칩니다.
const flatChildren = (element: Element | null): Element[] =>
  Array.from(element?.children ?? []).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? flatChildren(child) : [child],
  );
const childIds = (testId: string) =>
  flatChildren(screen.queryByTestId(testId)).map((child) => child.getAttribute("data-testid"));

describe("TypingActivity keyboard dock", () => {
  test("TU1. 첫 렌더는 바깥 상자 안 [몸통, 자판] 순서이고 껍데기는 몸통 안에 있다", () => {
    mount();
    const body = screen.queryByTestId("typing-activity-body");

    expect(childIds("typing-activity")).toEqual(["typing-activity-body", "messenger-keyboard"]);
    expect(body?.contains(screen.getByTestId("learning-shell"))).toBe(true);
    expect(
      screen.getByTestId("learning-shell").contains(screen.getByTestId("messenger-keyboard")),
    ).toBe(false);
    expect(marginsOf("typing-activity-body")).toEqual(bodyMargins("keyboard"));
    expect(marginsOf("typing-activity-body")?.marginBottom).toBe("0px");
    expect(marginsOf("messenger-keyboard-rows")?.marginBottom).toBe("34px");
  });

  test("TU2. Check 뒤에는 자판이 걷히고 몸통이 아래 인셋을 지며, Next를 누르면 되돌아온다", () => {
    mount();
    typeText("여권 여기 있어요");
    tapAction();

    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(screen.getByTestId("learning-shell-action")).toHaveAttribute(
      "accessibility-label",
      "Next",
    );
    expect(marginsOf("typing-activity-body")).toEqual(bodyMargins("body"));
    expect(marginsOf("typing-activity-body")?.marginBottom).toBe("34px");

    tapAction();
    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
    expect(marginsOf("typing-activity-body")?.marginBottom).toBe("0px");
  });

  test("TU3. Check 버튼이 문서 순서상 자판보다 앞이다", () => {
    mount();
    typeText("여권");
    const action = screen.getByTestId("learning-shell-action");
    const keyboard = screen.getByTestId("messenger-keyboard");

    expect(action).toHaveAttribute("accessibility-label", "Check");
    expect(action.compareDocumentPosition(keyboard) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  test("TU4. 마지막 문항 뒤 완료에서는 자판이 없고 몸통이 아래 인셋을 진다", () => {
    mount([dictation]);
    typeText("여권 여기 있어요");
    tapAction();
    tapAction();

    expect(screen.getByTestId("typing-activity-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(marginsOf("typing-activity-body")).toEqual(bodyMargins("body"));
    expect(marginsOf("typing-activity-body")?.marginBottom).toBe("34px");
  });

  test("TU5. 스크롤 영역에는 자판이 없고 카드는 그대로 스크롤 안에 있다", () => {
    mount();
    const scroll = screen.getByTestId("learning-shell-scroll");

    expect(scroll.contains(screen.getByTestId("typing-activity-content"))).toBe(true);
    expect(scroll.contains(screen.getByTestId("messenger-keyboard"))).toBe(false);
  });
});
