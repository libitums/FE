import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { EpisodeFinalCallTest } from "./episode-final.contract";
import { episodeFinalAdvanceDelayMs, episodeFinalLineMs } from "./episode-final";
import { EpisodeFinalCallScreen } from "./EpisodeFinalCallScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 통화는 이 파일의 대역입니다 — 상대 대사
// 하나, 내 차례 하나, 상대 대사 하나, 내 차례 하나. 시간으로 흐르므로 가짜 시계를 씁니다.

const callTest: EpisodeFinalCallTest = {
  format: "call",
  unitId: "tutorial-final-test",
  callerName: "유나",
  turns: [
    { kind: "line", id: "hello", text: "여보세요?", translation: "Hello?" },
    { kind: "speaking", id: "hi", sentence: "안녕", romanization: "[an.nyeong]" },
    { kind: "line", id: "favor", text: "이거 하나 사다 줄래?", translation: "Could you buy this?" },
    { kind: "speaking", id: "this", sentence: "이거 주세요", romanization: "[i.ɡʌ.ju.se.jo]" },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubSpeechHost(text: string) {
  vi.stubGlobal("NativeModules", {
    SpeechRecognitionModule: {
      getStatus: () => {},
      requestPermissions: (callback: (payload: unknown) => void) =>
        callback({
          microphone: "granted",
          speechRecognition: "granted",
          recognizerAvailable: true,
        }),
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "recognized", text, isFinal: true }),
      stop: () => {},
    },
  });
}

function renderCall() {
  vi.useFakeTimers();
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 1.",
    test: callTest,
    callerPortrait: "portrait.png",
    onFinish: vi.fn<(results: readonly AnswerResult[]) => void>(),
    onExit: vi.fn<() => void>(),
  };
  render(<EpisodeFinalCallScreen {...props} />);
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

const lineText = () => screen.getByTestId("episode-final-call-screen-line-text");

test("[EFC1] 통화 상대 · 시계 · 첫 상대 대사가 서고, 상대 대사 동안에는 말하기 카드가 없다", () => {
  renderCall();

  expect(screen.getByTestId("episode-final-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "음성 통화, 유나",
  );
  expect(screen.getByTestId("episode-final-call-screen-clock")).toHaveTextContent("0:00");
  expect(lineText()).toHaveTextContent("여보세요?");
  expect(screen.queryByTestId("episode-final-screen-speaking")).toBeNull();
});

test("[EFC2] 상대 대사가 머문 뒤 내 차례가 되면 흰 말하기 카드가 올라오고, 말풍선은 그 대사를 든다", () => {
  renderCall();

  wait(episodeFinalLineMs);

  const card = screen.getByTestId("episode-final-screen-speaking");
  expect(card).toHaveAttribute("data-tone", "call");
  expect(screen.getByTestId("episode-final-screen-sentence")).toHaveTextContent("안녕");
  expect(
    within(screen.getByTestId("episode-final-screen-action")).getByTestId("ui-lynx-button"),
  ).toHaveTextContent("Speak");
  expect(screen.getByTestId("episode-final-screen-not-now")).toBeTruthy();
  expect(lineText()).toHaveTextContent("여보세요?");
});

test("[EFC3] 말하면 판정이 서고, 잠시 뒤 카드가 걷히며 다음 상대 대사로 이어진다", () => {
  stubSpeechHost("안녕");
  renderCall();
  wait(episodeFinalLineMs);

  tapButton("episode-final-screen-action");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  wait(episodeFinalAdvanceDelayMs);

  expect(screen.queryByTestId("episode-final-screen-speaking")).toBeNull();
  expect(lineText()).toHaveTextContent("이거 하나 사다 줄래?");
});

test("[EFC4] 마지막 차례의 판정 뒤 결과를 싣고 끝낸다. Can't speak로 넘긴 차례는 싣지 않는다", () => {
  stubSpeechHost("이거 줘요");
  const props = renderCall();
  wait(episodeFinalLineMs);
  tapButton("episode-final-screen-not-now");
  wait(episodeFinalLineMs);

  tapButton("episode-final-screen-action");
  expect(props.onFinish).not.toHaveBeenCalled();
  wait(episodeFinalAdvanceDelayMs);

  expect(props.onFinish).toHaveBeenCalledWith(["incorrect"]);
});

test("[EFC5] 뒤로 tap → onExit 1회, onFinish 0회", () => {
  const props = renderCall();

  fireEvent.tap(
    within(screen.getByTestId("episode-final-call-screen-back")).getByTestId(
      "ui-lynx-round-button",
    ),
    {},
  );

  expect(props.onExit).toHaveBeenCalledTimes(1);
  expect(props.onFinish).not.toHaveBeenCalled();
});

test("[EFC6] 판정 틈에 onFinish가 바뀌면 끝낼 때 새 콜백을 부른다", () => {
  stubSpeechHost("안녕");
  vi.useFakeTimers();
  const oneTurn: EpisodeFinalCallTest = { ...callTest, turns: [callTest.turns[1]] };
  const base = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 1.",
    test: oneTurn,
    callerPortrait: "portrait.png",
    onExit: vi.fn<() => void>(),
  };
  const staleFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const freshFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const view = render(<EpisodeFinalCallScreen {...base} onFinish={staleFinish} />);

  tapButton("episode-final-screen-action");
  view.rerender(<EpisodeFinalCallScreen {...base} onFinish={freshFinish} />);
  wait(episodeFinalAdvanceDelayMs);

  expect(staleFinish).not.toHaveBeenCalled();
  expect(freshFinish).toHaveBeenCalledWith(["correct"]);
});
