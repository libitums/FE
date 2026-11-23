import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { ANSWER_ECHO_DELAY_MS } from "../../lib/question-audio";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { EntryBasicsComposeScreen } from "./EntryBasicsComposeScreen";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";

// `ui` 계층: 입장 전 합치기 세 문제 — Letters의 합치기 퀴즈(ADR-0169)와 같은 판정 · 낭독 · 소리(ADR-0176).

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(audio: "available" | "missing" = "available") {
  const play = vi.fn<(source: string) => void>();
  const onNext = vi.fn();
  const onBack = vi.fn();
  const onSkip = vi.fn();
  render(
    <EntryBasicsComposeScreen
      romanization="shown"
      autoPlay="on"
      sound={{
        sourceOf: (s) => (audio === "missing" ? null : `src:${s}`),
        letterSourceOf: () => null,
        play,
      }}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    />,
  );
  return { play, onNext, onBack, onSkip };
}

const tiles = ["ㅏ", "ㄷ", "ㄱ", "ㅗ", "ㄴ", "ㅓ"];
const pick = (letter: string) =>
  fireEvent.tap(screen.getByTestId(`compose-tile-${tiles.indexOf(letter)}`), {});
const next = () =>
  fireEvent.tap(within(screen.getByTestId(ids.next)).getByTestId("ui-lynx-button"), {});

test("BC1. 2/3 막대 · 문제 1/3 · 판정 전 다음 단추 없음", () => {
  mount();
  expect(screen.getByTestId(ids.progress)).toHaveAttribute("accessibility-label", "Step 2 of 3");
  const root = screen.getByTestId(ids.compose);
  expect(root.textContent).toContain("Letter building · 1 / 3");
  expect(root.textContent).toContain("Make “ga”");
  expect(screen.getByTestId(ids.title)).toHaveTextContent("Put two letters together.");
  expect(screen.queryByTestId(ids.next)).not.toBeInTheDocument();
});

test("BC2. 세 문제를 다 맞히면 마지막은 Continue이고 완료는 한 번", () => {
  const { onNext } = mount();
  pick("ㄱ");
  pick("ㅏ");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId(ids.next).textContent).toContain("Next");
  next();
  expect(screen.getByTestId(ids.compose).textContent).toContain("2 / 3");
  pick("ㄴ");
  pick("ㅓ");
  next();
  pick("ㄷ");
  pick("ㅗ");
  expect(screen.getByTestId(ids.next).textContent).toContain("Continue");
  expect(onNext).not.toHaveBeenCalled();
  act(() => {
    next();
    next();
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("BC3. 틀리면 Try again — 같은 문제로 비운다", () => {
  const { onNext } = mount();
  pick("ㄱ");
  pick("ㅓ");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(screen.getByTestId(ids.next).textContent).toContain("Try again");
  next();
  expect(screen.getByTestId("compose-slot-c")).toHaveAttribute("data-state", "current");
  expect(screen.getByTestId(ids.compose).textContent).toContain("1 / 3");
  expect(onNext).not.toHaveBeenCalled();
});

test("BC4. 판정을 낭독하고 정답 효과음 뒤 음절 소리가 한 번 난다", () => {
  vi.useFakeTimers();
  const announced: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
  const { play } = mount();
  pick("ㄱ");
  pick("ㅏ");
  expect(announced).toContain(uiCopyEn.common.resultAnnouncement("correct"));
  act(() => {
    vi.advanceTimersByTime(ANSWER_ECHO_DELAY_MS);
  });
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("BC5. 소리가 없으면 듣기 단추는 비활성이고 문제는 그대로 풀린다", () => {
  const { play } = mount("missing");
  const speaker = screen.getByTestId("compose-play");
  expect(speaker).toHaveAttribute("accessibility-traits", "disabled");
  expect(speaker).toHaveAttribute("accessibility-label", "Play, sound not available yet");
  fireEvent.tap(speaker, {});
  pick("ㄱ");
  pick("ㅏ");
  expect(play).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.next)).toBeInTheDocument();
});

test("BC6. Skip · 시스템 뒤로", () => {
  const first = mount();
  fireEvent.tap(within(screen.getByTestId(ids.skip)).getByTestId("ui-lynx-button"), {});
  expect(first.onSkip).toHaveBeenCalledTimes(1);
  cleanup();

  const second = mount();
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(second.onBack).toHaveBeenCalledTimes(1);
});
