import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { echoAudioOf, ECHO_SOURCE, lessonAudioStub } from "../../lib/question-audio.test-support";
import type { LessonSoundUse } from "../../lib/question-audio";
import type { ItemAnswerReport } from "../../lib/item-answer";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import { tapCheck } from "./sentence-order-check.test-support";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 문장 조립의 칩 소리 · 판정 뒤 다시 듣기(ADR-0188). 칩을 놓을 때만 그 낱말 소리, 되돌릴 때는 없음.
// 판정 · 측정 보고는 소리와 무관하게 같다. 재생 접점(`lib/audio`)만 대역입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio } = audio;

const YEOGWON = "https://cdn/audio/u02/word-yeogwon.m4a";

const base: SentenceOrderQuestion = {
  prompt: "Here's my passport.",
  chips: ["있어요.", "여권", "여기"],
  answerOrder: [2, 1, 0],
  instruction: "Build the sentence.",
  audio: echoAudioOf(),
};
const withChips: SentenceOrderQuestion = { ...base, chipAudio: [null, YEOGWON, null] };

function mount(question: SentenceOrderQuestion) {
  const onSoundUsed = vi.fn<(use: LessonSoundUse) => void>();
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  const { lesson } = lessonAudioStub({ onSoundUsed });
  render(
    <SentenceOrderActivity
      questions={[question, question]}
      onExit={() => {}}
      onFinish={() => {}}
      lessonAudio={lesson}
      onItemAnswered={onItemAnswered}
    />,
  );
  return { onSoundUsed, onItemAnswered };
}

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const played = () => playAudio.mock.calls.map((call) => call[0]);

beforeEach(() => {
  playAudio.mockReset();
  playAudio.mockReturnValue("started");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("칩 소리", () => {
  test("SC1. 소리 있는 조각을 놓으면 그 낱말 소리 · chip-sound 알림, 소리 없는 조각은 조용", () => {
    const { onSoundUsed } = mount(withChips);

    fireEvent.tap(chip(1), {});
    expect(played()).toEqual([YEOGWON]);
    expect(onSoundUsed).toHaveBeenCalledWith({ kind: "chip-sound", surface: "sentence_order" });

    fireEvent.tap(chip(2), {});
    expect(played()).toEqual([YEOGWON]);
    expect(onSoundUsed).toHaveBeenCalledTimes(1);
  });

  test("SC6. 자동 재생을 끄면 조각 소리도 나지 않는다", () => {
    const { lesson } = lessonAudioStub({ autoPlay: "off" });
    render(
      <SentenceOrderActivity
        questions={[withChips]}
        onExit={() => {}}
        onFinish={() => {}}
        lessonAudio={lesson}
      />,
    );
    fireEvent.tap(chip(1), {});
    expect(playAudio).not.toHaveBeenCalled();
  });

  test("SC2. 놓은 조각을 되돌릴 때는 소리가 없다", () => {
    mount(withChips);
    fireEvent.tap(chip(1), {});
    playAudio.mockClear();

    fireEvent.tap(chip(1), {});
    expect(playAudio).not.toHaveBeenCalled();
  });

  test("SC3. 칩 소리는 판정 · 측정 보고를 바꾸지 않는다", () => {
    const quiet = mount(base);
    for (const index of base.answerOrder) fireEvent.tap(chip(index), {});
    tapCheck();
    const reportWithout = quiet.onItemAnswered.mock.calls[0]?.[0];
    cleanup();

    const loud = mount(withChips);
    for (const index of withChips.answerOrder) fireEvent.tap(chip(index), {});
    tapCheck();
    expect(loud.onItemAnswered.mock.calls[0]?.[0]).toEqual(reportWithout);
  });
});

describe("판정 뒤 다시 듣기", () => {
  test("SC4. Check 뒤 배지 옆 스피커 — 누르면 정답 문장 · answer-replayed 알림", () => {
    const { onSoundUsed } = mount(base);
    expect(screen.queryByTestId("learning-shell-verdict-replay")).toBeNull();

    for (const index of base.answerOrder) fireEvent.tap(chip(index), {});
    tapCheck();
    playAudio.mockClear();
    const replay = screen.getByTestId("learning-shell-verdict-replay");
    fireEvent.tap(within(replay).getByTestId("ui-lynx-round-button"), {});

    expect(played()).toEqual([ECHO_SOURCE]);
    expect(onSoundUsed).toHaveBeenCalledWith({ kind: "answer-replayed" });
  });

  test("SC5. 정답 음성이 없는 문항은 회색", () => {
    const { audio: _omit, ...silent } = base;
    mount(silent);
    for (const index of base.answerOrder) fireEvent.tap(chip(index), {});
    tapCheck();

    expect(screen.getByTestId("learning-shell-verdict-replay").getAttribute("data-state")).toBe(
      "unavailable",
    );
  });
});
