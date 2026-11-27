import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { PairMatchActivity } from "./PairMatchActivity";
import type { PairMatchQuestion } from "./pair-match.contract";

// `ui` 계층: 짝 맞추기의 틀린 짝 정답 상자도 듣기 카드와 같이 펼쳐진다(ADR-0212 — 같은 모양의 자리).

const question: PairMatchQuestion = {
  words: ["이름", "안녕하세요", "반갑다", "어느"],
  meanings: ["which, how", "name", "nice to meet, happy", "hi, hello"],
  answer: [1, 3, 2, 0],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  backHandlers.runTop();
});

const tap = (testId: string): void => void fireEvent.tap(screen.getByTestId(testId), {});
const box = () => screen.queryByTestId("pair-match-reveal-box");

// 낱말 0 · 1의 짝을 뒤바꿔 잇고(0 → hi, 1 → name) 나머지는 바로 이은 뒤 Check합니다.
function checkWrong(motion: "standard" | "reduced"): void {
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (_args: unknown, callback: (result: unknown) => void) => {
        callback("announced");
      },
    },
  });
  render(
    <MotionProvider motion={motion}>
      <PairMatchActivity questions={[question]} onExit={() => {}} onFinish={() => {}} />
    </MotionProvider>,
  );
  const pairs: readonly (readonly [number, number])[] = [
    [0, 3],
    [1, 1],
    [2, 2],
    [3, 0],
  ];
  for (const [word, meaning] of pairs) {
    tap(`pair-match-word-${word}`);
    tap(`pair-match-meaning-${meaning}`);
  }
  expect(box()).not.toBeInTheDocument();
  tap("learning-shell-action");
}

test("PE1. 틀린 짝을 확인하면 정답 상자가 펼침 상자 안에서 재는 중으로 선다", () => {
  checkWrong("standard");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(box()).toHaveAttribute("data-phase", "measuring");
  expect(screen.getByTestId("pair-match-reveal")).toBeInTheDocument();
});

test("PE2. 움직임 줄이기 — 바로 열림", () => {
  checkWrong("reduced");

  expect(box()).toHaveAttribute("data-phase", "open");
});
