import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";
import { SpeakingScreen } from "./SpeakingScreen";
import type { SpeakingQuestion } from "./speaking";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 뼈대 모양은 `LearningShell.ui.test.tsx`가
// 보고, 여기서는 카드 안 · 아래 버튼 · 인식 결선을 봅니다. 문항은 대역입니다.
const QUESTIONS: readonly SpeakingQuestion[] = [
  { sentence: "이거 주세요", romanization: "[i.ɡʌ.ju.se.jo]" },
  { sentence: "고마워요", romanization: "[go.ma.wo.yo]" },
];

vi.mock("./speaking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./speaking")>();
  return {
    ...actual,
    speakingQuestionsForStep: (id: JourneyStepId) => (id === "introduction" ? QUESTIONS : []),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type HostOptions = {
  readonly granted?: boolean;
  /** 인식 결과 — `start`가 즉시 이 결과로 콜백합니다(멈춤을 기다리지 않는 대역). */
  readonly result?: { readonly status: string; readonly text: string };
};

// 호스트의 `SpeechRecognitionModule` 대역입니다. `lib/speech-recognition.ts`는 mock하지 않습니다.
function stubSpeechHost(options: HostOptions = {}) {
  const calls = { start: 0, stop: 0 };
  const granted = options.granted ?? true;
  vi.stubGlobal("NativeModules", {
    SpeechRecognitionModule: {
      getStatus: () => {},
      requestPermissions: (callback: (payload: unknown) => void) =>
        callback({
          microphone: granted ? "granted" : "denied",
          speechRecognition: granted ? "granted" : "denied",
          recognizerAvailable: true,
        }),
      start: (_args: unknown, callback: (payload: unknown) => void) => {
        calls.start += 1;
        if (options.result) callback({ ...options.result, isFinal: true });
      },
      stop: () => {
        calls.stop += 1;
      },
    },
  });
  return calls;
}

function renderSpeaking(
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void = () => {},
) {
  return render(<SpeakingScreen stepId="introduction" onExit={() => {}} onFinish={onFinish} />);
}

const actionLabel = () =>
  screen.queryByTestId("learning-shell-action")?.getAttribute("accessibility-label") ?? null;

function tapAction(label: string): void {
  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
}

test("[SP1] 문장 · 발음 표기 · 파형을 그리고, 판정 전에는 칠한 낱말이 없고 버튼이 말하기다", () => {
  renderSpeaking();

  const sentence = screen.getByTestId("speaking-screen-sentence");
  expect(sentence).toHaveTextContent("이거 주세요");
  expect(sentence).toHaveAttribute("accessibility-label", "이거 주세요");
  expect(sentence).toHaveAttribute("data-matched", "0");
  expect(screen.getByTestId("speaking-screen-romanization")).toHaveTextContent("[i.ɡʌ.ju.se.jo]");
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute("data-listening", "false");
  expect(actionLabel()).toBe("말하기");
});

test("[SP2] 말하기 → 듣는 중이면 파형이 주색으로 서고 버튼이 그만 말하기다 · 그만 말하기는 멈춘다", () => {
  const calls = stubSpeechHost();
  renderSpeaking();

  tapAction("말하기");

  expect(calls.start).toBe(1);
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute("data-listening", "true");
  tapAction("그만 말하기");
  expect(calls.stop).toBe(1);
});

test("[SP3] 전부 맞게 말하면 정답이고 낱말이 모두 칠해진다 — 버튼 대신 화면을 눌러 넘어간다", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  renderSpeaking();

  tapAction("말하기");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("speaking-screen-sentence")).toHaveAttribute("data-matched", "2");
  expect(screen.getByTestId("speaking-screen-hint")).toBeInTheDocument();
  expect(actionLabel()).toBeNull();

  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  expect(screen.getByTestId("speaking-screen-sentence")).toHaveTextContent("고마워요");
});

test("[SP4] 앞 낱말만 맞으면 그 낱말까지만 칠하고 오답이다", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 줘요" } });
  renderSpeaking();

  tapAction("말하기");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(screen.getByTestId("speaking-screen-sentence")).toHaveAttribute("data-matched", "1");
});

test("[SP5] 모듈이 없으면(Explorer · 테스트) 판정 없이 안내와 건너뛰기가 선다", () => {
  renderSpeaking();

  tapAction("말하기");

  expect(screen.getByTestId("speaking-screen-unavailable")).toBeInTheDocument();
  expect(screen.queryByTestId("answer-verdict")).toBeNull();
  tapAction("건너뛰기");
  expect(screen.getByTestId("speaking-screen-sentence")).toHaveTextContent("고마워요");
});

test("[SP6] 권한이 없으면 인식을 시작하지 않고 건너뛰기가 선다", () => {
  const calls = stubSpeechHost({ granted: false });
  renderSpeaking();

  tapAction("말하기");

  expect(calls.start).toBe(0);
  expect(actionLabel()).toBe("건너뛰기");
});

test("[SP7] 인식이 실패하면(recognized 아님) 건너뛰기가 선다", () => {
  stubSpeechHost({ result: { status: "recognition-failed", text: "" } });
  renderSpeaking();

  tapAction("말하기");

  expect(actionLabel()).toBe("건너뛰기");
});

test("[SP8] 끝까지 가면 결과 보기가 판정된 문항의 결과만 싣는다(건너뛴 문항은 싣지 않는다)", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  const onFinish = vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>();
  renderSpeaking(onFinish);

  tapAction("말하기");
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  // 둘째 문항은 모듈을 걷어 인식 불가로 건너뜁니다.
  vi.unstubAllGlobals();
  tapAction("말하기");
  tapAction("건너뛰기");

  expect(screen.getByTestId("speaking-screen-complete")).toHaveTextContent("문항을 모두 마쳤어요");
  tapAction("결과 보기");
  expect(onFinish).toHaveBeenCalledWith("introduction", ["correct"], 0);
});

test("[SP9] 권한 확인이 돌아오기 전에 화면을 떠나면 인식을 시작하지 않는다 — 마이크가 켜진 채 남지 않는다", () => {
  const pending: { resolve?: (payload: unknown) => void } = {};
  const calls = { start: 0 };
  vi.stubGlobal("NativeModules", {
    SpeechRecognitionModule: {
      getStatus: () => {},
      requestPermissions: (callback: (payload: unknown) => void) => {
        pending.resolve = callback;
      },
      start: () => {
        calls.start += 1;
      },
      stop: () => {},
    },
  });
  const view = renderSpeaking();

  tapAction("말하기");
  view.unmount();
  pending.resolve?.({
    microphone: "granted",
    speechRecognition: "granted",
    recognizerAvailable: true,
  });

  expect(calls.start).toBe(0);
});
