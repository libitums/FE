import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

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
function startButton(): HTMLElement {
  return within(screen.getByTestId("journey-entry-screen-start")).getByTestId("ui-lynx-button");
}

describe("JourneyEntryScreen", () => {
  // JE-U1 — 배경 그림은 장식이라 래퍼가 접근성 트리에서 가립니다. 그리기만 하고 가리지
  // 않으면 스크린리더가 배경 그림까지 읽습니다.
  it("[JE-U1] 배경 그림 · 제목 · 큰 제목 · 안내 · AI 고지 · Start가 선다", () => {
    render(<JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-title").textContent?.trim()).not.toBe("");
    expect(screen.getByTestId("journey-entry-screen-display").textContent?.trim()).not.toBe("");
    expect(screen.getByTestId("journey-entry-screen-caption").textContent?.trim()).not.toBe("");
    expect(screen.getByTestId("journey-entry-screen-notice")).toHaveTextContent(
      "Some images in this service are generated using AI technology",
    );
    expect(startButton()).toHaveTextContent("Start");

    const background = screen.getByTestId("journey-entry-screen-background");
    expect(background.closest('[accessibility-elements-hidden="true"]')).not.toBeNull();
  });

  it("[JE-U2] 고른 언어의 라벨이 보인다", () => {
    render(<JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
      entryLanguageLabel(LANGUAGE),
    );
  });

  it("[JE-U3] 액션을 누르면 onEnter가 1회다", () => {
    const onEnter = vi.fn();
    render(<JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onEnter={onEnter} />);

    fireEvent.tap(startButton(), {});

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("[JE-U4] 제목이 header다", () => {
    render(<JourneyEntryScreen safeArea={NO_SAFE_AREA} language={LANGUAGE} onEnter={vi.fn()} />);

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
        onEnter={vi.fn()}
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
        onEnter={vi.fn()}
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
