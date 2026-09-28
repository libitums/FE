import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { EpisodeFinalVisualNovelTest } from "./episode-final.contract";
import { episodeFinalAdvanceDelayMs } from "./episode-final";
import { EpisodeFinalScreen } from "./EpisodeFinalScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 문항은 이 파일의 대역입니다 — 낱말
// 고르기 하나, 말하기 하나. 판정 뒤에는 누를 것 없이 잠시 뒤 넘어가므로 가짜 시계를 씁니다.

const finalTest: EpisodeFinalVisualNovelTest = {
  format: "visual-novel",
  unitId: "tutorial-final-test",
  questions: [
    {
      kind: "word-choice",
      id: "find",
      speakerName: "나",
      before: "이 화장품 찾아",
      after: ".",
      translation: "Please help me find this cosmetic product.",
      options: ["오세요", "주세요", "있어요"],
      answerIndex: 1,
    },
    { kind: "speaking", id: "this", sentence: "이거 주세요", romanization: "[i.ɡʌ.ju.se.jo]" },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// 호스트의 `SpeechRecognitionModule` 대역입니다 — 말하기 학습형의 UI 테스트와 같은 모양입니다.
function stubSpeechHost(result?: { readonly status: string; readonly text: string }) {
  const calls = { start: 0, stop: 0 };
  vi.stubGlobal("NativeModules", {
    SpeechRecognitionModule: {
      getStatus: () => {},
      requestPermissions: (callback: (payload: unknown) => void) =>
        callback({
          microphone: "granted",
          speechRecognition: "granted",
          recognizerAvailable: true,
        }),
      start: (_args: unknown, callback: (payload: unknown) => void) => {
        calls.start += 1;
        if (result) callback({ ...result, isFinal: true });
      },
      stop: () => {
        calls.stop += 1;
      },
    },
  });
  return calls;
}

function renderFinal() {
  vi.useFakeTimers();
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 0.",
    test: finalTest,
    onFinish: vi.fn<(results: readonly AnswerResult[]) => void>(),
    onExit: vi.fn<() => void>(),
  };
  render(<EpisodeFinalScreen {...props} />);
  return props;
}

function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function tapButton(testId: string): void {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
}

const dialogLine = () =>
  within(screen.getByTestId("episode-final-screen-prompt")).getByTestId(
    "ui-lynx-visual-novel-dialog-line",
  );

function optionStates(): readonly (string | null)[] {
  return [0, 1, 2].map((index) =>
    screen.getByTestId(`episode-final-screen-option-${index}`).getAttribute("data-state"),
  );
}

// 낱말 고르기를 고르고 넘어갈 때까지 기다립니다.
function solveWordChoice(optionIndex = 1): void {
  fireEvent.tap(screen.getByTestId(`episode-final-screen-option-${optionIndex}`), {});
  wait(episodeFinalAdvanceDelayMs);
}

test("[EFS1] 머리와 첫 문항이 서고, 문장은 서사의 대화 패널에 말하는 사람과 번역과 함께 선다", () => {
  renderFinal();

  expect(screen.getByTestId("episode-final-screen-title")).toHaveTextContent("Episode 0.");
  const prompt = screen.getByTestId("episode-final-screen-prompt");
  expect(within(prompt).getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("나");
  expect(dialogLine()).toHaveTextContent("이 화장품 찾아_ _ _.");
  expect(within(prompt).getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
    "Please help me find this cosmetic product.",
  );
  expect(within(prompt).getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "accessibility-label",
    "나: 이 화장품 찾아 빈칸 . Please help me find this cosmetic product.",
  );
  expect(optionStates()).toEqual(["idle", "idle", "idle"]);
  expect(screen.queryByTestId("answer-verdict")).toBeNull();
});

test("[EFS2] 정답을 고르면 판정 배지가 서고 빈칸이 채워지며, Next 없이 잠시 뒤 다음 문항으로 간다", () => {
  renderFinal();

  fireEvent.tap(screen.getByTestId("episode-final-screen-option-1"), {});

  expect(optionStates()).toEqual(["idle", "correct", "idle"]);
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(dialogLine()).toHaveTextContent("이 화장품 찾아주세요.");
  expect(screen.queryByText("Next")).toBeNull();

  wait(episodeFinalAdvanceDelayMs - 1);
  expect(screen.getByTestId("episode-final-screen-word-choice")).toBeTruthy();
  wait(1);
  expect(screen.getByTestId("episode-final-screen-speaking")).toBeTruthy();
});

test("[EFS3] 틀리게 고르면 고른 보기가 incorrect, 정답 보기가 correct로 서고 빈칸은 정답으로 채워진다", () => {
  renderFinal();

  fireEvent.tap(screen.getByTestId("episode-final-screen-option-2"), {});
  expect(optionStates()).toEqual(["idle", "correct", "incorrect"]);
  expect(screen.getByTestId("episode-final-screen-option-2")).toHaveAttribute(
    "accessibility-label",
    "있어요, 고른 답, 오답",
  );
  expect(dialogLine()).toHaveTextContent("이 화장품 찾아주세요.");

  fireEvent.tap(screen.getByTestId("episode-final-screen-option-1"), {});
  expect(optionStates()).toEqual(["idle", "correct", "incorrect"]);
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
});

test("[EFS4] 말하기 전에는 Can't speak와 Speak가 서고, 말하면 칠한 뒤 버튼이 걷힌다", () => {
  const calls = stubSpeechHost({ status: "recognized", text: "이거 주세요" });
  renderFinal();
  solveWordChoice();

  expect(screen.getByTestId("episode-final-screen-sentence")).toHaveTextContent("이거 주세요");
  expect(
    within(screen.getByTestId("episode-final-screen-not-now")).getByTestId("ui-lynx-button"),
  ).toHaveTextContent("Can't speak");
  expect(
    within(screen.getByTestId("episode-final-screen-action")).getByTestId("ui-lynx-button"),
  ).toHaveTextContent("Speak");

  tapButton("episode-final-screen-action");

  expect(calls.start).toBe(1);
  expect(screen.getByTestId("episode-final-screen-sentence")).toHaveAttribute("data-matched", "2");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(screen.queryByTestId("episode-final-screen-action")).toBeNull();
  expect(screen.queryByTestId("episode-final-screen-not-now")).toBeNull();
});

test("[EFS5] 마지막 문항의 판정 뒤 잠시 뒤에 결과를 싣고 onFinish를 부른다", () => {
  stubSpeechHost({ status: "recognized", text: "이거 줘요" });
  const props = renderFinal();
  solveWordChoice(2);
  tapButton("episode-final-screen-action");

  expect(screen.getByTestId("episode-final-screen-sentence")).toHaveAttribute("data-matched", "1");
  expect(props.onFinish).not.toHaveBeenCalled();
  wait(episodeFinalAdvanceDelayMs);

  expect(props.onFinish).toHaveBeenCalledWith(["incorrect", "incorrect"]);
});

test("[EFS5b] 판정 틈에 onFinish가 바뀌면 넘길 때 새 콜백을 부른다", () => {
  vi.useFakeTimers();
  const oneQuestion: EpisodeFinalVisualNovelTest = {
    ...finalTest,
    questions: [finalTest.questions[0]],
  };
  const base = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 0.",
    test: oneQuestion,
    onExit: vi.fn<() => void>(),
  };
  const staleFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const freshFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const view = render(<EpisodeFinalScreen {...base} onFinish={staleFinish} />);

  fireEvent.tap(screen.getByTestId("episode-final-screen-option-1"), {});
  view.rerender(<EpisodeFinalScreen {...base} onFinish={freshFinish} />);
  wait(episodeFinalAdvanceDelayMs);

  expect(staleFinish).not.toHaveBeenCalled();
  expect(freshFinish).toHaveBeenCalledWith(["correct"]);
});

test("[EFS6] Can't speak는 판정 없이 곧장 넘어가고, 그 문항은 결과에 싣지 않는다", () => {
  const props = renderFinal();
  solveWordChoice();

  tapButton("episode-final-screen-not-now");

  expect(props.onFinish).toHaveBeenCalledWith(["correct"]);
});

test("[EFS7] 인식을 쓸 수 없으면 Skip으로 넘어가고, 그 문항은 결과에 싣지 않는다", () => {
  const props = renderFinal();
  solveWordChoice();

  // 대역이 없으면 호스트 모듈이 없는 것입니다(Explorer · 테스트).
  tapButton("episode-final-screen-action");
  expect(
    within(screen.getByTestId("episode-final-screen-action")).getByTestId("ui-lynx-button"),
  ).toHaveTextContent("Skip");
  tapButton("episode-final-screen-action");

  expect(props.onFinish).toHaveBeenCalledWith(["correct"]);
});

test("[EFS8] 뒤로 tap → onExit 1회, onFinish 0회", () => {
  const props = renderFinal();

  fireEvent.tap(
    within(screen.getByTestId("episode-final-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(props.onExit).toHaveBeenCalledTimes(1);
  expect(props.onFinish).not.toHaveBeenCalled();
});
