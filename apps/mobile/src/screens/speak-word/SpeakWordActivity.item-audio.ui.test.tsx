import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  echoAudioOf,
  ECHO_SOURCE,
  lessonAudioStub,
  withAudio,
} from "../../lib/question-audio.test-support";
import type { LessonAudio } from "../../lib/question-audio";
import { dictationOff, stubSpeechHost } from "../../lib/speech-host.test-support";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 낱말 말하기 활동의 정답 뒤 재생 — 들은 결말(heard)이 선 순간 한 번 재생하고, 말하기가 불가이거나
// 건너뛰면 재생하지 않습니다. 재생 접점(`lib/audio`)만 대역이고 말하기 호스트는 `stubSpeechHost`입니다.

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

const cardBase: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};
const card: SpeakWordQuestion = withAudio(cardBase, echoAudioOf());

function mount(questions: readonly SpeakWordQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <SpeakWordActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      {...extra}
    />,
  );
}

const loadPicture = (): void =>
  void fireEvent(
    screen.getByTestId("speak-word-picture-image"),
    new window.Event("bindEvent:load"),
  );

function tapAction(label: string): void {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

function tapRetry(): void {
  const slot = screen.getByTestId("speak-word-secondary");
  expect(slot).toHaveAttribute("data-control", "retry");
  const button = slot.querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  fireEvent.tap(button as Element, {});
}

beforeEach(() => {
  stopAudio.mockReset();
  playAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SPEAK_WORD — 정답 뒤 재생 갈래", () => {
  test("EC6. 듣는 중에는 재생이 없고 heard 국면이 서는 순간 한 번 재생한다", () => {
    const host = stubSpeechHost();
    const { lesson } = lessonAudioStub();
    mount([card], lesson);
    loadPicture();
    tapAction("Speak");
    expect(playAudio).not.toHaveBeenCalled();

    act(() => host.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

    expect(playAudio).toHaveBeenCalledTimes(1);
    const call = playAudio.mock.calls[0];
    expect(call?.[0]).toBe(ECHO_SOURCE);
    expect(call?.[2] === undefined || call?.[2] === 1).toBe(true);
  });

  test("EC6. 틀리게 들려도 판정이 난 국면이라 한 번 재생한다", () => {
    const host = stubSpeechHost();
    const { lesson } = lessonAudioStub();
    mount([card], lesson);
    loadPicture();
    tapAction("Speak");

    act(() => host.pending[0]?.({ status: "recognized", text: "여권", isFinal: true }));

    expect(playAudio).toHaveBeenCalledTimes(1);
  });

  test("EC6. 말하기가 불가능한 국면과 Skip에서는 재생하지 않는다", () => {
    stubSpeechHost({ result: () => dictationOff });
    const { lesson } = lessonAudioStub();
    mount([card], lesson);
    loadPicture();
    tapAction("Speak");
    expect(playAudio).not.toHaveBeenCalled();

    tapAction("Skip");

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC6. lessonAudio.autoPlay가 off이면 heard여도 재생하지 않는다", () => {
    const host = stubSpeechHost();
    const { lesson } = lessonAudioStub({ autoPlay: "off" });
    mount([card], lesson);
    loadPicture();
    tapAction("Speak");

    act(() => host.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC6. audio가 없는 문항은 재생하지 않는다", () => {
    const host = stubSpeechHost();
    const { lesson } = lessonAudioStub();
    mount([cardBase], lesson);
    loadPicture();
    tapAction("Speak");

    act(() => host.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC7. Try again으로 마이크를 켜기 전에 재생을 멈춘다(정답 음성이 마이크로 들어가지 않게)", () => {
    const order: string[] = [];
    stubSpeechHost({
      result: () => {
        order.push("mic");
        return dictationOff;
      },
    });
    stopAudio.mockImplementation(() => void order.push("stop"));
    const { lesson } = lessonAudioStub();
    mount([card], lesson);
    loadPicture();
    tapAction("Speak");
    order.length = 0;

    tapRetry();

    expect(order).toEqual(["stop", "mic"]);
  });
});
