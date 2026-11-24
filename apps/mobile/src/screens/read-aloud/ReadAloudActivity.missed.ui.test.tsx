import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import {
  androidNetwork,
  androidNoMatch,
  iosNoSpeech,
  recognized,
  stubSpeechHost,
} from "../../lib/speech-host.test-support";
import type { SpeechHostResult } from "../../lib/speech-host.test-support";
import { ReadAloudActivity } from "./ReadAloudActivity";
import type { ReadAloudQuestion } from "./read-aloud.contract";

// `ui` 계층: 따라 읽기에서 못 알아들음 · 네트워크 실패가 안내 + Try again(주) + Skip(보조)으로 서고, Try again이
// 같은 문장을 다시 들으며 Skip만 건너뜀 수에 드는지 본다(ADR-0179).

const card: ReadAloudQuestion = {
  sentence: "카드로 할게요.",
  romanization: null,
  translation: null,
};

const notCaughtText = "I didn't catch that. Tap the mic and try again.";
const networkText = "Couldn't connect to speech recognition. Check your connection and try again.";

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(results: readonly (SpeechHostResult | null)[]) {
  const speech = stubSpeechHost({ result: (attempt) => results[attempt] ?? null });
  const onFinish = vi.fn<Finish>();
  render(<ReadAloudActivity questions={[card]} onExit={() => {}} onFinish={onFinish} />);
  return { speech, onFinish };
}

const id = (testId: string) => screen.getByTestId(testId);

function tapAction(label: string): void {
  const action = id("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

function tapSecondary(control: string, label: string): void {
  const slot = id("read-aloud-secondary");
  expect(slot).toHaveAttribute("data-control", control);
  expect(slot).toHaveTextContent(label);
  const button = slot.querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  fireEvent.tap(button as Element, {});
}

test("URA-M1. no-match는 안내 한 번 · Try again(주) · Skip(보조) · 대기 마이크다", () => {
  const { speech } = mount([androidNoMatch]);

  tapAction("Speak");

  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "missed");
  expect(id("read-aloud-content")).toHaveAttribute("data-reason", "no-match");
  expect(id("read-aloud-hint")).toHaveTextContent(notCaughtText);
  expect(speech.announced.builtin).toEqual([notCaughtText]);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("read-aloud-secondary")).toHaveAttribute("data-control", "skip");
  expect(id("read-aloud-waves")).toHaveAttribute("data-state", "idle");
});

test("URA-M2. Try again은 같은 문장을 다시 듣고, 들으면 맞은 수 안내가 선다", () => {
  const { speech } = mount([androidNoMatch, null]);

  tapAction("Speak");
  tapAction("Try again");

  expect(speech.calls.start).toBe(2);
  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "listening");

  act(() => speech.pending[0]?.({ ...recognized("카드로 할게요"), isFinal: true }));

  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "heard");
});

test("URA-M3. 마이크를 다시 눌러도 같은 문장을 다시 듣는다", () => {
  const { speech } = mount([iosNoSpeech, null]);

  tapAction("Speak");
  fireEvent.tap(id("read-aloud-waves"), {});

  expect(speech.calls.start).toBe(2);
  expect(id("read-aloud-content")).toHaveAttribute("data-phase", "listening");
});

test("URA-M4. 못 알아들은 뒤 Skip은 건너뜀 수 1로 결과를 올린다", () => {
  const { onFinish } = mount([androidNoMatch]);

  tapAction("Speak");
  tapSecondary("skip", "Skip");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 1);
});

test("URA-M5. 네트워크 실패는 연결 안내다", () => {
  mount([androidNetwork]);

  tapAction("Speak");

  expect(id("read-aloud-content")).toHaveAttribute("data-reason", "network");
  expect(id("read-aloud-hint")).toHaveTextContent(networkText);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
});
