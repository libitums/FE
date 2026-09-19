import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { entryLanguageLabel, entryLanguages } from "../../lib/entry-language";
import { LanguageSelectScreen } from "./LanguageSelectScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 항목 넷의 선택 상태·표식·접근성을 본다
// (ADR-0006 D4). 라벨 값은 `entryLanguageLabel`의 결과로 비교한다 — 로직을 다시 적지
// 않는다(계약 §2.2).
//
// 계약: .agent-harness/work/lib-261/spec.md §0.3 D-b(언어 넷) · §4.3(선택 채널) ·
//       §4.4(선택 상태 접근성 — 선택된 것만 ', 선택됨' 접미사) · §4.5(testid).
// 계획: .agent-harness/work/lib-261/test-plan.md ui §
//       `LanguageSelectScreen.ui.test.tsx` LS-U1~LS-U6.
//
// ⚠ 파수꾼 공허 주의(test-plan) — 초기값 픽스처(selected="ko")는 「늘 첫 행에 붙는다」와
// 관찰이 같아 LS-U3·LS-U4에서 공허하다. 그 둘은 selected="en" 픽스처로 돈다.

const NON_INITIAL: (typeof entryLanguages)[number] = "en";

describe("LanguageSelectScreen (LIB-261)", () => {
  // LS-U1 — n-3(보정 r0.3): 스크롤 상자에 accessibility-*가 0건임을 얹는다(SP1과 같은 형태).
  it("[LS-U1] 항목 넷이 어휘 순서로 서고 각각 조작 단위다", () => {
    const { container } = render(
      <LanguageSelectScreen selected="ko" onSelect={vi.fn()} onContinue={vi.fn()} />,
    );

    for (const language of entryLanguages) {
      const option = screen.getByTestId(`language-select-option-${language}`);
      expect(option).toHaveAttribute("accessibility-element", "true");
      expect(option).toHaveAttribute("accessibility-traits", "button");
    }

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="language-select-option-"]'),
    )
      .map((el) => el.getAttribute("data-testid"))
      .filter(
        (id): id is string => id !== null && !id.includes("-label-") && !id.includes("-mark-"),
      );
    expect(rendered).toEqual(
      entryLanguages.map((language) => `language-select-option-${language}`),
    );

    const scroll = screen.getByTestId("language-select-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  // LS-U2
  it.each(entryLanguages)("[LS-U2] %s를 누르면 그 코드로 onSelect가 1회 불린다", (language) => {
    const onSelect = vi.fn();
    render(<LanguageSelectScreen selected="ko" onSelect={onSelect} onContinue={vi.fn()} />);

    fireEvent.tap(screen.getByTestId(`language-select-option-${language}`), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(language);
  });

  // LS-U3 (en 픽스처 — 초기값 픽스처로는 공허하다)
  it("[LS-U3] 선택된 행만 data-selected='true'이고 표식이 서며 이름이 ', 선택됨'으로 끝난다", () => {
    render(<LanguageSelectScreen selected={NON_INITIAL} onSelect={vi.fn()} onContinue={vi.fn()} />);

    const option = screen.getByTestId(`language-select-option-${NON_INITIAL}`);
    expect(option).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId(`language-select-option-mark-${NON_INITIAL}`)).toBeInTheDocument();
    expect(option).toHaveAttribute(
      "accessibility-label",
      `${entryLanguageLabel(NON_INITIAL)}, 선택됨`,
    );
  });

  // LS-U4 (en 픽스처) — 부재 단언(비선택 행에 표식이 없고 이름에 접미사가 없다)이다.
  // 행 자체의 존재를 먼저 앵커로 건다.
  it("[LS-U4] 비선택 행에는 표식이 없고 이름에 접미사가 없다", () => {
    render(<LanguageSelectScreen selected={NON_INITIAL} onSelect={vi.fn()} onContinue={vi.fn()} />);

    for (const language of entryLanguages) {
      if (language === NON_INITIAL) continue;

      const option = screen.getByTestId(`language-select-option-${language}`);
      expect(option).toBeInTheDocument();
      expect(option).toHaveAttribute("data-selected", "false");
      expect(
        screen.queryByTestId(`language-select-option-mark-${language}`),
      ).not.toBeInTheDocument();
      expect(option.getAttribute("accessibility-label")).not.toContain("선택됨");
      expect(option).toHaveAttribute("accessibility-label", entryLanguageLabel(language));
    }
  });

  // LS-U5
  it("[LS-U5] 다음을 누르면 onContinue가 1회다", () => {
    const onContinue = vi.fn();
    render(<LanguageSelectScreen selected="ko" onSelect={vi.fn()} onContinue={onContinue} />);

    fireEvent.tap(screen.getByTestId("language-select-screen-next"), {});

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  // LS-U6
  it("[LS-U6] 제목이 header이고, 표식 묶음이 accessibility-elements-hidden이다", () => {
    render(<LanguageSelectScreen selected="ko" onSelect={vi.fn()} onContinue={vi.fn()} />);

    expect(screen.getByTestId("language-select-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    expect(screen.getByTestId("language-select-option-mark-ko")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
  });
});
