import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

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
import type { ItemAnswerReport } from "../../lib/item-answer";
import type { SpeakWordQuestion } from "./speak-word.contract";
import { expectCompleteScene, expectQuestionScene } from "../learning/complete-scene.test-support";

// `ui` 계층: 낱말 말하기 활동 — 그림 로딩 · 실패 · 뜻 줄 · 공용 마이크 · 결과 시트(perfect · close · 오답) · 다시 말하기
// 한 번 · Continue(자동 넘김 없음) · 건너뜀 · 잠금 · 완료를 실제 컴포넌트로 본다(시안 S1 ~ S4). 문항은 손으로 세웠다.

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
  "Speech recognition isn't available right now. Tap Skip to continue.";

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

test("USW1. 첫 화면은 빈 틀 · 보조 Skip만 서고(정답 로마자는 판정 전에 보이지 않음) Speak가 없으며, 그림이 서면 Speak와 대기 마이크가 선다", () => {
  host();
  mount([cardQuestion, passport]);

  expect(id("speak-word-picture")).toHaveAttribute("data-loadState", "loading");
  expect(id("speak-word-picture-frame")).toHaveAttribute("accessibility-label", "Picture, loading");
  expect(maybe("speak-word-romanization")).not.toBeInTheDocument();
  expect(maybe("speak-word-meaning")).not.toBeInTheDocument();
  expect(maybe("learning-shell-action")).not.toBeInTheDocument();
  expect(id("speak-word-secondary")).toHaveAttribute("data-control", "skip");
  expect(id("speak-word-secondary")).toHaveTextContent("Skip");
  expect(id("speak-word-mic")).toHaveAttribute("data-state", "disabled");
  expect(id("learning-shell-instruction")).toHaveTextContent("Say the word for the picture.");
  expect(id("learning-shell-form")).toHaveTextContent("Speaking");

  loadPicture();

  expect(id("speak-word-picture-frame")).toHaveAttribute("accessibility-label", "Picture: card");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Speak");
  expect(id("speak-word-mic")).toHaveAttribute("data-state", "idle");
});

test("USW1b. 문항의 지시문이 있으면 기본 지시문 대신 선다", () => {
  host();
  mount([{ ...cardQuestion, instruction: "Say what you see." }]);

  expect(id("learning-shell-instruction")).toHaveTextContent("Say what you see.");
});

test("USW2. 정답이면 듣는 중에는 낭독이 없고, 판정 뒤 초록 결과 시트(Perfect!) · 정답 상자 · 낭독이 서며 Continue로 다음 문항이 된다", () => {
  const speech = host();
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");

  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Stop speaking");
  expect(id("speak-word-mic")).toHaveAttribute("data-state", "listening");
  expect(id("speak-word-mic-status")).toHaveTextContent("Listening…");
  expect(speech.announced.builtin).toEqual([]);

  tapAction("Stop speaking");
  expect(id("speak-word-mic")).toHaveAttribute("data-state", "checking");
  expect(id("speak-word-mic-status")).toHaveTextContent("Checking…");

  act(() => speech.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

  expect(id("speak-word-result")).toHaveAttribute("data-grade", "perfect");
  expect(id("speak-word-result-title")).toHaveTextContent("Perfect!");
  expect(maybe("answer-verdict")).not.toBeInTheDocument();
  expect(speech.announced.builtin).toEqual(["Result, correct"]);
  expect(id("speak-word-reveal")).toHaveTextContent("카드");
  expect(id("speak-word-reveal")).toHaveTextContent("kadeu");
  expect(maybe("speak-word-result-heard")).not.toBeInTheDocument();
  expect(hintText()).toBe("");
  expect(maybe("learning-shell-advance")).not.toBeInTheDocument();

  tapAction("Continue");

  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "1");
  expect(id("speak-word-picture")).toHaveAttribute("data-loadState", "loading");
  expect(maybe("speak-word-result")).not.toBeInTheDocument();
});

test("USW2b. 판정 뒤 시간이 지나도 스스로 넘어가지 않는다 — 오답을 읽을 시간(시안 S2)", () => {
  vi.useFakeTimers();
  host({ result: () => recognized("카드") });
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");
  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "0");

  act(() => {
    vi.advanceTimersByTime(10000);
  });

  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "0");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Continue");
});

