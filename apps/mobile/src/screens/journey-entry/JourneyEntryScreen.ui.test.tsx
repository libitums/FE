import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { entryLanguageLabel } from "../../lib/entry-language";
import { JourneyEntryScreen } from "./JourneyEntryScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 고른 언어의 라벨 반영·진행을 봅니다 (ADR-0006 D4).
//
// ⚠ 언어 라벨 반영(JE-U2)은 지금 공허합니다 — 2026-09-21 디자인 반영으로 고를 수
// 있는 언어가 초기값(`en`) 하나뿐이라 다른 값으로 갈라 보이지 않습니다.

const LANGUAGE = "en";

// 가려지는 가장자리는 호스트가 재서 넘기는 값이라 ui에서는 0입니다 — 이 계층이 보는 것은
// 「받은 값을 자리에 쓰는가」이고, 실제 수치는 기기에서만 나옵니다.
const NO_SAFE_AREA = { top: 0, bottom: 0 } as const;
function storyButton(): HTMLElement {
  return within(screen.getByTestId("journey-entry-screen-story")).getByTestId("ui-lynx-button");
}

describe("JourneyEntryScreen", () => {
  // JE-U1 — 배경 그림은 장식이라 래퍼가 접근성 트리에서 가립니다. 그리기만 하고 가리지
  // 않으면 스크린리더가 배경 그림까지 읽습니다.
  it("[JE-U1] 배경 그림 · 제목 · 큰 제목 · 안내 · AI 고지 · 두 길이 선다", () => {
    render(
      <JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onSelectPath={vi.fn()} />,
    );

    expect(screen.getByTestId("journey-entry-screen-title").textContent?.trim()).not.toBe("");
    expect(screen.getByTestId("journey-entry-screen-display").textContent?.trim()).not.toBe("");
    expect(screen.getByTestId("journey-entry-screen-caption")).toHaveTextContent(
      "New to Hangul? Meet a few letters before you land in Seoul.",
    );
    expect(screen.getByTestId("journey-entry-screen-notice")).toHaveTextContent(
      "Some images in this service are generated using AI technology",
    );
    const basics = screen.getByTestId("journey-entry-screen-basics");
    expect(basics.textContent).toContain("Learn the basics first");
    expect(basics.textContent).toContain("6 letters, 3 sounds, then the story");
    expect(storyButton()).toHaveTextContent("Jump into the story");
    expect(storyButton()).toHaveAttribute("data-variant", "brand");

    const background = screen.getByTestId("journey-entry-screen-background");
    expect(background.closest('[accessibility-elements-hidden="true"]')).not.toBeNull();
  });

  it("[JE-U2] 고른 언어의 라벨이 보인다", () => {
    render(
      <JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onSelectPath={vi.fn()} />,
    );

    expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
      entryLanguageLabel(LANGUAGE),
    );
  });

  it("[JE-U3] 바로 입장은 story 1회다", () => {
    const onSelectPath = vi.fn();
    render(
      <JourneyEntryScreen
        safeArea={NO_SAFE_AREA}
        language={LANGUAGE}
        onSelectPath={onSelectPath}
      />,
    );

    fireEvent.tap(storyButton(), {});

    expect(onSelectPath).toHaveBeenCalledExactlyOnceWith("story");
  });

  it("[JE-U3a] 기초부터는 basics 1회이고, 이름에 보조 줄이 함께 읽힌다", () => {
    const onSelectPath = vi.fn();
    render(
      <JourneyEntryScreen
        safeArea={NO_SAFE_AREA}
        language={LANGUAGE}
        onSelectPath={onSelectPath}
      />,
    );
    const basics = screen.getByTestId("journey-entry-screen-basics");
    expect(basics).toHaveAttribute(
      "accessibility-label",
      "Learn the basics first, 6 letters, 3 sounds, then the story",
    );
    expect(basics).toHaveAttribute("accessibility-traits", "button");
    expect(basics).toHaveAttribute("flatten", "false");

    fireEvent.tap(basics, {});

    expect(onSelectPath).toHaveBeenCalledExactlyOnceWith("basics");
  });

  it("[JE-U3b] 빠르게 두 번 · 둘을 이어 눌러도 한 길만 고른다", () => {
    const onSelectPath = vi.fn();
    render(
      <JourneyEntryScreen
        safeArea={NO_SAFE_AREA}
        language={LANGUAGE}
        onSelectPath={onSelectPath}
      />,
    );

    act(() => {
      fireEvent.tap(storyButton(), {});
      fireEvent.tap(storyButton(), {});
      fireEvent.tap(screen.getByTestId("journey-entry-screen-basics"), {});
    });

    expect(onSelectPath).toHaveBeenCalledExactlyOnceWith("story");
  });

  it("[JE-U4] 제목이 header다", () => {
    render(
      <JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onSelectPath={vi.fn()} />,
    );

    expect(screen.getByTestId("journey-entry-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  it("[JE-U5] onBack이 있으면 면 없는 'Back' RoundButton이 서고 누르면 onBack 1회다", () => {
    const onBack = vi.fn();
    render(
      <JourneyEntryScreen
        safeArea={NO_SAFE_AREA}
        language={LANGUAGE}
        onSelectPath={vi.fn()}
        onBack={onBack}
      />,
    );

    const back = within(screen.getByTestId("journey-entry-screen-header")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", "Back");
    expect(back).toHaveAttribute("data-variant", "overlay");
    fireEvent.tap(back, {});
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // ⟨2026-09-28⟩ 이 화면만 셸의 안쪽 여백을 안 받습니다 — 그림이 끝까지 깔려야 하기
  // 때문입니다. 그래서 가려지는 가장자리를 피하는 일을 글자 묶음 둘이 직접 집니다.
  //
  // **그림이 아니라 글자가 피한다**는 것이 계약입니다. 그림 · Fog에 여백이 붙으면 위
  // 아래에 닿지 않는 띠가 남고, 그것이 고치려는 바로 그 증상입니다.
  it("[JE-U9] 가려지는 가장자리를 글자 묶음이 피하고 배경은 그대로 끝까지 간다", () => {
    const { container } = render(
      <JourneyEntryScreen
        safeArea={{ top: 59, bottom: 34 }}
        language={LANGUAGE}
        onSelectPath={vi.fn()}
      />,
    );

    const top = container.querySelector(".journey-entry-screen-top");
    const bottom = container.querySelector(".journey-entry-screen-bottom");
    expect(top?.getAttribute("style") ?? "").toContain("59px");
    expect(bottom?.getAttribute("style") ?? "").toContain("34px");

    // 배경 묶음에는 가장자리 몫이 붙지 않습니다.
    const backdrop = container.querySelector(".journey-entry-screen-backdrop");
    expect(backdrop?.getAttribute("style") ?? "").not.toContain("59px");
    expect(backdrop?.getAttribute("style") ?? "").not.toContain("34px");
  });
});
