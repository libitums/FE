import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { entryLanguageLabel } from "../../lib/entry-language";
import { JourneyEntryScreen } from "./JourneyEntryScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 고른 언어의 라벨 반영·진행을 봅니다 (ADR-0006 D4).
//
// ⚠ 언어 라벨 반영(JE-U2)은 지금 공허합니다 — 2026-09-21 디자인 반영으로 고를 수
// 있는 언어가 초기값(`en`) 하나뿐이라 다른 값으로 갈라 보이지 않습니다.

const LANGUAGE = "en";

function startButton(): HTMLElement {
  return within(screen.getByTestId("journey-entry-screen-start")).getByTestId("ui-lynx-button");
}

describe("JourneyEntryScreen", () => {
  // JE-U1 — 배경 그림은 장식이라 래퍼가 접근성 트리에서 가립니다. 그리기만 하고 가리지
  // 않으면 스크린리더가 배경 그림까지 읽습니다.
  it("[JE-U1] 배경 그림 · 제목 · 큰 제목 · 안내 · AI 고지 · Start가 선다", () => {
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

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
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
      entryLanguageLabel(LANGUAGE),
    );
  });

  it("[JE-U3] 액션을 누르면 onEnter가 1회다", () => {
    const onEnter = vi.fn();
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={onEnter} />);

    fireEvent.tap(startButton(), {});

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("[JE-U4] 제목이 header다", () => {
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  it("[JE-U5] onBack이 있으면 면 없는 'Back' RoundButton이 서고 누르면 onBack 1회다", () => {
    const onBack = vi.fn();
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} onBack={onBack} />);

    const back = within(screen.getByTestId("journey-entry-screen-header")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", "Back");
    expect(back).toHaveAttribute("data-variant", "overlay");
    fireEvent.tap(back, {});
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
