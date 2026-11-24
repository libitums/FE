import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { lessonAudioStub } from "../../lib/question-audio.test-support";
import type { LessonSoundUse } from "../../lib/question-audio";
import type { ItemAnswerReport } from "../../lib/item-answer";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 단어 고르기 보기를 누르면 그 낱말 소리(ADR-0188) — 판정 · 측정 보고 · 넘김은 소리와 무관하게 같다.
// 재생 접점(`lib/audio`)만 대역입니다.

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

const MUL = "https://cdn/audio/u01/word-mul.m4a";
const BUL = "https://cdn/audio/u01/word-bul.m4a";

const base: WordChoiceQuestion = {
  prompt: "___ 주세요.",
  choices: ["물", "불"],
  answerIndex: 0,
};
const withSound: WordChoiceQuestion = { ...base, choiceAudio: [MUL, null] };

function mount(question: WordChoiceQuestion) {
  const onSoundUsed = vi.fn<(use: LessonSoundUse) => void>();
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  const { lesson } = lessonAudioStub({ onSoundUsed });
  render(
    <WordChoiceActivity
      questions={[question, question]}
      onExit={() => {}}
      onFinish={() => {}}
      lessonAudio={lesson}
      onItemAnswered={onItemAnswered}
    />,
  );
  return { onSoundUsed, onItemAnswered };
}

const choose = (index: number): void =>
  void fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-choice-${index}`), {});

beforeEach(() => {
  playAudio.mockReset();
  playAudio.mockReturnValue("started");
});
afterEach(() => cleanup());

describe("단어 고르기 칩 소리", () => {
  test("WC1. 소리 있는 보기를 누르면 그 낱말 소리 · chip-sound 알림", () => {
    const { onSoundUsed } = mount(withSound);
    choose(0);

    expect(playAudio.mock.calls.map((call) => call[0])).toEqual([MUL]);
    expect(onSoundUsed).toHaveBeenCalledWith({ kind: "chip-sound", surface: "word_choice" });
  });

  test("WC2. 소리 없는 보기는 지금처럼 조용 — 알림 없음", () => {
    const { onSoundUsed } = mount(withSound);
    choose(1);

    expect(playAudio).not.toHaveBeenCalled();
    expect(onSoundUsed).not.toHaveBeenCalled();
  });

  test("WC3. 판정 · 측정 보고는 소리와 무관하게 같다", () => {
    const quiet = mount(base);
    choose(1);
    const without = quiet.onItemAnswered.mock.calls[0]?.[0];
    cleanup();

    const loud = mount(withSound);
    choose(1);
    expect(loud.onItemAnswered.mock.calls[0]?.[0]).toEqual(without);
    expect(screen.getByTestId("answer-verdict").getAttribute("data-result")).toBe("incorrect");
  });

  test("WC4. 판정 뒤 다시 누른 보기는 소리를 내지 않는다(이미 잠긴 보기)", () => {
    mount(withSound);
    choose(1);
    playAudio.mockClear();
    choose(0);

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("WC6. 자동 재생을 끄면 칩 소리도 나지 않는다(접근성 감사 Major — 낭독과 겹침)", () => {
    const onSoundUsed = vi.fn<(use: LessonSoundUse) => void>();
    const { lesson } = lessonAudioStub({ onSoundUsed, autoPlay: "off" });
    render(
      <WordChoiceActivity
        questions={[withSound]}
        onExit={() => {}}
        onFinish={() => {}}
        lessonAudio={lesson}
      />,
    );
    choose(0);

    expect(playAudio).not.toHaveBeenCalled();
    expect(onSoundUsed).not.toHaveBeenCalled();
  });

  test("WC5. 정답 보기의 소리가 정답 뒤 음성과 같으면 칩 소리는 건너뛴다(같은 문장 두 번 없음), 틀린 보기는 낸다", () => {
    const same: WordChoiceQuestion = { ...withSound, audio: { kind: "answer-echo", source: MUL } };
    mount(same);
    choose(0);
    expect(playAudio).not.toHaveBeenCalled();
    cleanup();

    mount({ ...same, choiceAudio: [MUL, BUL] });
    choose(1);
    expect(playAudio.mock.calls.map((call) => call[0])).toEqual([BUL]);
  });
});
