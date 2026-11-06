import { render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test } from "vitest";

import { OptionSelector } from "./index";
import type { OptionSelectorOption } from "./index";

// 보기마다 라벨 위에 서는 로마자 줄(FE 확장)의 DOM 순서 · 접근성 이름을 봅니다.

const testIdsInText = (id: string): (string | null)[] => {
  const text = screen.getByTestId(`ui-lynx-option-selector-label-${id}`).parentElement;
  return Array.from(text?.children ?? []).map((child) => child.getAttribute("data-testid"));
};

function mount(options: readonly OptionSelectorOption[]) {
  return render(
    <OptionSelector
      groupLabel="질문"
      options={options}
      variant="outlined-subtle"
      commit="immediate"
      selectedIds={[]}
      onChange={() => undefined}
    />,
  );
}

describe("OptionSelector 로마자 줄", () => {
  test("OSU5: 로마자는 라벨 위 줄이고, 뜻이 같이 있으면 로마자 · 라벨 · 뜻 순서다", () => {
    mount([
      { id: "a", label: "안녕", romanization: "annyeong" },
      { id: "b", label: "감사", romanization: "gamsa", meaning: "Thanks" },
    ]);

    expect(testIdsInText("a")).toEqual([
      "ui-lynx-option-selector-romanization-a",
      "ui-lynx-option-selector-label-a",
    ]);
    expect(testIdsInText("b")).toEqual([
      "ui-lynx-option-selector-romanization-b",
      "ui-lynx-option-selector-label-b",
      "ui-lynx-option-selector-meaning-b",
    ]);
    const roman = screen.getByTestId("ui-lynx-option-selector-romanization-a");
    expect(roman).toHaveTextContent("annyeong");
    expect(roman).not.toHaveAttribute("data-lang");
    expect(roman).not.toHaveAttribute("accessibility-element", "true");
    expect(roman.parentElement).toHaveClass("ui-lynx-option-selector-text");
  });

  test("OSU6: 로마자 · 뜻이 둘 다 없으면 래퍼 없이 라벨 하나다", () => {
    mount([
      { id: "a", label: "안녕" },
      { id: "b", label: "감사" },
    ]);

    expect(screen.queryByTestId("ui-lynx-option-selector-romanization-a")).toBeNull();
    const label = screen.getByTestId("ui-lynx-option-selector-label-a");
    expect(label.parentElement).not.toHaveClass("ui-lynx-option-selector-text");
  });

  test("OSU6: 공백뿐인 로마자는 줄을 세우지 않는다", () => {
    mount([
      { id: "a", label: "안녕", romanization: "   " },
      { id: "b", label: "감사" },
    ]);

    expect(screen.queryByTestId("ui-lynx-option-selector-romanization-a")).toBeNull();
  });

  test("OSU7: 항목 이름은 명시 이름이 없으면 라벨, 로마자 순서이고 선택 접미사가 붙는다", () => {
    render(
      <OptionSelector
        groupLabel="질문"
        options={[
          { id: "a", label: "안녕", romanization: "annyeong" },
          { id: "b", label: "감사", romanization: "gamsa" },
        ]}
        selectedIds={["b"]}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByTestId("ui-lynx-option-selector-item-a")).toHaveAttribute(
      "accessibility-label",
      "안녕, annyeong",
    );
    expect(screen.getByTestId("ui-lynx-option-selector-item-b")).toHaveAttribute(
      "accessibility-label",
      "감사, gamsa, selected",
    );
  });

  test("OSU7: 판정 항목도 로마자를 줄과 이름에 그대로 갖고, 명시 이름은 그대로 쓴다", () => {
    mount([
      { id: "a", label: "안녕", romanization: "annyeong", feedback: "correct" },
      {
        id: "b",
        label: "감사",
        romanization: "gamsa",
        accessibilityLabel: "감사, gamsa, Thank you",
      },
    ]);

    const a = screen.getByTestId("ui-lynx-option-selector-item-a");
    expect(a).toHaveClass("ui-lynx-option-selector-item-correct");
    expect(a.getAttribute("accessibility-label")).toContain("annyeong");
    expect(screen.getByTestId("ui-lynx-option-selector-romanization-a")).toHaveTextContent(
      "annyeong",
    );
    expect(screen.getByTestId("ui-lynx-option-selector-item-b")).toHaveAttribute(
      "accessibility-label",
      "감사, gamsa, Thank you",
    );
  });
});
