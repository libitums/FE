import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { specialUnitExitLabel } from "../../lib/special-unit-entry-source";
import { visualNovelStoryFor } from "./visual-novel";
import type { VisualNovelProgress } from "./visual-novel.contract";
import { VisualNovelScreen } from "./VisualNovelScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 나가기 라벨 상호작용을 본다 (ADR-0006 D4).
//
// 계약: .agent-harness/work/lib-255/spec.md §2.7 「세 화면 …변경」 · §4.3 「나가기」.
// 계획: .agent-harness/work/lib-255/test-plan.md ui § `*.exit-label.ui.test.tsx` X1~X4.
//
// 기존 `VisualNovelScreen.ui.test.tsx`는 이 파일과 별도이고 한 글자도 고치지 않는다
// (수용 기준 4) — 이 파일은 `exitLabel` prop만 다룬다.

const story = visualNovelStoryFor("cafe-arrival-visual-novel");
const progress: VisualNovelProgress = { status: "active", beatIndex: 0 };

describe("VisualNovelScreen 나가기 라벨 (LIB-255)", () => {
  // X1
  it("[X1] exitLabel=목록으로(roleplay) → 나가기 텍스트·accessibility-label이 목록으로다", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitLabel={specialUnitExitLabel("roleplay")}
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    expect(exit).toHaveTextContent("목록으로");
    expect(exit).toHaveAttribute("accessibility-label", "목록으로");
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).toHaveAttribute("accessibility-element", "true");
  });

  // X2
  it("[X2] 목록으로 상태에서 나가기 tap → onExit가 기존과 같은 인자('incomplete', 'arrive')로 정확히 1회", () => {
    const onExit = vi.fn();
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitLabel={specialUnitExitLabel("roleplay")}
        onAdvance={vi.fn()}
        onExit={onExit}
        onReplay={vi.fn()}
      />,
    );

    fireEvent.tap(screen.getByTestId("visual-novel-exit-button"), {});

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith("incomplete", "arrive");
  });

  // X3
  it("[X3] exitLabel=맵으로(journey) → 나가기 텍스트·accessibility-label이 맵으로다", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitLabel={specialUnitExitLabel("journey")}
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    expect(exit).toHaveTextContent("맵으로");
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  });

  // X4
  it("[X4] exitLabel 생략 → 기본값 맵으로", () => {
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
    expect(exit).toHaveTextContent("맵으로");
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  });

  // 비주얼 노벨만: 나가기 안쪽 <text>의 accessibility-element="false"가 X1에서도 유지된다.
  it("[X1 부속] 목록으로 상태에서도 나가기 안쪽 텍스트가 accessibility-element='false'를 유지한다", () => {
    render(
      <VisualNovelScreen
        story={story}
        progress={progress}
        exitLabel={specialUnitExitLabel("roleplay")}
        onAdvance={vi.fn()}
        onExit={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const exit = screen.getByTestId("visual-novel-exit-button");
    const innerText = exit.querySelector("text");
    expect(innerText).not.toBeNull();
    expect(innerText).toHaveAttribute("accessibility-element", "false");
    expect(innerText).toHaveTextContent("목록으로");
  });
});
