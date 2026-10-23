import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { initialSessionOptions } from "../../lib/session-options";
import {
  lessonAudioStub,
  listenAudioOf,
  LISTEN_SOURCE,
  withAudio,
} from "../../lib/question-audio.test-support";
import type { LessonAudio } from "../../lib/question-audio";
import { ListeningActivity } from "./ListeningScreen";
import type { ListeningQuestion } from "./listening-questions";

// `ui` 계층: 듣기 활동이 문항 음성(`audio`)을 받아 3열 조작 · 자동 재생 · 문항 보고를 하는가.
// 재생 접점(`lib/audio`)만 대역이고 화면 · 훅 · 부품은 실물입니다.

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

const base = {
  prompt: "안녕하세요",
  romanization: "annyeonghaseyo",
  choices: ["Hello", "Thank you"],
  answerIndex: 0,
} as unknown as ListeningQuestion;

const soundful = (itemId: string, source = LISTEN_SOURCE): ListeningQuestion =>
  withAudio(base, listenAudioOf("LISTEN_SELECT", itemId, source));

const silent: ListeningQuestion = withAudio(base, null);

function mount(questions: readonly ListeningQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <ListeningActivity
      questions={questions}
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
      gemCount={0}
      {...extra}
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

describe("ListeningActivity — 문항 음성", () => {
  test("LS1. 음성이 있고 속도 재생이 지원되면 3열에 listening-prompt-slow가 선다", () => {
    const { lesson } = lessonAudioStub();

    mount([soundful("S2-01")], lesson);

    expect(screen.getByTestId("listening-prompt-slow")).toHaveAttribute(
      "accessibility-label",
      "Slow, off",
    );
    expect(screen.getByTestId("listening-prompt-replay")).toBeInTheDocument();
    expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
  });

  test("LS1. 속도 재생을 지원하지 않으면 slow는 없고 재생 단추는 남는다", () => {
    const { lesson } = lessonAudioStub({ slowPlayback: "unsupported" });

    mount([soundful("S2-01")], lesson);

    expect(screen.queryByTestId("listening-prompt-slow")).not.toBeInTheDocument();
    expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
  });

  test("LS1. audio가 null인 문항은 소리 없는 프롬프트 그대로이고 slow가 없다", () => {
    const { lesson } = lessonAudioStub();

    mount([silent], lesson);

    expect(screen.getByTestId("listening-silent-prompt-audio")).toHaveAttribute(
      "accessibility-traits",
      "disabled",
    );
    expect(screen.queryByTestId("listening-prompt-slow")).not.toBeInTheDocument();
    expect(screen.queryByTestId("listening-prompt-playback")).not.toBeInTheDocument();
    expect(playAudio).not.toHaveBeenCalled();
  });

  test("LS1. 마운트하면 지금 속도로 자동 재생이 한 번 난다", () => {
    const { lesson } = lessonAudioStub({ pace: "slow" });

    mount([soundful("S2-01")], lesson);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(LISTEN_SOURCE, expect.any(Function), 0.85);
  });

  test("LS1. slow를 탭하면 lessonAudio.onTogglePace가 불린다", () => {
    const { lesson, onTogglePace } = lessonAudioStub();
    mount([soundful("S2-01")], lesson);

    fireEvent.tap(screen.getByTestId("listening-prompt-slow"), {});

    expect(onTogglePace).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenLastCalledWith(LISTEN_SOURCE, expect.any(Function), 0.85);
  });

  test("LS2. 정답 보기를 고르면 correct로 한 번 보고하고 문항 참조가 실린다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([soundful("S2-01")], lesson);

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-choice-0"), {});

    expect(onListenItemAnswered).toHaveBeenCalledTimes(1);
    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
        result: "correct",
        pace: "normal",
        slowTurnedOn: false,
      }),
    );
  });

  test("LS2. 오답 보기를 고르면 incorrect로 보고한다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([soundful("S2-01")], lesson);

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-choice-1"), {});

    expect(onListenItemAnswered).toHaveBeenCalledWith(
      expect.objectContaining({ result: "incorrect" }),
    );
  });

  test("LS2. 소리 없는 문항은 보고하지 않는다", () => {
    const { lesson, onListenItemAnswered } = lessonAudioStub();
    mount([silent], lesson);

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-choice-0"), {});

    expect(onListenItemAnswered).not.toHaveBeenCalled();
  });

  test("LS3. 같은 source의 문항이 이어져도 둘째 문항이 자동 재생된다", () => {
    const { lesson } = lessonAudioStub();
    mount([soundful("S2-01"), soundful("S8-01")], lesson);
    expect(playAudio).toHaveBeenCalledTimes(1);

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-choice-0"), {});
    fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

    expect(playAudio).toHaveBeenCalledTimes(2);
    expect(stopAudio).toHaveBeenCalledTimes(1);
  });

  test("LS3. 자동 재생이 꺼지면(레슨 소리 설정) 자동 재생은 없다", () => {
    const { lesson } = lessonAudioStub({ autoPlay: "off" });

    mount([soundful("S2-01")], lesson);

    expect(playAudio).not.toHaveBeenCalled();
  });
});
