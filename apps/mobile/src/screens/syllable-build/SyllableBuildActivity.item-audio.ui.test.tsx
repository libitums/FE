import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  echoAudioOf,
  ECHO_SOURCE,
  lessonAudioStub,
  withAudio,
} from "../../lib/question-audio.test-support";
import type { LessonAudio } from "../../lib/question-audio";
import { SyllableBuildActivity } from "./SyllableBuildActivity";
import type { SyllableBuildQuestion } from "./syllable-build.contract";

// `ui` 계층: 음절 조립 활동의 정답 뒤 재생 — 확인한 순간 한 번 재생합니다. 재생 접점(`lib/audio`)만 대역입니다.

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

const cardBase: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
};
const card: SyllableBuildQuestion = withAudio(cardBase, echoAudioOf());

function mount(questions: readonly SyllableBuildQuestion[], lesson?: LessonAudio) {
  const extra = lesson === undefined ? {} : { lessonAudio: lesson };
  return render(
    <SyllableBuildActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={() => {}}
      {...extra}
    />,
  );
}

const tapTile = (index: number): void =>
  void fireEvent.tap(screen.getByTestId(`syllable-build-tile-${index}`), {});

function buildCard(order: readonly number[]): void {
  for (const index of order) tapTile(index);
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

describe("SYLLABLE_BUILD — 정답 뒤 재생 갈래", () => {
  test("EC5. 확인 전에는 재생이 없고 확인한 순간 속도 인자 없이 한 번 재생한다", () => {
    const { lesson } = lessonAudioStub();
    mount([card], lesson);
    buildCard([2, 1]);
    expect(playAudio).not.toHaveBeenCalled();

    check();

    expect(playAudio).toHaveBeenCalledTimes(1);
    const call = playAudio.mock.calls[0];
    expect(call?.[0]).toBe(ECHO_SOURCE);
    expect(call?.[2] === undefined || call?.[2] === 1).toBe(true);
  });

  test("EC5. 틀린 조합을 확인해도 한 번 재생한다", () => {
    const { lesson } = lessonAudioStub();
    mount([card], lesson);
    buildCard([0, 3]);

    check();

    expect(playAudio).toHaveBeenCalledTimes(1);
  });

  test("EC5. lessonAudio.autoPlay가 off이면 확인해도 재생하지 않는다", () => {
    const { lesson } = lessonAudioStub({ autoPlay: "off" });
    mount([card], lesson);
    buildCard([2, 1]);

    check();

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC5. audio가 없는 문항은 재생하지 않는다", () => {
    const { lesson } = lessonAudioStub();
    mount([cardBase], lesson);
    buildCard([2, 1]);

    check();

    expect(playAudio).not.toHaveBeenCalled();
  });

  test("EC5. 소리 줄이나 slow는 서지 않는다", () => {
    const { lesson } = lessonAudioStub();
    const { container } = mount([card], lesson);

    expect(container.querySelector('[data-testid$="-slow"]')).toBeNull();
    expect(container.querySelector('[data-testid$="-listen"]')).toBeNull();
  });
});
