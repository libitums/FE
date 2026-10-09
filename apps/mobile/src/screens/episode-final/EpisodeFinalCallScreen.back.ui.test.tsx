import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { EpisodeFinalCallTest } from "./episode-final.contract";
import { EpisodeFinalCallScreen } from "./EpisodeFinalCallScreen";

const callTest: EpisodeFinalCallTest = {
  format: "call",
  unitId: "tutorial-final-test",
  callerName: "Yuna",
  turns: [
    { kind: "line", id: "hello", text: "여보세요?", translation: "Hello?" },
    { kind: "speaking", id: "hi", sentence: "안녕", romanization: "[an.nyeong]" },
  ],
};

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US18] 뒤로가기 → onExit 1회 · onFinish 0회", () => {
  const onExit = vi.fn<() => void>();
  const onFinish = vi.fn();
  render(
    <EpisodeFinalCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 1."
      test={callTest}
      callerPortrait="portrait.png"
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  expect(pressBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).not.toHaveBeenCalled();
});
