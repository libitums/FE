import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { EpisodeNarrativeScreen } from "./EpisodeNarrativeScreen";

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

test("[US14] 뒤로가기 → onExit 1회 · 오디오 정지(안내 없음)", () => {
  const play = vi.fn((_source: string, _done: (result: unknown) => void) => {});
  const stop = vi.fn();
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: { play, stop } });
  const onExit = vi.fn<() => void>();
  render(
    <EpisodeNarrativeScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      label="Before We Land"
      reducedMotion
      narrative={{
        beats: [
          {
            speakerName: "Cabin crew",
            line: "곧 도착합니다.",
            translation: "Arriving soon.",
            audioSource: "announcement",
          },
        ],
      }}
      onFinish={vi.fn()}
      onExit={onExit}
    />,
  );
  stop.mockClear();

  expect(pressBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalledTimes(1);
});
