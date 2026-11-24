import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { ItemAnswerReport } from "../../lib/item-answer";
import {
  androidNetwork,
  androidNoMatch,
  iosNoSpeech,
  recognized,
  stubSpeechHost,
} from "../../lib/speech-host.test-support";
import type { SpeechHostResult } from "../../lib/speech-host.test-support";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 낱말 말하기에서 못 알아들음(no-match · 말 없음) · 네트워크 실패가 「인식 불가 · Skip」이 아니라
// 안내 + Try again(주) + Skip(보조)으로 서고, Try again이 같은 문항을 다시 들으며 보고가 한 번만 나는지 본다(ADR-0179).

const cardQuestion: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};

const notCaughtText = "I didn't catch that. Tap the mic and try again.";
const networkText = "Couldn't connect to speech recognition. Check your connection and try again.";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(results: readonly (SpeechHostResult | null)[]) {
  const speech = stubSpeechHost({ result: (attempt) => results[attempt] ?? null });
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <SpeakWordActivity
      questions={[cardQuestion, cardQuestion]}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
  return { speech, onItemAnswered };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);

function tapAction(label: string): void {
  const action = id("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

function tapSecondary(control: string, label: string): void {
  const slot = id("speak-word-secondary");
  expect(slot).toHaveAttribute("data-control", control);
  expect(slot).toHaveTextContent(label);
  const button = slot.querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  fireEvent.tap(button as Element, {});
}

test("USW-M1. Android no-match는 판정 없이 안내 · Try again(주) · Skip(보조)이 서고 한 번 알린다", () => {
  const { speech, onItemAnswered } = mount([androidNoMatch]);

  tapAction("Speak");

  expect(id("speak-word-content")).toHaveAttribute("data-phase", "missed");
  expect(id("speak-word-content")).toHaveAttribute("data-reason", "no-match");
  expect(id("speak-word-hint")).toHaveTextContent(notCaughtText);
  expect(speech.announced.builtin).toEqual([notCaughtText]);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("speak-word-secondary")).toHaveAttribute("data-control", "skip");
  expect(id("speak-word-waves")).toHaveAttribute("data-state", "idle");
  expect(maybe("answer-verdict")).not.toBeInTheDocument();
  expect(maybe("speak-word-reveal")).not.toBeInTheDocument();
  expect(onItemAnswered).not.toHaveBeenCalled();
});

test("USW-M2. Try again은 같은 문항을 다시 듣고, 두 번째에 맞히면 보고는 정답 한 번뿐이다", () => {
  const { speech, onItemAnswered } = mount([androidNoMatch, null]);

  tapAction("Speak");
  tapAction("Try again");

  expect(speech.calls.start).toBe(2);
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "listening");
  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "0");

  act(() => speech.pending[0]?.({ ...recognized("카드"), isFinal: true }));

  expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered.mock.calls[0]?.[0]).toMatchObject({ questionIndex: 0, outcome: "correct" });
});

test("USW-M3. 마이크를 다시 눌러도 같은 문항을 다시 듣는다", () => {
  const { speech } = mount([androidNoMatch, null]);

  tapAction("Speak");
  fireEvent.tap(id("speak-word-waves"), {});

  expect(speech.calls.start).toBe(2);
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "listening");
});

test("USW-M4. 못 알아들은 뒤 Skip은 missed:no-match와 오류 코드를 한 번 보고하고 다음 문항은 준비다", () => {
  const { onItemAnswered } = mount([androidNoMatch]);

  tapAction("Speak");
  tapSecondary("skip", "Skip");

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "skipped",
    density: "regular",
    skipReason: "missed:no-match",
    speech: { errorCode: 7, fallback: "none", koreanPack: "available" },
  });
  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "ready");
});

test("USW-M5. iOS 말 없음(1110)도 같은 다시 말하기 국면이다", () => {
  mount([iosNoSpeech]);

  tapAction("Speak");

  expect(id("speak-word-content")).toHaveAttribute("data-reason", "no-match");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
});

test("USW-M6. 네트워크 실패는 연결 안내와 Try again · Skip이다", () => {
  mount([androidNetwork]);

  tapAction("Speak");

  expect(id("speak-word-content")).toHaveAttribute("data-reason", "network");
  expect(id("speak-word-hint")).toHaveTextContent(networkText);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("speak-word-secondary")).toHaveAttribute("data-control", "skip");
});