test("USW3. 오답이면 You said ↔ Answer(다른 음절 표시)와 Try again · Next가 서고, 두 번째 오답이면 Continue 하나다", () => {
  const speech = host({ result: () => recognized("카페") });
  mount([cardQuestion, passport]);
  loadPicture();

  tapAction("Speak");

  expect(id("speak-word-result")).toHaveAttribute("data-grade", "incorrect");
  expect(id("speak-word-result-title")).toHaveTextContent("Not quite");
  expect(speech.announced.builtin).toEqual([
    "Result, incorrect, You said: 카페, Answer: 카드 · kadeu",
  ]);
  expect(id("speak-word-result-heard")).toHaveTextContent("카페");
  expect(id("speak-word-result-heard").querySelector('[data-differs="true"]')).toHaveTextContent(
    "페",
  );
  expect(id("speak-word-result-answer").querySelector('[data-differs="true"]')).toHaveTextContent(
    "드",
  );
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("speak-word-secondary")).toHaveAttribute("data-control", "next");

  tapAction("Try again");

  expect(speech.calls.start).toBe(2);
  expect(id("speak-word-content")).toHaveAttribute("data-phase", "heard");
  expect(id("speak-word-content")).toHaveAttribute("data-questionIndex", "0");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Continue");
  expect(maybe("speak-word-secondary")).not.toBeInTheDocument();
});

test("USW3b. close는 맞음(Correct · Almost perfect) · Model answer · 들은 말이 선다", () => {
  const speech = host({ result: () => recognized("카드로 할께여") });
  mount([{ ...cardQuestion, answers: ["카드로 할게요."], romanization: "kadeuro halgeyo." }]);
  loadPicture();

  tapAction("Speak");

  expect(id("speak-word-result")).toHaveAttribute("data-grade", "close");
  expect(id("speak-word-result-title")).toHaveTextContent("Correct");
  expect(id("speak-word-result-chip")).toHaveTextContent("Almost perfect");
  expect(id("speak-word-result-answer-label")).toHaveTextContent("Model answer");
  expect(id("speak-word-result-heard")).toHaveTextContent("카드로 할께여");
  expect(speech.announced.builtin).toEqual([
    "Result, correct, Model answer: 카드로 할게요. · kadeuro halgeyo.",
  ]);
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Continue");
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
  expect(onFinish).toHaveBeenCalledWith([], 2, [0, 1]);
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
  tapAction("Continue");
  tapSecondary("skip", "Skip");

  expect(id("speak-word-complete")).toBeInTheDocument();
  tapAction("See results");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct"], 1, [1]);
});

test("USW7a. 레슨 중간 활동은 판정 뒤 Next가 완료 카드 없이 결과를 한 번 올린다", () => {
  host({ result: () => recognized("카트") });
  const { onFinish } = mount([cardQuestion], { offset: 0, total: 5, last: false });
  loadPicture();

  tapAction("Speak");
  tapSecondary("next", "Next");

  expect(maybe("speak-word-complete")).not.toBeInTheDocument();
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["incorrect"], 0, []);
});

test("USW7b. 레슨 중간 활동에서 불가 Skip이 마지막 문항이면 그 탭이 곧바로 결과를 올린다", () => {
  host({ microphone: "denied" });
  const { onFinish } = mount([cardQuestion], { offset: 2, total: 5, last: false });
  loadPicture();

  tapAction("Speak");
  tapAction("Skip");

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith([], 1, [0]);
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
      <SpeakWordActivity questions={[cardQuestion]} onExit={() => {}} onFinish={() => {}} />
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

  expect(id("speak-word-result-title")).toHaveTextContent("⟦speakWord.result.perfect⟧");
  expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "⟦common.continue⟧");
});

