import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { SyllableBuildActivity } from "./SyllableBuildActivity";
import type { SyllableBuildQuestion } from "./syllable-build.contract";

// `ui` 계층: 음절 조립의 정답 상자도 듣기 카드와 같이 펼쳐진다(ADR-0212 — 같은 모양의 자리).

const card: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  tilesSource: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const box = () => screen.queryByTestId("syllable-build-reveal-box");

function checkAnswer(motion: "standard" | "reduced"): void {
  render(
    <MotionProvider motion={motion}>
      <SyllableBuildActivity questions={[card]} onExit={() => {}} onFinish={() => {}} />
    </MotionProvider>,
  );
  fireEvent.tap(screen.getByTestId("syllable-build-tile-2"), {});
  fireEvent.tap(screen.getByTestId("syllable-build-tile-1"), {});
  expect(box()).not.toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
}

test("SE1. Check하면 정답 상자가 펼침 상자 안에서 재는 중으로 선다", () => {
  checkAnswer("standard");

  expect(box()).toHaveAttribute("data-phase", "measuring");
  expect(screen.getByTestId("syllable-build-reveal")).toHaveTextContent("Answer: 카드");
});

test("SE2. 움직임 줄이기 — 바로 열림", () => {
  checkAnswer("reduced");

  expect(box()).toHaveAttribute("data-phase", "open");
});
