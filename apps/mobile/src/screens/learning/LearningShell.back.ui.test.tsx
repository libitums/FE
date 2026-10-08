import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { LearningShell } from "./LearningShell";

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 `×`를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function stubSound(): string[] {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: (id: string) => calls.push(id), stopRing: () => {} },
  });
  return calls;
}

function renderShell(onExit: () => void) {
  return render(
    <LearningShell
      form="listening"
      questionIndex={1}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={onExit}
      card={<text>카드 안</text>}
      actionLabel="Check"
      onAction={() => {}}
    />,
  );
}

test("[US1] 뒤로가기 → onExit 0회 · 확인창이 선다 · 버튼음 1회(×와 같다)", () => {
  const sounds = stubSound();
  const onExit = vi.fn<() => void>();
  renderShell(onExit);

  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });

  expect(handled).toBe(true);
  expect(onExit).not.toHaveBeenCalled();
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(sounds.filter((id) => id === "button")).toHaveLength(1);
});

test("[UL1] 확인창 열림 → 뒤로가기는 확인창만 닫고(onExit 0회), 한 번 더 누르면 확인창이 다시 선다", () => {
  const sounds = stubSound();
  const onExit = vi.fn<() => void>();
  renderShell(onExit);

  // 확인창은 보이는 `×`로 엽니다 — 이 케이스는 층 등록만 따로 봅니다.
  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();

  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();
  expect(onExit).not.toHaveBeenCalled();
  // `×` 1회 + 닫기 1회
  expect(sounds.filter((id) => id === "button")).toHaveLength(2);

  act(() => {
    backHandlers.runTop();
  });
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(onExit).not.toHaveBeenCalled();
});
