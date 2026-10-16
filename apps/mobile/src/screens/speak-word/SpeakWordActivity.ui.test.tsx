import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import {
  audioFailed,
  dictationOff,
  recognized,
  stubSpeechHost,
} from "../../lib/speech-host.test-support";
import type { SpeechHostOptions } from "../../lib/speech-host.test-support";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import type { LessonPosition } from "../learning/activity-finish";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 낱말 말하기 활동 — 그림 로딩 · 실패 · 뜻 줄 · 말하기 · 판정 배지 · 정답 상자 · 자동 넘김 · 건너뜀 ·
// 잠금 · 완료 · 넘김을 실제 컴포넌트로 본다. 문항은 손으로 세웠다(매핑은 unit이 진다).

const cardQuestion: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};
const passport: SpeakWordQuestion = {
  pictureUrl: "https://cdn/passport.jpg",
  meaning: "passport",
  answers: ["여권"],
  romanization: null,
};

const recognitionUnavailableText =
  "Speech recognition isn't available right now. Skip to the next word.";

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(questions: readonly SpeakWordQuestion[], lesson?: LessonPosition) {
  const onFinish = vi.fn<Finish>();
  render(
    <SpeakWordActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
      lesson={lesson}
    />,
  );
  return { onFinish };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const hintText = () => maybe("speak-word-hint")?.textContent ?? "";

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

const loadPicture = (): void => {
  fireEvent(id("speak-word-picture-image"), new window.Event("bindEvent:load"));
};

function host(options: SpeechHostOptions = {}) {
  return stubSpeechHost(options);
}

test("USW1. 첫 화면은 빈 틀 · 뜻 줄 · 보조 Skip만 서고 Speak가 없으며, 그림이 서면 Speak와 대기 마이크가 선다", () => {
  host();
  mount([cardQuestion, passport]);

  expect(id("speak-word-picture")).toHaveAttribute("data-loadState", "loading");
  expect(id("speak-word-picture-frame")).toHaveAttribute("accessibility-label", "Picture, loading");
  expect(id("speak-word-meaning")).toHaveTextContent("card");
  expect(id("speak-word-meaning")).not.toHaveAttribute("accessibility-element", "true");
  expect(maybe("learning-shell-action")).not.toBeInTheDocument();
  expect(id("speak-word-secondary")).toHaveAttribute("data-control", "skip");
  expect(id("speak-word-secondary")).toHaveTextContent("Skip");
  expect(id("speak-word-waves")).toHaveAttribute("data-state", "off");
  expect(id("learning-shell-instruction")).toHaveTextContent("Say the word for the picture.");
  expect(id("learning-shell-form")).toHaveTextContent("Speaking");

  loadPicture();

  expect(id("speak-word-picture-frame")).toHaveAttribute("accessibility-label", "Picture: card");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Speak");
  expect(id("speak-word-waves")).toHaveAttribute("data-state", "idle");
});

test("USW1b. 문항의 지시문이 있으면 기본 지시문 대신 선다", () => {
  host();
  mount([{ ...cardQuestion, instruction: "Say what you see." }]);

  expect(id("learning-shell-instruction")).toHaveTextContent("Say what you see.");
});

test("USW2. 정답이면 듣는 중에는 낭독이 없고, 판정 뒤 정답 배지 · 정답 상자 · 안내 · 낭독이 서며 넘김으로 다음 문항이 된다", () => {
  const speech = host();
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");

  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Stop speaking");
  expect(id("speak-word-waves")).toHaveAttribute("data-state", "listening");
  expect(speech.announced.builtin).toEqual([]);

  act(() => speech.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

  expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(speech.announced.builtin).toEqual(["Result, correct"]);
  expect(id("speak-word-reveal")).toHaveTextContent("Answer: 카드 · kadeu");
  expect(hintText()).toBe("Tap the screen to continue");
  expect(id("learning-shell-advance")).toHaveAttribute("accessibility-label", "Continue");
  expect(maybe("learning-shell-action")).not.toBeInTheDocument();

  fireEvent.tap(id("learning-shell-advance"), {});

  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("speak-word-picture")).toHaveAttribute("data-loadState", "loading");
  expect(maybe("answer-verdict")).not.toBeInTheDocument();
});

test("USW2b. 판정 2.5초 뒤 스스로 다음 문항으로 넘어간다", () => {
  vi.useFakeTimers();
  host({ result: () => recognized("카드") });
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");
  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "0");

  act(() => {
    vi.advanceTimersByTime(2500);
  });

  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "1");
});

test("USW3. 오답이면 오답 배지와 정답 상자가 서고 재시도 버튼도 들은 글자도 없다", () => {
  const speech = host({ result: () => recognized("카트") });
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");

  expect(id("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(speech.announced.builtin).toEqual(["Result, incorrect"]);
  expect(id("speak-word-reveal")).toHaveTextContent("Answer: 카드 · kadeu");
  expect(maybe("speak-word-secondary")).not.toBeInTheDocument();
  expect(id("learning-shell").textContent).not.toContain("카트");
  expect(id("learning-shell").textContent).not.toContain("Try again");
});

test("USW4. 권한 거부는 안내 한 번과 Skip만 서고 다음 문항도 곧장 불가이며, 완료 카드 뒤 건너뜀 수를 올린다", () => {
  const speech = host({ microphone: "denied", speechRecognition: "denied" });
  const { onFinish } = mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");

  expect(hintText()).toBe(recognitionUnavailableText);
  expect(speech.announced.builtin).toEqual([recognitionUnavailableText]);
  expect(id("speak-word-content")).toHaveAttribute("data-reason", "blocked");
  expect(maybe("speak-word-secondary")).not.toBeInTheDocument();

  tapAction("Skip");

  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "unavailable");
  expect(id("speak-word-picture")).toBeInTheDocument();
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Skip");
  expect(speech.calls.request).toBe(1);

  tapAction("Skip");

  expect(id("speak-word-complete")).toBeInTheDocument();
  expect(speech.announced.completion).toEqual(["All questions done, See results"]);
  expect(onFinish).toHaveBeenCalledTimes(0);

  tapAction("See results");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 2);
});

