import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SyllableBuildActivity } from "./SyllableBuildActivity";
import type { SyllableBuildQuestion } from "./syllable-build.contract";

// `ui` 계층: 고민 힌트(ADR-0177) — 5초 동안 아무것도 누르지 않으면 다음에 놓을 창고 타일에 브랜드 색 그림자가 선다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);

const card: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
};

const tile = (index: number) => screen.getByTestId(`syllable-build-tile-${index}`);
const nudged = (index: number) => tile(index).className.includes("answer-nudge-target");
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  render(<SyllableBuildActivity questions={[card]} onExit={() => {}} onFinish={() => {}} />);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("SB-UI40 5초 동안 누르지 않으면 첫 글자 타일에 그림자 — 맞게 놓으면 5초 뒤 그다음 글자", () => {
  wait(4_900);
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
  wait(100);
  expect(nudged(2)).toBe(true);
  expect(screen.getAllByTestId("answer-nudge-glow")).toHaveLength(1);
  fireEvent.tap(tile(2), {});
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
  wait(5_000);
  expect(nudged(1)).toBe(true);
});

test("SB-UI41 틀린 글자가 놓여 있으면 켜지지 않는다", () => {
  fireEvent.tap(tile(0), {});
  wait(10_000);
  expect(screen.queryByTestId("answer-nudge-glow")).toBeNull();
});
