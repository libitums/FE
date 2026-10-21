import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

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
import { zeroSafeAreaInsets } from "../../lib/safe-area";
import { keystrokesFor } from "../messenger/hangul-keyboard";
import { TypingActivity } from "./TypingActivity";
import type { TypingQuestion } from "./typing.contract";
import {
  expectListenAgainAccessible,
  listenAgainParts,
} from "../../components/listen-controls.test-support";

// `ui` 계층: 타자 활동의 문항 음성 — DICTATION(듣기 갈래)은 간이 줄과 자동 재생, TRANSLATE_TO_KO(정답 뒤 재생
// 갈래)는 확인한 순간 한 번 재생합니다. 재생 접점(`lib/audio`)만 대역입니다.

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

const dictationBase = {
  id: "S6-01",
  kind: "dictation",
  instruction: "Type what you hear.",
  cue: "yeogwon yeogi isseoyo.",
  cueSupport: "Here's my passport.",
  hint: null,
  answers: ["여권 여기 있어요."],
} as unknown as TypingQuestion;

const dictation: TypingQuestion = withAudio(dictationBase, listenAudioOf("DICTATION", "S6-01"));
const dictationSilent: TypingQuestion = withAudio(dictationBase, null);

const translationBase = {
  id: "S4-13",
  kind: "translation",
  instruction: "Say this in Korean.",
  cue: "I'm staying a week.",
  cueSupport: null,
  hint: null,
  answers: ["일주일 묵어요."],
} as unknown as TypingQuestion;
const translation: TypingQuestion = withAudio(translationBase, echoAudioOf());

function mount(questions: readonly TypingQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <TypingActivity
      insets={zeroSafeAreaInsets}
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      {...extra}
    />,
  );
}

function typeText(text: string): void {
  for (const key of keystrokesFor(text)) {
    fireEvent.tap(screen.getByTestId(`messenger-key-${key}`), {});
  }
}

function check(): void {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", "Check");
  fireEvent.tap(action, {});
}

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

describe("DICTATION — 듣기 갈래", () => {
  test("TY1. 간이 줄이 단서 위에 서고 칸은 listen 수정 클래스를 달며 꺼진 재생 조작은 없다", () => {
    const { lesson } = lessonAudioStub();

    const { container } = mount([dictation], lesson);

    expect(
      testIdOrder(container, [
        "typing-activity-listen",
        "typing-activity-cue",
        "typing-activity-cue-support",
      ]),
    ).toEqual(["typing-activity-listen", "typing-activity-cue", "typing-activity-cue-support"]);
    expect(screen.queryByTestId("typing-activity-audio")).not.toBeInTheDocument();
    const block = container.querySelector(".typing-activity-cue-block-listen");
    expect(block).not.toBeNull();
    expect(block?.querySelector('[data-testid="typing-activity-listen"]')).not.toBeNull();
  });

  test("TY1. 서면 자동 재생이 한 번 나고 줄의 다시 듣기 · slow가 조작을 올린다", async () => {
    const { lesson, onTogglePace } = lessonAudioStub();
    mount([dictation], lesson);
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(LISTEN_SOURCE, expect.any(Function), 1);
    const onFinished = playAudio.mock.calls[0]?.[1];
    if (onFinished === undefined) throw new Error("자동 재생이 안 났다");
    await act(async () => {
      onFinished();
    });

    fireEvent.tap(listenAgainParts("typing-activity-listen").button, {});
    expect(playAudio).toHaveBeenCalledTimes(2);

    fireEvent.tap(screen.getByTestId("typing-activity-listen-slow"), {});
    expect(onTogglePace).toHaveBeenCalledTimes(1);
  });

  test("TY1. audio가 null이면 지금처럼 꺼진 재생 조작이 서고 줄도 재생도 없다", () => {
    const { lesson } = lessonAudioStub();

    mount([dictationSilent], lesson);

    expect(screen.getByTestId("typing-activity-audio")).toHaveAttribute(
      "accessibility-traits",
      "disabled",
    );
    expect(screen.queryByTestId("typing-activity-listen")).not.toBeInTheDocument();
    expect(playAudio).not.toHaveBeenCalled();
  });

  test("TY2. 맞게 쓰고 확인하면 correct로 한 번 보고한다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([dictation], lesson);

    typeText("여권 여기 있어요");
    check();

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: { itemId: "S6-01", itemType: "DICTATION" },
        result: "correct",
      }),
    );
  });

  test("TY2. 틀리게 쓰고 확인하면 incorrect로 보고한다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([dictation], lesson);

    typeText("여권");
    check();

    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({ result: "incorrect" }),
    );
  });

  test("AX1. 줄 안 이름은 자동 재생 중 Stop · Slow, off이고 다시 듣기가 먼저다", () => {
    const { lesson } = lessonAudioStub();
    mount([dictation], lesson);

    expectListenAgainAccessible("typing-activity-listen", "Stop");
    expect(screen.getByTestId("typing-activity-listen-slow")).toHaveAttribute(
      "accessibility-label",
      "Slow, off",
    );
    expect(
      testIdOrder(screen.getByTestId("typing-activity-listen"), [
        "typing-activity-listen-again",
        "typing-activity-listen-slow",
      ]),
    ).toEqual(["typing-activity-listen-again", "typing-activity-listen-slow"]);
  });
});

describe("TRANSLATE_TO_KO — 정답 뒤 재생 갈래", () => {
  test("EC3. 확인 전에는 재생이 없고 확인한 순간 한 번 재생하며 줄은 없다", () => {
    const { lesson } = lessonAudioStub();
    mount([translation], lesson);
    typeText("일주일 묵어요");
    expect(playAudio).not.toHaveBeenCalled();

    check();

    expect(playAudio).toHaveBeenCalledTimes(1);
    const call = playAudio.mock.calls[0];
    expect(call?.[0]).toBe(ECHO_SOURCE);
    expect(call?.[2] === undefined || call?.[2] === 1).toBe(true);
    expect(screen.queryByTestId("typing-activity-listen")).not.toBeInTheDocument();
  });

  test("EC3. 틀린 답을 확인해도 한 번 재생하고 보고는 하지 않는다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([translation], lesson);
    typeText("일주");

    check();

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).not.toHaveBeenCalled();
  });

  test("EC3. 다음 문항으로 넘어가면 재생을 멈춘다", () => {
    const { lesson } = lessonAudioStub();
    mount([translation, dictationSilent], lesson);
    typeText("일주일 묵어요");
    check();
    stopAudio.mockClear();

    fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

    expect(stopAudio).toHaveBeenCalledTimes(1);
  });

  test("EC3. 자동 재생이 꺼지면 확인해도 재생하지 않는다", () => {
    const { lesson } = lessonAudioStub({ autoPlay: "off" });
    mount([translation], lesson);
    typeText("일주일 묵어요");

    check();

    expect(playAudio).not.toHaveBeenCalled();
  });
});