test("USW5a. 그림이 실패하면 뜻 글자와 안내 글자가 서고 뜻 줄은 없으며 한 번 알리고 말할 수 있다", () => {
  const speech = host();
  mount([cardQuestion]);

  fireEvent(id("speak-word-picture-image"), new window.Event("bindEvent:error"));

  expect(id("speak-word-picture")).toHaveAttribute("data-loadState", "failed");
  expect(id("speak-word-picture-fallback")).toHaveTextContent("card");
  expect(id("speak-word-picture-caption")).toHaveTextContent("Picture unavailable");
  expect(id("speak-word-picture-frame")).toHaveAttribute(
    "accessibility-label",
    "Picture unavailable. Meaning: card",
  );
  expect(speech.announced.builtin).toEqual(["Picture unavailable. Meaning: card"]);
  expect(maybe("speak-word-meaning")).not.toBeInTheDocument();
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Speak");
});

test("USW5b. 6000ms 안에 그림이 끝나지 않으면 같은 실패 상태가 된다", () => {
  vi.useFakeTimers();
  host();
  mount([cardQuestion]);

  act(() => {
    vi.advanceTimersByTime(6000);
  });

  expect(id("speak-word-picture")).toHaveAttribute("data-loadState", "failed");
  expect(id("speak-word-picture-caption")).toHaveTextContent("Picture unavailable");
  expect(maybe("speak-word-meaning")).not.toBeInTheDocument();
});

test("USW6. 준비 국면의 Skip은 결과에 싣지 않고 건너뜀 수에 든다", () => {
  host({ result: () => recognized("카드") });
  const { onFinish } = mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");
  fireEvent.tap(id("learning-shell-advance"), {});
  tapSecondary("skip", "Skip");

  expect(id("speak-word-complete")).toBeInTheDocument();
  tapAction("See results");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct"], 1);
});

test("USW7a. 레슨 중간 활동은 판정 뒤 넘김이 완료 카드 없이 결과를 한 번 올린다", () => {
  host({ result: () => recognized("카트") });
  const { onFinish } = mount([cardQuestion], { offset: 0, total: 5, last: false });
  loadPicture();

  tapAction("Speak");
  fireEvent.tap(id("learning-shell-advance"), {});

  expect(maybe("speak-word-complete")).not.toBeInTheDocument();
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["incorrect"], 0);
});

test("USW7b. 레슨 중간 활동에서 불가 Skip이 마지막 문항이면 그 탭이 곧바로 결과를 올린다", () => {
  host({ microphone: "denied" });
  const { onFinish } = mount([cardQuestion], { offset: 2, total: 5, last: false });
  loadPicture();

  tapAction("Speak");
  tapAction("Skip");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 1);
});

test("USW7c. 카운터가 레슨 오프셋을 더한다", () => {
  host();
  mount([cardQuestion], { offset: 7, total: 12, last: true });

  expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 8 / 12");
});

test("USW8a. 받아쓰기 꺼짐은 지시문이 바뀌고 Skip과 Try again이 서며 Try again은 다시 듣는다", () => {
  const speech = host({ result: () => dictationOff });
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");

  expect(id("learning-shell-instruction")).toHaveTextContent("Siri or Dictation is off");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Skip");
  expect(hintText()).toBe("");

  tapSecondary("retry", "Try again");

  expect(speech.calls.start).toBe(2);
});

test("USW8b. 일반 인식 실패는 안내와 Skip만 서고 잠기지 않아 다음 문항은 준비 국면이다", () => {
  host({ result: () => audioFailed });
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");
  expect(id("speak-word-content")).toHaveAttribute("data-reason", "failed");
  tapAction("Skip");

  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "ready");
});

test("USW9. 문구는 모두 문구표에서 온다", () => {
  stubSpeechHost({ result: () => recognized("카드") });
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SpeakWordActivity
        questions={[cardQuestion]}
        gemCount={0}
        onExit={() => {}}
        onFinish={() => {}}
      />
    </UiCopyContext.Provider>,
  );

  expect(id("learning-shell-instruction")).toHaveTextContent("⟦speakWord.instruction⟧");
  expect(id("speak-word-picture-frame")).toHaveAttribute(
    "accessibility-label",
    "⟦wordChoicePicture.loading⟧",
  );
  loadPicture();
  expect(id("speak-word-picture-frame")).toHaveAttribute(
    "accessibility-label",
    "⟦wordChoicePicture.picture⟧(card)",
  );
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "⟦speaking.speak⟧");

  fireEvent.tap(id("learning-shell-action"), {});

  expect(id("speak-word-reveal")).toHaveTextContent("⟦typing.answerReveal⟧(카드 · kadeu)");
  expect(hintText()).toBe("⟦speaking.tapToContinue⟧");
});
