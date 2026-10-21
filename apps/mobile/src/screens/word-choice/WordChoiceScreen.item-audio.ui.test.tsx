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
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";
import {
  expectListenAgainAccessible,
  listenAgainParts,
} from "../../components/listen-controls.test-support";

// `ui` 계층: 단어 선택 활동의 문항 음성 — REPLY_SELECT(듣기 갈래)는 간이 줄과 자동 재생, 그림 고르기 ·
// 영어 뜻 고르기(정답 뒤 재생 갈래)는 고른 순간 한 번 재생합니다. 재생 접점(`lib/audio`)만 대역입니다.

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

const reply: WordChoiceQuestion = {
  prompt: "안녕하세요",
  romanization: "annyeonghaseyo",
  translation: "Hello",
  choices: ["안녕하세요", "감사합니다"],
  answerIndex: 0,
};
const replyWithSound = (itemId = "S9-01"): WordChoiceQuestion =>
  withAudio(reply, listenAudioOf("REPLY_SELECT", itemId));

const picture: WordChoiceQuestion = {
  prompt: "water",
  choices: ["카드", "현금", "물", "영수증"],
  answerIndex: 2,
  picture: { url: "https://cdn/images/u01-water/s1-05.jpg", answerRomanization: "mul" },
};
const pictureWithEcho: WordChoiceQuestion = withAudio(picture, echoAudioOf());

const translate: WordChoiceQuestion = {
  prompt: "물",
  romanization: "mul",
  choices: ["water", "fire"],
  answerIndex: 0,
};
const translateWithEcho: WordChoiceQuestion = withAudio(translate, echoAudioOf());

function mount(questions: readonly WordChoiceQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <WordChoiceActivity questions={questions} onExit={() => {}} onFinish={() => {}} {...extra} />,
  );
}

const loadPicture = (): void =>
  void fireEvent(
    screen.getByTestId("word-choice-picture-image"),
    new window.Event("bindEvent:load"),
  );
const choose = (index: number): void =>
  void fireEvent.tap(screen.getByTestId(`word-choice-option-${index}`), {});

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

describe("REPLY_SELECT — 듣기 갈래", () => {
  test("WC1. 제시문 · 로마자 · 뜻이 그대로 보이고 그 뒤 보기 앞에 간이 줄이 서며 자동 재생이 한 번 난다", () => {
    const { lesson } = lessonAudioStub();

    const { container } = mount([replyWithSound()], lesson);

    expect(
      testIdOrder(container, [
        "word-choice-screen-prompt",
        "word-choice-screen-romanization",
        "word-choice-screen-translation",
        "word-choice-listen",
        "word-choice-screen-options",
      ]),
    ).toEqual([
      "word-choice-screen-prompt",
      "word-choice-screen-romanization",
      "word-choice-screen-translation",
      "word-choice-listen",
      "word-choice-screen-options",
    ]);
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(LISTEN_SOURCE, expect.any(Function), 1);
  });

  test("WC1. audio가 없으면 줄도 재생도 없다", () => {
    const { lesson } = lessonAudioStub();

    mount([reply], lesson);

    expect(screen.queryByTestId("word-choice-listen")).not.toBeInTheDocument();
    expect(playAudio).not.toHaveBeenCalled();
  });

  test("WC1. 줄의 다시 듣기와 slow가 조작을 위로 올린다", () => {
    const { lesson, onTogglePace } = lessonAudioStub();
    mount([replyWithSound()], lesson);

    fireEvent.tap(listenAgainParts("word-choice-listen").button, {});
    expect(playAudio).toHaveBeenCalledTimes(2);

    fireEvent.tap(screen.getByTestId("word-choice-listen-slow"), {});
    expect(onTogglePace).toHaveBeenCalledTimes(1);
  });

  test("WC2. 고르면 정오와 함께 한 번 보고한다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([replyWithSound("S9-01")], lesson);

    choose(1);

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: { itemId: "S9-01", itemType: "REPLY_SELECT" },
        result: "incorrect",
      }),
    );
  });

  test("AX1. 줄 안 DOM 순서는 다시 듣기 다음 slow이고 이름은 Play again · Slow, off다", () => {
    const { lesson } = lessonAudioStub();
    mount([replyWithSound()], lesson);

    const line = screen.getByTestId("word-choice-listen");
    expect(testIdOrder(line, ["word-choice-listen-again", "word-choice-listen-slow"])).toEqual([
      "word-choice-listen-again",
      "word-choice-listen-slow",
    ]);
    expectListenAgainAccessible("word-choice-listen", "Play again");
    expect(screen.getByTestId("word-choice-listen-slow")).toHaveAttribute(
      "accessibility-label",
      "Slow, off",
    );
  });
});

describe("정답 뒤 재생 갈래", () => {
  test("EC1. IMG_MATCH는 고르기 전에는 재생이 없고 고른 순간 속도 인자 없이 한 번 재생하며 줄이 없다", () => {
    const { lesson } = lessonAudioStub();
    const { container } = mount([pictureWithEcho], lesson);
    loadPicture();
    expect(playAudio).not.toHaveBeenCalled();

    choose(0);

    expect(playAudio).toHaveBeenCalledTimes(1);
    const call = playAudio.mock.calls[0];
    expect(call?.[0]).toBe(ECHO_SOURCE);
    expect(call?.[2] === undefined || call?.[2] === 1).toBe(true);
    expect(testIdOrder(container, ["word-choice-listen", "word-choice-listen-slow"])).toEqual([]);
  });

  test("EC1. 다음 문항으로 넘어가면 재생을 멈춘다", () => {
    const { lesson } = lessonAudioStub();
    mount([pictureWithEcho, translate], lesson);
    loadPicture();
    choose(2);
    stopAudio.mockClear();

    fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

    expect(stopAudio).toHaveBeenCalledTimes(1);
  });

  test("EC1. 정오와 상관없이 오답을 골라도 한 번 재생한다", () => {
    const { lesson } = lessonAudioStub();
    mount([pictureWithEcho], lesson);
    loadPicture();

    choose(0);

    expect(playAudio).toHaveBeenCalledTimes(1);
  });

  test("EC2. TRANSLATE_TO_EN도 고른 순간 한 번 재생하고 보고는 하지 않는다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([translateWithEcho], lesson);
    expect(playAudio).not.toHaveBeenCalled();

    choose(0);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio.mock.calls[0]?.[0]).toBe(ECHO_SOURCE);
    expect(onListenItemAnswered).not.toHaveBeenCalled();
    expect(screen.queryByTestId("word-choice-listen")).not.toBeInTheDocument();
  });

  test("EC2. 자동 재생이 꺼지면 고른 순간에도 재생하지 않는다", () => {
    const { lesson } = lessonAudioStub({ autoPlay: "off" });
    mount([translateWithEcho], lesson);

    choose(0);

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC2. audio가 없는 문항은 고른 뒤에도 재생이 없다", () => {
    const { lesson } = lessonAudioStub();
    mount([translate], lesson);

    choose(0);

    expect(playAudio).not.toHaveBeenCalled();
  });
});
