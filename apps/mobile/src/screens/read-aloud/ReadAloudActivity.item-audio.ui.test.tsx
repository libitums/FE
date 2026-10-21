import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  lessonAudioStub,
  listenAudioOf,
  LISTEN_SOURCE,
  testIdOrder,
  withAudio,
} from "../../lib/question-audio.test-support";
import type { LessonAudio } from "../../lib/question-audio";
import { dictationOff, stubSpeechHost } from "../../lib/speech-host.test-support";
import { ReadAloudActivity } from "./ReadAloudActivity";
import type { ReadAloudQuestion } from "./read-aloud.contract";
import {
  expectListenAgainAccessible,
  listenAgainParts,
} from "../../components/listen-controls.test-support";

// `ui` 계층: 따라 읽기 활동의 문항 음성 — 간이 줄과 자동 재생, 말하기 전 재생 멈춤, 녹음 중 다시 듣기, 결말 보고.
// 재생 접점(`lib/audio`)만 대역이고 말하기 호스트는 `stubSpeechHost`입니다.

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

const fineBase: ReadAloudQuestion = {
  sentence: "아니요, 괜찮아요.",
  romanization: "aniyo, gwaenchanayo.",
  translation: "No, I'm fine.",
};
const fine: ReadAloudQuestion = withAudio(fineBase, listenAudioOf("SHADOW", "S8-01"));

function mount(questions: readonly ReadAloudQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <ReadAloudActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      {...extra}
    />,
  );
}

function tapAction(label: string): void {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("따라 읽기 — 문항 음성", () => {
  test("RA1. 간이 줄이 문장 묶음 뒤 파형 앞에 서고 자동 재생이 한 번 난다", () => {
    stubSpeechHost();
    const { lesson } = lessonAudioStub();

    const { container } = mount([fine], lesson);

    const ids = [
      "read-aloud-sentence",
      "read-aloud-romanization",
      "read-aloud-translation",
      "read-aloud-listen",
      "read-aloud-waves",
    ];
    expect(testIdOrder(container, ids)).toEqual(ids);
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(LISTEN_SOURCE, expect.any(Function), 1);
  });

  test("RA1. audio가 없으면 줄도 재생도 없다", () => {
    stubSpeechHost();
    const { lesson } = lessonAudioStub();

    mount([fineBase], lesson);

    expect(screen.queryByTestId("read-aloud-listen")).not.toBeInTheDocument();
    expect(playAudio).not.toHaveBeenCalled();
  });

  test("RA1. 줄의 slow와 자동 재생 중 Stop이 조작을 위로 올리고 이름이 붙는다", () => {
    stubSpeechHost();
    const { lesson, onTogglePace } = lessonAudioStub();
    mount([fine], lesson);

    expectListenAgainAccessible("read-aloud-listen", "Stop");
    expect(screen.getByTestId("read-aloud-listen-slow")).toHaveAttribute(
      "accessibility-label",
      "Slow, off",
    );
    fireEvent.tap(screen.getByTestId("read-aloud-listen-slow"), {});
    expect(onTogglePace).toHaveBeenCalledTimes(1);
  });

  test("RA2. Speak를 누르면 stopAudio가 말하기 시작보다 먼저 불린다", () => {
    const host = stubSpeechHost();
    const { lesson } = lessonAudioStub();
    mount([fine], lesson);
    const startsAtStop: number[] = [];
    stopAudio.mockImplementation(() => void startsAtStop.push(host.calls.start));

    tapAction("Speak");

    expect(startsAtStop.length).toBeGreaterThan(0);
    expect(startsAtStop[0]).toBe(0);
    expect(host.calls.start).toBe(1);
  });

  test("RA3. 녹음 중 다시 듣기를 누르면 녹음을 멈춘 뒤 재생한다", () => {
    const host = stubSpeechHost();
    const { lesson } = lessonAudioStub();
    mount([fine], lesson);
    tapAction("Speak");
    expect(host.calls.stop).toBe(0);
    const stopsAtPlay: number[] = [];
    playAudio.mockImplementation((_source, _done, _rate) => {
      stopsAtPlay.push(host.calls.stop);
      return "started";
    });

    fireEvent.tap(listenAgainParts("read-aloud-listen").button, {});

    expect(host.calls.stop).toBeGreaterThanOrEqual(1);
    expect(stopsAtPlay).toEqual([host.calls.stop]);
    expect(stopsAtPlay[0]).toBeGreaterThanOrEqual(1);
  });

  test("RA4. 들은 결말(heard)은 practiced로 한 번 보고한다", () => {
    const host = stubSpeechHost();
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([fine], lesson);
    tapAction("Speak");
    expect(onListenItemAnswered).not.toHaveBeenCalled();

    act(() => host.pending[0]?.({ status: "recognized", text: "아니요", isFinal: true }));

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: { itemId: "S8-01", itemType: "SHADOW" },
        result: "practiced",
      }),
    );
  });

  test("RA4. 받아쓰기 꺼짐에서 Skip을 누르면 skipped로 보고한다", () => {
    stubSpeechHost({ result: () => dictationOff });
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([fine], lesson);
    tapAction("Speak");
    expect(onListenItemAnswered).not.toHaveBeenCalled();

    tapAction("Skip");

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({ result: "skipped" }),
    );
  });
});
