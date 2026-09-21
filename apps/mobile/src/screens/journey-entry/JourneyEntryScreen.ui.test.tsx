import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { entryLanguageLabel } from "../../lib/entry-language";
import { JourneyEntryScreen } from "./JourneyEntryScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 고른 언어의 라벨 반영·진행을 본다 (ADR-0006 D4).
//
// 계약: .agent-harness/work/lib-261/spec.md §0.5 A5(고른 언어 라벨을 그대로 한 줄 둔다) ·
//       §4.2~§4.5(구조·testid).
// 계획: .agent-harness/work/lib-261/test-plan.md ui §
//       `JourneyEntryScreen.ui.test.tsx` JE-U1~JE-U4.
//
// ⚠ 언어 라벨 반영(JE-U2)은 초기값 픽스처로는 공허하다(test-plan). 2026-09-21 디자인
// 반영으로 고를 수 있는 언어가 초기값(`en`) 하나뿐이라 지금은 가르지 못한다.

const LANGUAGE = "en";

function startButton(): HTMLElement {
  return within(screen.getByTestId("journey-entry-screen-start")).getByTestId("ui-lynx-button");
}

describe("JourneyEntryScreen (LIB-261)", () => {
  // JE-U1 — 2026-09-21 디자인 반영: 배경 그림 · 위(제목 · 언어) · 아래(큰 제목 · 안내 · AI 고지 ·
  // Start)가 선다. 배경 그림은 장식이라 래퍼가 접근성 트리에서 가린다.
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

  // JE-U2 (en 픽스처)
  it("[JE-U2] 고른 언어의 라벨이 보인다", () => {
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={vi.fn()} />);

    expect(screen.getByTestId("journey-entry-screen-language")).toHaveTextContent(
      entryLanguageLabel(LANGUAGE),
    );
  });

  // JE-U3
  it("[JE-U3] 액션을 누르면 onEnter가 1회다", () => {
    const onEnter = vi.fn();
    render(<JourneyEntryScreen language={LANGUAGE} onEnter={onEnter} />);

    fireEvent.tap(startButton(), {});

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  // JE-U4
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
