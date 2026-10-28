import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { StoryIntroScreen } from "./StoryIntroScreen";
import { storyIntroTestIds as ids } from "./story-intro.contract";

// `ui` 계층: 막간 이야기 시작 화면 — 자막 · Skip(확인) · Start · 뒤로 · 밝은 아이콘 표지.

afterEach(() => {
  cleanup();
});

function mount() {
  const onStart = vi.fn<() => void>();
  const onSkip = vi.fn<() => void>();
  const onExit = vi.fn<() => void>();
  render(
    <StoryIntroScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      intro={{
        ordinal: 4,
        caption: { ko: "조금 전", en: "A little earlier" },
        backgroundUrl: "https://cdn/bg.webp",
      }}
      onStart={onStart}
      onSkip={onSkip}
      onExit={onExit}
    />,
  );
  return { onStart, onSkip, onExit };
}

const tapButton = (id: string) =>
  fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

test("SIU1. 자막 · 윗줄을 그리고 밝은 아이콘 표지를 달며, 저절로 넘어가지 않는다", () => {
  vi.useFakeTimers();
  const { onStart } = mount();
  expect(screen.getByTestId(ids.caption).textContent).toBe("조금 전");
  expect(screen.getByTestId(ids.screen).textContent).toContain("STORY · EPISODE 4");
  expect(screen.getByTestId(ids.screen).getAttribute("data-statusbar")).toBe(lightStatusBarIcons);
  vi.advanceTimersByTime(10_000);
  expect(onStart).not.toHaveBeenCalled();
  vi.useRealTimers();
});

test("SIU2. Start는 onStart", () => {
  const { onStart, onSkip } = mount();
  tapButton(ids.start);
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onSkip).not.toHaveBeenCalled();
});

test("SIU3. Skip은 확인창을 띄우고, Keep watching은 닫기만, Skip은 onSkip", () => {
  const { onSkip } = mount();
  tapButton(ids.skip);
  const confirm = () => within(screen.getByTestId(ids.confirm));
  expect(confirm().getByText("Skip the story?")).toBeTruthy();
  fireEvent.tap(confirm().getByText("Keep watching"), {});
  expect(screen.queryByTestId(ids.confirm)).toBeNull();
  expect(onSkip).not.toHaveBeenCalled();
  tapButton(ids.skip);
  fireEvent.tap(confirm().getAllByText("Skip").slice(-1)[0] as HTMLElement, {});
  expect(onSkip).toHaveBeenCalledTimes(1);
});

test("SIU4. 머리 뒤로는 onExit, 확인창이 떠 있으면 시스템 뒤로는 그것만 닫는다", () => {
  const { onExit, onSkip } = mount();
  tapButton(ids.skip);
  act(() => {
    backHandlers.runTop();
  });
  expect(screen.queryByTestId(ids.confirm)).toBeNull();
  expect(onExit).not.toHaveBeenCalled();
  expect(onSkip).not.toHaveBeenCalled();
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onExit).toHaveBeenCalledTimes(1);
});
