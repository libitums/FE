import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";
import { SpeakingScreen } from "./SpeakingScreen";
import type { SpeakingQuestion } from "./speaking";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

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

// ⟨개정⟩ `onFinish`의 셋째 인자(건너뛴 문항 수)를 받습니다 — 화면 계약이 이미 셋을
// 넘기고 있고, 둘만 받는 타입으로 두면 셋을 세는 대역(`UI-K6`)을 여기에 넘길 수
// 없습니다(인자가 더 많은 함수는 인자가 적은 타입에 대입되지 않습니다).
function renderSpeaking(
  onFinish: (
    id: JourneyStepId,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void = () => {},
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

// ---------------------------------------------------------------- 건너뛰기 (D7 나)
//
// `LearningShell`은 액션을 **한 쌍**만 받으므로(`actionLabel`·`onAction`) `ready`에서
// `말하기`와 `건너뛰기`가 동시에 서려면 칸이 하나 모자랍니다. 계약이 고른 자리는
// `workspace` 슬롯이고(spec §2.8.3 ⓑ), 그것을 담는 것이 `learning-shell-scroll`입니다 —
// 최종 테스트의 `Can't speak`가 자기 패널 안에 둘을 그리는 것과 같은 형태입니다.
//
// ⚠ **`speaking-screen-skip`은 이 계층이 고른 앵커입니다.** 계약도 디자인도 이 버튼의
// `data-testid`를 적지 않았고(design §2.5는 *"클래스 이름은 구현이 정하되"* 까지만
// 적습니다), 같은 화면의 다른 자리가 쓰는 `speaking-screen-*` 접두사와 감싸는 상자에
// testid를 두는 선례(`episode-final-not-now`)를 따랐습니다.
const skipSlot = () => screen.queryByTestId("speaking-screen-skip");

function tapSkip(): void {
  const slot = screen.getByTestId("speaking-screen-skip");
  const button = slot.querySelector('[data-testid="ui-lynx-button"]');
  expect(button).not.toBeNull();
  fireEvent.tap(button as Element, {});
}

test("[SP1] 문장 · 발음 표기 · 파형을 그리고, 판정 전에는 칠한 낱말이 없고 버튼이 Speak다", () => {
  renderSpeaking();

  const sentence = screen.getByTestId("speaking-screen-sentence");
  expect(sentence).toHaveTextContent("이거 주세요");
  expect(sentence).toHaveAttribute("accessibility-label", "이거 주세요");
  expect(sentence).toHaveAttribute("data-matched", "0");
  expect(screen.getByTestId("speaking-screen-romanization")).toHaveTextContent("[i.ɡʌ.ju.se.jo]");
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute("data-listening", "false");
  expect(actionLabel()).toBe("Speak");
});

test("[SP2] 말하기 → 듣는 중이면 파형이 주색으로 서고 버튼이 Stop speaking이다 · Stop speaking은 멈춘다", () => {
  const calls = stubSpeechHost();
  renderSpeaking();

  tapAction("Speak");

  expect(calls.start).toBe(1);
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute("data-listening", "true");
  tapAction("Stop speaking");
  expect(calls.stop).toBe(1);
});

test("[SP3] 전부 맞게 말하면 정답이고 낱말이 모두 칠해진다 — 버튼 대신 화면을 눌러 넘어간다", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  renderSpeaking();

  tapAction("Speak");

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

  tapAction("Speak");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(screen.getByTestId("speaking-screen-sentence")).toHaveAttribute("data-matched", "1");
});

test("[SP5] 모듈이 없으면(Explorer · 테스트) 판정 없이 안내와 건너뛰기가 선다", () => {
  renderSpeaking();

  tapAction("Speak");

  expect(screen.getByTestId("speaking-screen-unavailable")).toBeInTheDocument();
  expect(screen.queryByTestId("answer-verdict")).toBeNull();
  tapAction("Skip");
  expect(screen.getByTestId("speaking-screen-sentence")).toHaveTextContent("고마워요");
});

test("[SP6] 권한이 없으면 인식을 시작하지 않고 건너뛰기가 선다", () => {
  const calls = stubSpeechHost({ granted: false });
  renderSpeaking();

  tapAction("Speak");

  expect(calls.start).toBe(0);
  expect(actionLabel()).toBe("Skip");
});

test("[SP7] 인식이 실패하면(recognized 아님) 건너뛰기가 선다", () => {
  stubSpeechHost({ result: { status: "recognition-failed", text: "" } });
  renderSpeaking();

  tapAction("Speak");

  expect(actionLabel()).toBe("Skip");
});

test("[SP8] 끝까지 가면 결과 보기가 판정된 문항의 결과만 싣는다(건너뛴 문항은 싣지 않는다)", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  const onFinish = vi.fn<(id: JourneyStepId, results: readonly AnswerResult[]) => void>();
  renderSpeaking(onFinish);

  tapAction("Speak");
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  // 둘째 문항은 모듈을 걷어 인식 불가로 건너뜁니다.
  vi.unstubAllGlobals();
  tapAction("Speak");
  tapAction("Skip");

  expect(screen.getByTestId("speaking-screen-complete")).toHaveTextContent("All questions done");
  tapAction("See results");
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

  tapAction("Speak");
  view.unmount();
  pending.resolve?.({
    microphone: "granted",
    speechRecognition: "granted",
    recognizerAvailable: true,
  });

  expect(calls.start).toBe(0);
});

