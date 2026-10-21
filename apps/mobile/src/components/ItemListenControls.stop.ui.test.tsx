import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render } from "@lynx-js/react/testing-library";

import { ItemListenControls } from "./ItemListenControls";
import { controlStub, listenAgainParts } from "./listen-controls.test-support";

// `ui` 계층(V3-1 / BA3): 간이 줄의 안쪽 단추는 재생 중이면 Stop(탭 = stopAudio), 아니면 Play again(탭 = replay)이다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<() => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../lib/audio", () => audio);

const T = "word-choice-listen";

beforeEach(() => {
  audio.stopAudio.mockReset();
});

test("ST1. 재생 중이면 안쪽 단추의 이름이 Stop이고 바깥 상자에는 이름이 없다", () => {
  const { control } = controlStub({ playback: "playing" });
  render(<ItemListenControls control={control} testId={T} />);

  const { outer, button } = listenAgainParts(T);
  expect(button).toHaveAttribute("accessibility-label", "Stop");
  expect(outer).not.toHaveAttribute("accessibility-label");
});

test("ST2. 재생 중 탭은 stopAudio 한 번이고 replay는 부르지 않는다", () => {
  const { control, replay } = controlStub({ playback: "playing" });
  render(<ItemListenControls control={control} testId={T} />);

  fireEvent.tap(listenAgainParts(T).button, {});

  expect(audio.stopAudio).toHaveBeenCalledTimes(1);
  expect(replay).not.toHaveBeenCalled();
});

test("ST3. idle이면 지금처럼 Play again이고 탭은 replay이며 stopAudio는 없다", () => {
  const { control, replay } = controlStub({ playback: "idle" });
  render(<ItemListenControls control={control} testId={T} />);

  const { button } = listenAgainParts(T);
  expect(button).toHaveAttribute("accessibility-label", "Play again");
  fireEvent.tap(button, {});

  expect(replay).toHaveBeenCalledTimes(1);
  expect(audio.stopAudio).not.toHaveBeenCalled();
});
