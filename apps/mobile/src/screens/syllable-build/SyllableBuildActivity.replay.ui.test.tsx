import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  echoAudioOf,
  ECHO_SOURCE,
  lessonAudioStub,
  withAudio,
} from "../../lib/question-audio.test-support";
import type { LessonSoundUse } from "../../lib/question-audio";
import { SyllableBuildActivity } from "./SyllableBuildActivity";
import type { SyllableBuildQuestion } from "./syllable-build.contract";

// `ui` 계층: 음절 조립 판정 뒤 다시 듣기(ADR-0189). 재생 접점(`lib/audio`)만 대역입니다.

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

const cardBase: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
};

function mount(question: SyllableBuildQuestion) {
  const onSoundUsed = vi.fn<(use: LessonSoundUse) => void>();
  const { lesson } = lessonAudioStub({ onSoundUsed });
  render(
    <SyllableBuildActivity
      questions={[question, question]}
      onExit={() => {}}
      onFinish={() => {}}
      lessonAudio={lesson}
    />,
  );
  return { onSoundUsed };
}

const tapTile = (index: number): void =>
  void fireEvent.tap(screen.getByTestId(`syllable-build-tile-${index}`), {});
const check = (): void => void fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

beforeEach(() => {
  playAudio.mockReset();
  playAudio.mockReturnValue("started");
});
afterEach(() => cleanup());

test("SB1. 확인 뒤 배지 옆 스피커 — 누르면 정답 낱말 소리 · answer-replayed", () => {
  const { onSoundUsed } = mount(withAudio(cardBase, echoAudioOf()));
  expect(screen.queryByTestId("learning-shell-verdict-replay")).toBeNull();

  tapTile(2);
  tapTile(1);
  check();
  playAudio.mockClear();
  const replay = screen.getByTestId("learning-shell-verdict-replay");
  fireEvent.tap(within(replay).getByTestId("ui-lynx-round-button"), {});

  expect(playAudio.mock.calls.map((call) => call[0])).toEqual([ECHO_SOURCE]);
  expect(onSoundUsed).toHaveBeenCalledWith({ kind: "answer-replayed" });
});

test("SB2. 정답 음성이 없으면 회색", () => {
  mount(cardBase);
  tapTile(2);
  tapTile(1);
  check();

  expect(screen.getByTestId("learning-shell-verdict-replay").getAttribute("data-state")).toBe(
    "unavailable",
  );
});