// ---------------------------------------------------------------- UI-K1~K6 (D7 나)
//
// **스킵 둘은 이름만 같고 서로 무관합니다**(spec §2.8). 여기서 보는 것은 (나) —
// **문항 하나**를 건너뛰는 것이고, 말하기가 「소리를 내야 한다」는 조작 원시를 가진
// 유일한 학습형이라 있는 자리입니다. 표지의 스킵(가)은 유닛 하나를 건너뛰는 전혀 다른
// 사건이고 이 파일이 보지 않습니다.
//
// 오늘까지 이 화면의 건너뛰기는 `unavailable`(기기가 못 들음)일 때만 섰습니다. D7이
// 그 한정을 풀되 **`ready` 하나로만** 풉니다 — 국면별 판정은 spec §2.8.2c의 표입니다.

test("[UI-K1] ready에서 건너뛰기가 선다 — 주 버튼 말하기와 함께다", () => {
  renderSpeaking();

  expect(actionLabel()).toBe("Speak");
  const slot = skipSlot();
  expect(slot).toBeInTheDocument();

  // 자리는 `workspace` 슬롯입니다 — 카드 아래 · 주 버튼 위이고, DOM 순서가 곧
  // 낭독 순서입니다(design §2.5).
  const workspace = screen.getByTestId("learning-shell-scroll");
  expect(within(workspace).getByTestId("speaking-screen-skip")).toBeInTheDocument();

  // 시각 스펙은 `outline`입니다 — `subtle`은 학습 껍데기 배경 위에서 면 대비 1.05:1로
  // 사라집니다(design §2.5). 선례(`Can't speak`의 `subtle`)를 그대로 옮기면 안 보입니다.
  const button = (slot as Element).querySelector('[data-testid="ui-lynx-button"]');
  expect(button).toHaveAttribute("accessibility-label", "Skip");
  expect(button).toHaveAttribute("data-variant", "outline");
});

test("[UI-K2] 건너뛰면 판정 없이 다음 문항으로 간다", () => {
  renderSpeaking();

  tapSkip();

  expect(screen.getByTestId("speaking-screen-sentence")).toHaveTextContent("고마워요");
  // 판정 배지가 뜨지 않습니다 — 건너뛴 문항은 잰 적이 없습니다.
  expect(screen.queryByTestId("answer-verdict")).toBeNull();
  expect(screen.queryByTestId("speaking-screen-hint")).toBeNull();
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute("data-listening", "false");
  // 다음 문항도 `ready`이므로 건너뛰기가 다시 섭니다.
  expect(skipSlot()).toBeInTheDocument();
});

