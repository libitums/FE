import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { ListeningActivity } from "./ListeningScreen";
import type { ListeningQuestion } from "./listening-questions";
import { questionsForStep } from "./listening-steps.test-support";
import { initialSessionOptions } from "../../lib/session-options";
import type { SessionOptions } from "../../lib/session-options";

// `ui` 계층: 듣기 화면의 대본 공개(V2-3) — 판정 전에는 대본이 없고, 정 · 오 무관하게 판정이 나면
// 보이며, 다음 문항으로 가면 다시 없습니다. 설정의 「대본 표시」를 켜면 처음부터 보입니다(V2-4).
// 소리가 없는 문항의 대본 경로는 그대로입니다(V2-5).

afterEach(() => {
  vi.unstubAllGlobals();
});

const questions = questionsForStep("ordering");
const first = questions[0];
const second = questions[1];
if (first === undefined || second === undefined) throw new Error("ordering 문항이 모자란다");

const transcriptOff: SessionOptions = { "auto-play-audio": false, "show-transcript": false };

function renderScreen(
  sessionOptions: SessionOptions,
  list: readonly ListeningQuestion[] = questions,
) {
  return render(
    <ListeningActivity
      questions={list}
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={sessionOptions}
      gemCount={0}
    />,
  );
}

const text = () => screen.queryByTestId("listening-prompt-text");
const romanization = () => screen.queryByTestId("listening-prompt-romanization");
const tapChoice = (index: number) =>
  fireEvent.tap(screen.getByTestId(`ui-lynx-option-selector-item-choice-${index}`), {});
const wrongIndexOf = (answerIndex: number) => (answerIndex === 0 ? 1 : 0);

test("[RS1] 초기 옵션 — 판정 전에는 대본(한국어 · 로마자)이 없다", () => {
  renderScreen(initialSessionOptions);

  expect(text()).not.toBeInTheDocument();
  expect(romanization()).not.toBeInTheDocument();
  expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
});

test("[RS2] 정답을 고르면 대본이 한국어와 로마자로 보인다", () => {
  renderScreen(transcriptOff);

  tapChoice(first.answerIndex);

  expect(text()).toHaveTextContent(first.prompt);
  expect(romanization()).toHaveTextContent(first.romanization);
});

test("[RS3] 오답을 골라도 대본이 보인다 — 정 · 오 무관", () => {
  renderScreen(transcriptOff);

  tapChoice(wrongIndexOf(first.answerIndex));

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(text()).toHaveTextContent(first.prompt);
  expect(romanization()).toHaveTextContent(first.romanization);
});

test("[RS4] 다음 문항으로 가면 대본이 다시 없다", () => {
  renderScreen(transcriptOff);
  tapChoice(first.answerIndex);
  expect(text()).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 3");
  expect(text()).not.toBeInTheDocument();
  expect(romanization()).not.toBeInTheDocument();

  tapChoice(second.answerIndex);
  expect(text()).toHaveTextContent(second.prompt);
});

test("[RS5] 설정에서 대본 표시를 켜면 판정 전에도 보인다", () => {
  renderScreen({ "auto-play-audio": false, "show-transcript": true });

  expect(text()).toHaveTextContent(first.prompt);
  expect(romanization()).toHaveTextContent(first.romanization);
});

test("[RS6] 소리가 없는 문항은 대본 설정과 무관하게 처음부터 대본이 선다", () => {
  const silent: ListeningQuestion = { ...first, audio: null };
  renderScreen(transcriptOff, [silent]);

  expect(screen.getByTestId("listening-silent-prompt-text")).toHaveTextContent(first.prompt);
  expect(text()).not.toBeInTheDocument();
});
