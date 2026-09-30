import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { EpisodePrologueScreen } from "./EpisodePrologueScreen";
import { advanceNarrative, revealNarrative } from "./test-helpers/narrative";
import type { EpisodePrologue } from "../screens/episode-intro/episode-intro.contract";

afterEach(() => vi.useRealTimers());

const prologue: EpisodePrologue = {
  kind: "sequence",
  segments: [
    {
      kind: "visual-novel",
      narrative: {
        character: null,
        beats: [{ speakerName: "Me", variant: "narration", line: "시작", translation: "Start" }],
      },
    },
    {
      kind: "messenger",
      chat: {
        partnerName: "Imagined friend",
        messages: [
          { id: "invite", sender: "other", text: "만나자", translation: "Let's meet" },
          { id: "reply", sender: "self", text: "좋아", translation: "Sure" },
        ],
      },
    },
    {
      kind: "call",
      callerPortrait: null,
      call: {
        callerName: "Imagined friend",
        lines: [{ text: "곧 도착해", translation: "Almost there" }],
      },
    },
    {
      kind: "visual-novel",
      narrative: {
        character: null,
        beats: [
          {
            speakerName: "Me",
            variant: "narration",
            line: "현실로",
            translation: "Back to reality",
          },
          {
            speakerName: "Me",
            variant: "narration",
            line: "첫마디 연습",
            translation: "Practice my first words",
          },
        ],
      },
    },
  ],
};

function mount() {
  const onComplete = vi.fn();
  const onExit = vi.fn();
  const view = render(
    <EpisodePrologueScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      label="Episode 0."
      prologue={prologue}
      onComplete={onComplete}
      onExit={onExit}
    />,
  );
  return { ...view, onComplete, onExit };
}

const advance = advanceNarrative;

test("메신저와 전화 완료는 다음 구간으로 이어지고 마지막 독백에서만 한 번 완료된다", () => {
  vi.useFakeTimers();
  const { onComplete } = mount();
  advance();
  act(() => {
    vi.advanceTimersByTime(1500);
  });
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-send"), {});
  fireEvent.tap(screen.getByTestId("prologue-chat-screen-complete"), {});
  expect(onComplete).not.toHaveBeenCalled();
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveTextContent("Imagined friend");
  expect(screen.getByTestId("prologue-call-screen-caller").querySelector("image")).toBeNull();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-accept"), {});

  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});
  revealNarrative();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent("현실로");
  advance();
  expect(onComplete).not.toHaveBeenCalled();
  advance();
  advance();
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test("중간에 나가면 완료하지 않고 새로 진입할 때 첫 장면에서 시작한다", () => {
  vi.useFakeTimers();
  const first = mount();
  advance();
  fireEvent.tap(
    within(screen.getByTestId("prologue-chat-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(first.onExit).toHaveBeenCalledTimes(1);
  expect(first.onComplete).not.toHaveBeenCalled();
  first.unmount();
  mount();
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent("시작");
  expect(screen.queryByTestId("prologue-chat-screen")).not.toBeInTheDocument();
});