// UI-K3 — **회귀 파수꾼입니다.** 오늘도 참이고 red가 없는 것이 이 케이스의 성질입니다.
// 기기가 못 듣는 것과 사용자가 안 하는 것은 **다른 사건**이라(spec §2.8.4), 전자의
// 문구와 버튼이 그대로 남아 있어야 합니다. 여기가 빨개지면 두 갈래가 합쳐진 것이고,
// 그러면 「기기 탓이 학습자 탓이 된다」가 조용히 참이 됩니다.
test("[UI-K3] unavailable 국면의 문구와 주 버튼은 그대로다", () => {
  renderSpeaking();

  tapAction("Speak");

  expect(screen.getByTestId("speaking-screen-unavailable")).toHaveTextContent(
    "Speech recognition isn't available right now. Skip to the next sentence.",
  );
  expect(actionLabel()).toBe("Skip");
  // 같은 낱말의 버튼이 둘 서지 않습니다 — 주 버튼이 이미 그 일을 합니다(design §2.6).
  expect(skipSlot()).toBeNull();
});

// A1을 계약이 닫은 자리입니다(spec §2.8.2c). 「언제나」는 `unavailable` 한정을 푸는
// 뜻이지 국면 전수를 뜻하지 않습니다 — 듣는 중에 건너뛰면 `그만 말하기`(판정으로 가고
// 오답일 수 있다)와 `건너뛰기`(`correct`다)가 **결과가 반대인 채로 나란히** 서고, 둘 다
// 되돌릴 수 없습니다.
test("[UI-K4] 말하기를 누르면(listening) 건너뛰기가 사라진다", () => {
  stubSpeechHost();
  renderSpeaking();

  expect(skipSlot()).toBeInTheDocument();

  tapAction("Speak");

  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute("data-listening", "true");
  expect(skipSlot()).toBeNull();
});

test("[UI-K5] 판정 뒤와 완료 국면에도 건너뛰기가 서지 않는다", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  renderSpeaking();

  expect(skipSlot()).toBeInTheDocument();

  tapAction("Speak");
  // 판정 뒤에는 `.learning-shell-advance`가 화면을 덮어 눌리지 않습니다 — 보이지만 안
  // 눌리는 버튼을 두지 않습니다(design §2.6).
  expect(screen.getByTestId("answer-verdict")).toBeInTheDocument();
  expect(skipSlot()).toBeNull();

  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  tapAction("Speak");
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  // 완료 — 건너뛸 문항이 없습니다.
  expect(screen.getByTestId("speaking-screen-complete")).toBeInTheDocument();
  expect(actionLabel()).toBe("See results");
  expect(skipSlot()).toBeNull();
});

// 엣지 — 건너뛴 문항이 **어떻게 실리는가**의 화면 쪽 관찰입니다. 결과에는 `correct`로
// 실리고(사용자 발화: *"맞은거로 처리한다"*), 건너뛴 **수**는 따로 실립니다 —
// `results`에서 뽑을 수 없기 때문입니다(맞힌 문항과 구별되지 않습니다). 그 수가 결과
// 화면까지 가야 「통과에는 세고 만점에는 안 센다」(D8)가 섭니다.
test("[UI-K6] 건너뛴 문항이 correct로 실리고 건너뛴 수가 함께 올라간다", () => {
  const onFinish =
    vi.fn<(id: JourneyStepId, results: readonly AnswerResult[], skippedCount: number) => void>();
  renderSpeaking(onFinish);

  tapSkip();
  tapSkip();

  expect(screen.getByTestId("speaking-screen-complete")).toBeInTheDocument();
  tapAction("See results");

  expect(onFinish).toHaveBeenCalledWith("introduction", ["correct", "correct"], 2);
});

