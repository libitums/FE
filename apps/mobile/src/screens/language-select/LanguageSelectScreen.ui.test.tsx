import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  entryLanguageLabel,
  entryLanguages,
  isEntryLanguageAvailable,
} from "../../lib/entry-language";
import { LanguageSelectScreen } from "./LanguageSelectScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 언어 넷의 순서 · 선택 · 비활성 · Continue를 본다
// (ADR-0006 D4). 라벨 값은 `entryLanguageLabel`의 결과로 비교한다 — 로직을 다시 적지
// 않는다(계약 §2.2).
//
// 2026-09-21 디자인 반영: 제목 「Select Language」 · 안내, 선택지는 ui-lynx OptionSelector
// (single · deferred)이고 영어만 고를 수 있다. 하단 Continue →.

function option(language: string): HTMLElement {
  return screen.getByTestId(`ui-lynx-option-selector-item-${language}`);
}

describe("LanguageSelectScreen (LIB-261)", () => {
  it("[LS-U1] 제목 · 안내가 서고 언어 넷이 어휘 순서로 선다", () => {
    const { container } = render(
      <LanguageSelectScreen selected="en" onSelect={vi.fn()} onContinue={vi.fn()} />,
    );

    expect(screen.getByTestId("language-select-screen-title")).toHaveTextContent("Select Language");
    expect(screen.getByTestId("language-select-screen-caption")).toHaveTextContent(
      "Choose the language you want to proceed with",
    );

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="ui-lynx-option-selector-item-"]'),
    ).map((el) => el.getAttribute("data-testid"));
    expect(rendered).toEqual(
      entryLanguages.map((language) => `ui-lynx-option-selector-item-${language}`),
    );
    for (const language of entryLanguages) {
      expect(screen.getByTestId(`ui-lynx-option-selector-label-${language}`)).toHaveTextContent(
        entryLanguageLabel(language),
      );
    }

    const scroll = screen.getByTestId("language-select-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[LS-U2] 영어만 고를 수 있고 나머지는 disabled다", () => {
    render(<LanguageSelectScreen selected="en" onSelect={vi.fn()} onContinue={vi.fn()} />);

    for (const language of entryLanguages) {
      const item = option(language);
      const available = isEntryLanguageAvailable(language);
      expect(item).toHaveAttribute("data-disabled", available ? "false" : "true");
      expect(item).toHaveAttribute("accessibility-traits", available ? "button" : "disabled");
    }
    expect(option("en")).toHaveAttribute("data-disabled", "false");
  });

  it("[LS-U3] 고른 언어가 selected로 서고, disabled 언어를 눌러도 onSelect가 0회다", () => {
    const onSelect = vi.fn();
    render(<LanguageSelectScreen selected="en" onSelect={onSelect} onContinue={vi.fn()} />);

    expect(option("en")).toHaveAttribute("data-selected", "true");
    for (const language of entryLanguages.filter((code) => !isEntryLanguageAvailable(code))) {
      expect(option(language)).toHaveAttribute("data-selected", "false");
      fireEvent.tap(option(language), {});
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("[LS-U4] Continue를 누르면 onContinue가 1회다", () => {
    const onContinue = vi.fn();
    render(<LanguageSelectScreen selected="en" onSelect={vi.fn()} onContinue={onContinue} />);

    const next = within(screen.getByTestId("language-select-screen-next")).getByTestId(
      "ui-lynx-button",
    );
    expect(next).toHaveTextContent("Continue");
    fireEvent.tap(next, {});

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("[LS-U5] 제목이 header다", () => {
    render(<LanguageSelectScreen selected="en" onSelect={vi.fn()} onContinue={vi.fn()} />);

    expect(screen.getByTestId("language-select-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  it("[LS-U6] onBack이 있으면 'Back' RoundButton이 서고 누르면 onBack 1회, 없으면 그리지 않는다", () => {
    const onBack = vi.fn();
    const { unmount } = render(
      <LanguageSelectScreen
        selected="en"
        onSelect={vi.fn()}
        onContinue={vi.fn()}
        onBack={onBack}
      />,
    );
    const back = within(screen.getByTestId("language-select-screen-header")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", "Back");
    fireEvent.tap(back, {});
    expect(onBack).toHaveBeenCalledTimes(1);
    unmount();

    render(<LanguageSelectScreen selected="en" onSelect={vi.fn()} onContinue={vi.fn()} />);
    expect(
      within(screen.getByTestId("language-select-screen-header")).queryByTestId(
        "ui-lynx-round-button",
      ),
    ).toBeNull();
  });
});
