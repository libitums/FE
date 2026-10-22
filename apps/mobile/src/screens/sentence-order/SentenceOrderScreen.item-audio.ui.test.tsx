import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  echoAudioOf,
  ECHO_SOURCE,
  lessonAudioStub,
  listenAudioOf,
  LISTEN_SOURCE,
  testIdOrder,
  withAudio,
} from "../../lib/question-audio.test-support";
import type { LessonAudio } from "../../lib/question-audio";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 문장 순서 활동의 문항 음성 — LISTEN_BUILD(듣기 갈래)는 상대 말풍선 자리의 3열과 자동 재생,
// WORD_ORDER(정답 뒤 재생 갈래)는 확인한 순간 한 번 재생합니다. 재생 접점(`lib/audio`)만 대역입니다.

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

const PROMPT = "Hello! Is this your first time in Korea?";

const listenBuildBase: SentenceOrderQuestion = {
  prompt: PROMPT,
  chips: ["잘하시네요!", "안녕하세요!", "한국은", "처음이세요?"],
  answerOrder: [1, 2, 3],
  instruction: "Listen and build the sentence.",
};
const listenBuild: SentenceOrderQuestion = withAudio(
  listenBuildBase,
  listenAudioOf("LISTEN_BUILD", "S7-01"),
);

const wordOrderBase: SentenceOrderQuestion = {
  prompt: "Here's my passport.",
  chips: ["있어요.", "여권", "여기"],
  answerOrder: [1, 2, 0],
  instruction: "Build the sentence.",
};
const wordOrder: SentenceOrderQuestion = withAudio(wordOrderBase, echoAudioOf());

function mount(questions: readonly SentenceOrderQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <SentenceOrderActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      {...extra}
    />,
  );
}

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const place = (question: SentenceOrderQuestion, order = question.answerOrder): void => {
  for (const index of order) fireEvent.tap(chip(index), {});
};
const check = (): void => {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", "Check");
  fireEvent.tap(action, {});
};

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

describe("LISTEN_BUILD — 듣기 갈래", () => {
  test("SO1. 상대 말풍선 자리에 3열이 서고 말풍선 글은 그리지 않으며 자동 재생이 한 번 난다", () => {
    const { lesson } = lessonAudioStub();

    const { container } = mount([listenBuild], lesson);

    expect(
      testIdOrder(container, [
        "sentence-order-listen-replay",
        "sentence-order-listen-playback",
        "sentence-order-listen-slow",
      ]),
    ).toEqual([
      "sentence-order-listen-replay",
      "sentence-order-listen-playback",
      "sentence-order-listen-slow",
    ]);
    expect(screen.queryByTestId("sentence-order-screen-prompt")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain(PROMPT);
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(LISTEN_SOURCE, expect.any(Function), 1);
  });

  test("SO1. 속도 재생이 지원되지 않으면 slow가 없다", () => {
    const { lesson } = lessonAudioStub({ slowPlayback: "unsupported" });

    mount([listenBuild], lesson);

    expect(screen.queryByTestId("sentence-order-listen-slow")).not.toBeInTheDocument();
    expect(screen.getByTestId("sentence-order-listen-playback")).toBeInTheDocument();
  });

  test("SO1. slow를 탭하면 onTogglePace가 불린다", () => {
    const { lesson, onTogglePace } = lessonAudioStub();
    mount([listenBuild], lesson);

    fireEvent.tap(screen.getByTestId("sentence-order-listen-slow"), {});

    expect(onTogglePace).toHaveBeenCalledTimes(1);
  });

  test("SO2. 정답 순서로 놓고 확인하면 correct로 한 번 보고한다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([listenBuild], lesson);

    place(listenBuild);
    check();

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: { itemId: "S7-01", itemType: "LISTEN_BUILD" },
        result: "correct",
      }),
    );
  });

  test("SO2. 역순으로 놓고 확인하면 incorrect로 보고한다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([listenBuild], lesson);

    place(listenBuild, [...listenBuild.answerOrder].reverse());
    check();

    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({ result: "incorrect" }),
    );
  });

  test("AX1. 읽는 순서는 다시 듣기, 재생, Slow이고 이름이 붙는다", () => {
    const { lesson } = lessonAudioStub();
    mount([listenBuild], lesson);

    expect(screen.getByTestId("sentence-order-listen-replay")).toHaveAttribute(
      "accessibility-label",
      "Play from the start",
    );
    expect(screen.getByTestId("sentence-order-listen-slow")).toHaveAttribute(
      "accessibility-label",
      "Slow, off",
    );
  });
});

describe("WORD_ORDER — 정답 뒤 재생 갈래", () => {
  test("EC4. 확인 전에는 재생이 없고 확인한 순간 한 번 재생하며 줄은 없다", () => {
    const { lesson } = lessonAudioStub();
    mount([wordOrder], lesson);
    place(wordOrder);
    expect(playAudio).not.toHaveBeenCalled();

    check();

    expect(playAudio).toHaveBeenCalledTimes(1);
    const call = playAudio.mock.calls[0];
    expect(call?.[0]).toBe(ECHO_SOURCE);
    expect(call?.[2] === undefined || call?.[2] === 1).toBe(true);
    expect(screen.queryByTestId("sentence-order-listen-replay")).not.toBeInTheDocument();
  });

  test("EC4. 틀린 순서로 확인해도 한 번 재생하고 보고하지 않는다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([wordOrder], lesson);
    place(wordOrder, [...wordOrder.answerOrder].reverse());

    check();

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).not.toHaveBeenCalled();
  });

  test("EC4. 자동 재생이 꺼지면 확인해도 재생하지 않는다", () => {
    const { lesson } = lessonAudioStub({ autoPlay: "off" });
    mount([wordOrder], lesson);
    place(wordOrder);

    check();

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC4. 다음 문항으로 넘어가면 재생을 멈춘다", () => {
    const { lesson } = lessonAudioStub();
    mount([wordOrder, wordOrderBase], lesson);
    place(wordOrder);
    check();
    stopAudio.mockClear();

    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

    expect(stopAudio).toHaveBeenCalledTimes(1);
  });
});