// ---------------------------------------------------------------- 영어 렌더 · 문구표 (LA4)

test("[LA4-E] 지시문 · 듣는 중 이름 · 판정 뒤 안내가 영어다", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  renderSpeaking();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "Read the sentence out loud.",
  );
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute(
    "accessibility-label",
    "Listening",
  );
  tapAction("Speak");
  expect(screen.getByTestId("speaking-screen-hint")).toHaveTextContent(
    "Tap the screen to continue",
  );
});

// 아래 마킹 행은 한 국면씩 서서 읽습니다 — 어느 낱말이 하드코딩인지 국면마다 갈립니다.
function renderSpeakingMarked(): ReturnType<typeof render> {
  return render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SpeakingScreen stepId="introduction" onExit={() => {}} onFinish={() => {}} />
    </UiCopyContext.Provider>,
  );
}

test("[LA4-M] 문구표를 주입하면 대기 국면의 지시문 · 말하기 · 건너뛰기 · 나가기가 표의 경로로 나온다", () => {
  renderSpeakingMarked();

  expect(screen.getByTestId("learning-shell-instruction")).toHaveTextContent(
    "⟦speaking.instruction⟧",
  );
  expect(actionLabel()).toBe("⟦speaking.speak⟧");
  const skipButton = screen
    .getByTestId("speaking-screen-skip")
    .querySelector('[data-testid="ui-lynx-button"]');
  expect(skipButton).toHaveAttribute("accessibility-label", "⟦common.skip⟧");
  expect(screen.getByTestId("learning-shell-exit")).toHaveAttribute(
    "accessibility-label",
    "⟦learningShell.exitLesson⟧",
  );
});

test("[LA4-M] 문구표를 주입하고 말하기를 누르면 듣는 중 이름 · 그만 말하기가 표의 경로로 나온다", () => {
  stubSpeechHost();
  renderSpeakingMarked();

  tapAction("⟦speaking.speak⟧");

  expect(actionLabel()).toBe("⟦speaking.stopSpeaking⟧");
  expect(screen.getByTestId("speaking-screen-waves")).toHaveAttribute(
    "accessibility-label",
    "⟦common.listening⟧",
  );
});

test("[LA4-M] 문구표를 주입하고 판정이 나면 안내 문구 · 넘김 층이 표의 경로로 나온다", () => {
  stubSpeechHost({ result: { status: "recognized", text: "이거 주세요" } });
  renderSpeakingMarked();

  tapAction("⟦speaking.speak⟧");

  expect(screen.getByTestId("speaking-screen-hint")).toHaveTextContent("⟦speaking.tapToContinue⟧");
  expect(screen.getByTestId("learning-shell-advance")).toHaveAttribute(
    "accessibility-label",
    "⟦common.continue⟧",
  );
});

test("[LA4-M] 문구표를 주입하고 인식이 안 되면 안내 문구 · 건너뛰기가 표의 경로로 나온다", () => {
  renderSpeakingMarked();

  tapAction("⟦speaking.speak⟧");

  expect(screen.getByTestId("speaking-screen-unavailable")).toHaveTextContent(
    "⟦speaking.recognitionUnavailable⟧",
  );
  expect(actionLabel()).toBe("⟦common.skip⟧");
});

test("[LA4-M] 문구표를 주입하고 문항을 마치면 완료 문구 · 마치기가 표의 경로로 나온다", () => {
  renderSpeakingMarked();

  tapAction("⟦speaking.speak⟧");
  tapAction("⟦common.skip⟧");
  tapAction("⟦speaking.speak⟧");
  tapAction("⟦common.skip⟧");

  expect(screen.getByTestId("speaking-screen-complete")).toHaveTextContent(
    "⟦common.allQuestionsDone⟧",
  );
  expect(actionLabel()).toBe("⟦common.seeResults⟧");
});
