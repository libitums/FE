import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { visualNovelStoryFor } from "./visual-novel";
import type { VisualNovelProgress } from "./visual-novel.contract";
import { VisualNovelScreen } from "./VisualNovelScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 나가기 라벨 상호작용을 봅니다 (ADR-0006 D4).
//
// 기존 `VisualNovelScreen.ui.test.tsx`는 이 파일과 별도이고 한 글자도 고치지 않습니다 —
// 이 파일은 `exitLabel` prop만 다룹니다.

const story = visualNovelStoryFor("cafe-arrival-visual-novel");
const progress: VisualNovelProgress = { status: "active", beatIndex: 0 };

describe("VisualNovelScreen 나가기 라벨", () => {
  it("[X1] exitTo=roleplay → 나가기 텍스트·accessibility-label이 Back to list다", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitTo="roleplay"
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    expect(exit).toHaveTextContent("Back to list");
    expect(exit).toHaveAttribute("accessibility-label", "Back to list");
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).toHaveAttribute("accessibility-element", "true");
  });

  it("[X2] roleplay 진입에서 나가기 tap → onExit가 기존과 같은 인자('incomplete', 'arrive')로 정확히 1회", () => {
    const onExit = vi.fn();
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitTo="roleplay"
        onAdvance={vi.fn()}
        onExit={onExit}
        onReplay={vi.fn()}
      />,
    );

    fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith("incomplete", "arrive");
  });

  it("[X3] exitTo=journey → 나가기 텍스트·accessibility-label이 Back to map이다", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitTo="journey"
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    expect(exit).toHaveTextContent("Back to map");
    expect(exit).toHaveAttribute("accessibility-label", "Back to map");
  });

  it("[X4] exitTo 생략 → 기본값 Back to map", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    expect(exit).toHaveTextContent("Back to map");
    expect(exit).toHaveAttribute("accessibility-label", "Back to map");
  });

  // 비주얼 노벨만: 나가기 안쪽 <text>의 accessibility-element="false"가 X1에서도
  // 유지됩니다.
  it("[X1 부속] roleplay 진입에서도 나가기 안쪽 텍스트가 accessibility-element='false'를 유지한다", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitTo="roleplay"
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    const innerText = exit.querySelector("text");
    expect(innerText).not.toBeNull();
    expect(innerText).toHaveAttribute("accessibility-element", "false");
    expect(innerText).toHaveTextContent("Back to list");
  });
});
