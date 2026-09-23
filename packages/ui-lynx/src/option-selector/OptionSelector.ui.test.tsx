import { color } from "@libitums/design-tokens";
import tick from "@libitums/icons/lynx/tick";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { describe, expect, test, vi } from "vitest";

import { OptionSelector } from "./index";
import type { OptionSelectorOption } from "./index";

const options: readonly OptionSelectorOption[] = [
  { id: "a", label: "Coffee, please" },
  { id: "b", label: "Tea, please" },
  { id: "c", label: "Water, please", disabled: true },
];

describe("OptionSelector UI", () => {
  test("목록에 groupLabel을, 항목마다 Label 접근성 이름과 traits를 노출한다", () => {
    render(
      <OptionSelector
        groupLabel="알맞은 응답을 고르세요"
        options={options}
        selectedIds={["b"]}
        onChange={() => undefined}
      />,
    );

    const root = screen.getByTestId("ui-lynx-option-selector");
    expect(root).toHaveAttribute("data-variant", "outlined");
    expect(root).toHaveAttribute("data-size", "m");
    expect(root).toHaveAttribute("data-layout", "stack");
    expect(root).toHaveClass("ui-lynx-option-selector-stack");

    const list = screen.getByTestId("ui-lynx-option-selector-list");
    expect(list).toHaveAttribute("accessibility-label", "알맞은 응답을 고르세요");
    expect(list).toHaveAttribute("accessibility-element", "false");

    const a = screen.getByTestId("ui-lynx-option-selector-item-a");
    expect(a).toHaveAttribute("accessibility-element", "true");
    expect(a).toHaveAttribute("accessibility-label", "Coffee, please");
    expect(a).toHaveAttribute("accessibility-traits", "button");
    expect(a).toHaveAttribute("data-selected", "false");

    const b = screen.getByTestId("ui-lynx-option-selector-item-b");
    expect(b).toHaveAttribute("accessibility-label", "Tea, please, 선택됨");
    expect(b).toHaveAttribute("accessibility-traits", "button");
    expect(b).toHaveClass("ui-lynx-option-selector-item-selected");

    const c = screen.getByTestId("ui-lynx-option-selector-item-c");
    expect(c).toHaveAttribute("accessibility-traits", "disabled");
    expect(c).toHaveAttribute("data-disabled", "true");

    expect(screen.getByTestId("ui-lynx-option-selector-label-a")).toHaveTextContent(
      "Coffee, please",
    );
  });

  test("Indicator는 Selected 항목에만 그리고 장식 래퍼는 접근성 트리에서 숨긴다", () => {
    render(
      <OptionSelector
        groupLabel="질문"
        options={options}
        selectedIds={["b"]}
        onChange={() => undefined}
      />,
    );

    expect(screen.queryByTestId("ui-lynx-option-selector-indicator-a")).not.toBeInTheDocument();
    const indicator = screen.getByTestId("ui-lynx-option-selector-indicator-b");
    expect(indicator).toHaveAttribute("content", tick.replace(/currentColor/g, color.fg.brand));
    expect(indicator).toHaveAttribute("current-color", color.fg.brand);
    const surface = screen.getByTestId("ui-lynx-option-selector-item-b").firstElementChild;
    expect(surface).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("Deferred · Single은 탭한 항목을 선택하고 이미 선택된 항목은 다시 알리지 않는다", () => {
    const onChange = vi.fn<(ids: readonly string[]) => void>();
    const onCommit = vi.fn<(id: string) => void>();
    render(
      <OptionSelector
        groupLabel="질문"
        options={options}
        selectedIds={["a"]}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-b"), {});
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-a"), {});

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["b"]);
    expect(onCommit).not.toHaveBeenCalled();
  });

  test("Deferred · Multiple은 탭마다 선택을 켜고 끈다", () => {
    const onChange = vi.fn<(ids: readonly string[]) => void>();
    render(
      <OptionSelector
        groupLabel="질문"
        options={options}
        selection="multiple"
        selectedIds={["b"]}
        onChange={onChange}
      />,
    );

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-a"), {});
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-b"), {});

    expect(onChange).toHaveBeenNthCalledWith(1, ["a", "b"]);
    expect(onChange).toHaveBeenNthCalledWith(2, []);
  });

  test("Immediate · Single은 선택한 뒤 바로 onCommit을 호출한다", () => {
    const calls: string[] = [];
    render(
      <OptionSelector
        groupLabel="질문"
        options={options}
        commit="immediate"
        selectedIds={[]}
        onChange={(ids) => calls.push(`change:${ids.join(",")}`)}
        onCommit={(id) => calls.push(`commit:${id}`)}
      />,
    );

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-a"), {});

    expect(calls).toEqual(["change:a", "commit:a"]);
  });

  test("Disabled 항목과 committed 목록은 탭을 무시한다", () => {
    const onChange = vi.fn<(ids: readonly string[]) => void>();
    const onCommit = vi.fn<(id: string) => void>();
    const { rerender } = render(
      <OptionSelector
        groupLabel="질문"
        options={options}
        commit="immediate"
        selectedIds={[]}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-c"), {});
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <OptionSelector
        groupLabel="질문"
        options={options}
        commit="immediate"
        committed
        selectedIds={["a"]}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );

    const a = screen.getByTestId("ui-lynx-option-selector-item-a");
    expect(a).toHaveAttribute("accessibility-traits", "disabled");
    expect(a).toHaveAttribute("accessibility-label", "Coffee, please, 선택됨");
    expect(screen.getByTestId("ui-lynx-option-selector-indicator-a")).toHaveAttribute(
      "current-color",
      color.fg.disabled,
    );
    fireEvent.tap(a, {});
    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-b"), {});

    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId("ui-lynx-option-selector")).toHaveAttribute("data-committed", "true");
  });

  test("Grid는 두 항목씩 행으로 묶고 홀수 마지막 행에 빈 칸을 둔다", () => {
    render(
      <OptionSelector
        groupLabel="질문"
        options={options}
        layout="grid"
        size="s"
        variant="filled"
        selectedIds={[]}
        onChange={() => undefined}
      />,
    );

    const root = screen.getByTestId("ui-lynx-option-selector");
    expect(root).toHaveClass("ui-lynx-option-selector-grid");
    expect(root).toHaveClass("ui-lynx-option-selector-filled");
    expect(root).toHaveClass("ui-lynx-option-selector-s");
    const rows = screen.getAllByTestId("ui-lynx-option-selector-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.children).toHaveLength(2);
    expect(rows[1]!.children).toHaveLength(2);
    expect(rows[1]!.lastElementChild).toHaveClass("ui-lynx-option-selector-cell-spacer");
  });

  test("학습 언어 Label은 language tag를 싣는다", () => {
    render(
      <OptionSelector
        groupLabel="알맞은 응답을 고르세요"
        options={options}
        contentLanguage="learning"
        languageTag="en-US"
        selectedIds={[]}
        onChange={() => undefined}
      />,
    );

    const root = screen.getByTestId("ui-lynx-option-selector");
    expect(root).toHaveAttribute("data-language", "learning");
    expect(root).toHaveAttribute("data-lang", "en-US");
    expect(screen.getByTestId("ui-lynx-option-selector-label-a")).toHaveAttribute(
      "data-lang",
      "en-US",
    );
  });

  // FE 확장(2026-09-21): Label 앞 장식 그림.
  test("icon이 있으면 Label 앞에 장식 그림을 그리고 접근성 이름은 Label 그대로다", () => {
    const flag = '<svg viewBox="0 0 40 28"><rect width="40" height="28" fill="red"/></svg>';
    render(
      <OptionSelector
        groupLabel="언어"
        options={[
          { id: "a", label: "English", icon: flag },
          { id: "b", label: "Spanish" },
        ]}
        selectedIds={["a"]}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByTestId("ui-lynx-option-selector-icon-a")).toHaveAttribute("content", flag);
    expect(screen.queryByTestId("ui-lynx-option-selector-icon-b")).toBeNull();
    expect(screen.getByTestId("ui-lynx-option-selector-item-a")).toHaveAttribute(
      "accessibility-label",
      "English, 선택됨",
    );
  });

  test("accessibilityLabel이 있으면 보이는 Label 대신 접근성 이름이 되고 선택 접미사가 뒤에 붙는다", () => {
    render(
      <OptionSelector
        groupLabel="국가"
        options={[
          { id: "kr", label: "🇰🇷  South Korea  +82", accessibilityLabel: "South Korea +82" },
          { id: "jp", label: "🇯🇵  Japan  +81", accessibilityLabel: "Japan +81" },
        ]}
        selectedIds={["kr"]}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByTestId("ui-lynx-option-selector-item-kr")).toHaveAttribute(
      "accessibility-label",
      "South Korea +82, 선택됨",
    );
    expect(screen.getByTestId("ui-lynx-option-selector-item-jp")).toHaveAttribute(
      "accessibility-label",
      "Japan +81",
    );
    expect(screen.getByTestId("ui-lynx-option-selector-label-kr")).toHaveTextContent(
      "🇰🇷 South Korea +82",
    );
  });
});