// ACS-SW — 완료 장면: 무대가 완료 장면이고 내용 상자 안은 완료 카드 하나다. 문항 장면은 그대로다.
test("[ACS-SW] 완료 때 무대가 완료 장면이고 내용 상자의 유일한 자식이 완료 카드이며 문항 장면에는 표시가 없다", () => {
  host({ result: () => recognized("카드") });
  mount([cardQuestion, passport]);
  loadPicture();
  expectQuestionScene();

  tapAction("Speak");
  tapAction("Continue");
  tapSecondary("skip", "Skip");

  expectCompleteScene("speak-word-content", "speak-word-complete");
});

// SW1 — 판정 전 카드는 그림뿐이다. 정답 로마자를 먼저 보이면 그림을 보고 떠올리는 문항이 읽는 문항이 된다(사용자 결정
// 2026-11-23 — 2026-10-22의 「카드 = 그림 + 정답 로마자」를 바꿈). 파형은 카드 밖 작업 영역에 서고, 판정은 셸이 말한다.
test("SW1. 판정 전 카드는 그림뿐이고 로마자 · 뜻 줄이 없으며 파형은 무대 밖에 선다", () => {
  host();
  mount([cardQuestion]);
  loadPicture();

  const stage = id("learning-shell-stage");
  expect(within(stage).getByTestId("speak-word-picture")).toBeInTheDocument();
  expect(within(stage).queryByTestId("speak-word-romanization")).not.toBeInTheDocument();
  expect(within(stage).queryByTestId("speak-word-meaning")).not.toBeInTheDocument();
  expect(within(stage).queryByTestId("speak-word-mic")).not.toBeInTheDocument();
  expect(id("speak-word-mic")).toBeInTheDocument();
});

test("SW1. 로마자가 없는 문항은 로마자 줄이 없다", () => {
  host();
  mount([passport]);

  expect(maybe("speak-word-romanization")).not.toBeInTheDocument();
  expect(maybe("speak-word-meaning")).not.toBeInTheDocument();
});

test("SW1. 판정 뒤 결과 시트는 무대(카드) 밖 작업 영역에 서고 셸 배지는 없다", () => {
  host({ result: () => recognized("카트") });
  mount([cardQuestion]);
  loadPicture();

  tapAction("Speak");

  expect(maybe("speak-word-romanization")).not.toBeInTheDocument();
  const stage = id("learning-shell-stage");
  expect(within(stage).queryByTestId("speak-word-result")).not.toBeInTheDocument();
  expect(id("speak-word-reveal")).toHaveTextContent("카드");
  expect(maybe("answer-verdict")).not.toBeInTheDocument();
});

test("EV5. 판정은 문항당 한 번 보고되고 outcome · density가 실린다", () => {
  host({ result: () => recognized("카드") });
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <SpeakWordActivity
      questions={[cardQuestion, passport]}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  loadPicture();

  tapAction("Speak");

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "correct",
    density: "regular",
    grade: "perfect",
    // 인식기가 결과를 올렸으므로 진단이 실립니다 — 이 대역은 팩 · 되돌아감 키가 없는 호스트(iOS 모양)입니다.
    speech: { errorCode: 0, fallback: "none", koreanPack: "unknown" },
  });
});

test("EV5. Skip은 skipped로 보고된다", () => {
  host();
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <SpeakWordActivity
      questions={[cardQuestion, passport]}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  loadPicture();

  tapSecondary("skip", "Skip");

  expect(onItemAnswered).toHaveBeenCalledTimes(1);
  expect(onItemAnswered).toHaveBeenCalledWith({
    questionIndex: 0,
    outcome: "skipped",
    density: "regular",
    // 말할 수 있는 국면에서 직접 누른 건너뜀입니다(UA3). 말하기 결과 글자는 싣지 않습니다.
    skipReason: "user",
  });
});

test("EV5. 쓸 수 없는 국면(권한 거부)에서 Skip은 unavailable:<reason>으로 보고된다", () => {
  host({ microphone: "denied", speechRecognition: "denied" });
  const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
  render(
    <SpeakWordActivity
      questions={[cardQuestion, passport]}
      onExit={() => {}}
      onFinish={() => {}}
      onItemAnswered={onItemAnswered}
    />,
  );
  loadPicture();
  tapAction("Speak");
  tapAction("Skip");
  expect(onItemAnswered).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: "skipped", skipReason: "unavailable:blocked" }),
  );
});
