import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@lynx-js/react/testing-library";

import { lessonAudioStub, listenAudioOf, withAudio } from "../../lib/question-audio.test-support";
import { listenAgainParts } from "../../components/listen-controls.test-support";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층(V3-1 / BA3): REPLY_SELECT 간이 줄 — 자동 재생 중엔 Stop, 탭하면 멈추고 Play again으로 돌아온다.

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

const question: WordChoiceQuestion = withAudio(
  {
    prompt: "안녕하세요",
    romanization: "annyeonghaseyo",
    translation: "Hello",
    choices: ["안녕하세요", "감사합니다"],
    answerIndex: 0,
  },
  listenAudioOf("REPLY_SELECT", "S9-01"),
);

const button = (): HTMLElement => listenAgainParts("word-choice-listen").button;

function mount() {
  const { lesson } = lessonAudioStub();
  return render(
    <WordChoiceActivity
      questions={[question]}
      onExit={() => {}}
      onFinish={() => {}}
      lessonAudio={lesson}
    />,
  );
}

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

test("ST4. 자동 재생 중이면 Stop이고 탭하면 stopAudio가 불리며 Play again으로 돌아온다", () => {
  mount();
  expect(button()).toHaveAttribute("accessibility-label", "Stop");

  stopAudio.mockClear();
  fireEvent.tap(button(), {});

  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(playAudio).toHaveBeenCalledTimes(1);
  expect(button()).toHaveAttribute("accessibility-label", "Play again");
});

test("ST5. 재생이 끝나면(콜백) Play again이고, 그 탭은 다시 재생한다", () => {
  mount();
  const onFinished = playAudio.mock.calls[0]?.[1];
  if (onFinished === undefined) throw new Error("자동 재생이 안 났다");

  onFinished();
  expect(button()).toHaveAttribute("accessibility-label", "Play again");
  fireEvent.tap(button(), {});

  expect(playAudio).toHaveBeenCalledTimes(2);
});
