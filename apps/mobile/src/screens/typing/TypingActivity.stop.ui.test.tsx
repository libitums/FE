import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@lynx-js/react/testing-library";

import { lessonAudioStub, listenAudioOf, withAudio } from "../../lib/question-audio.test-support";
import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { listenAgainParts } from "../../components/listen-controls.test-support";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";

// `ui` 계층(V3-1 / BA3): DICTATION 간이 줄도 재생 중엔 Stop, 탭하면 멈추고 Play again으로 돌아온다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const dictation = withAudio(
  {
    id: "S6-01",
    kind: "dictation",
    instruction: "Type what you hear.",
    cue: "yeogwon yeogi isseoyo.",
    cueSupport: "Here's my passport.",
    hint: null,
    answers: ["여권 여기 있어요."],
  } as unknown as TypingQuestion,
  listenAudioOf("DICTATION", "S6-01"),
);

const button = (): HTMLElement => listenAgainParts("typing-activity-listen").button;

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

test("ST6. DICTATION: 자동 재생 중 Stop, 탭하면 stopAudio 후 Play again", () => {
  const { lesson } = lessonAudioStub();
  render(
    <TypingActivity
      insets={zeroSafeAreaInsets}
      questions={[dictation]}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      lessonAudio={lesson}
    />,
  );
  expect(button()).toHaveAttribute("accessibility-label", "Stop");

  stopAudio.mockClear();
  fireEvent.tap(button(), {});

  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(button()).toHaveAttribute("accessibility-label", "Play again");
});
