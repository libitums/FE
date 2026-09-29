import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { PrologueCall } from "./episode-intro.contract";
import { PrologueCallScreen } from "./PrologueCallScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). 대본은 이 파일 안의 fixture로
// 줍니다(`prologue-call.ts`의 표를 import하지 않습니다). 대사 한 줄은 3초 머뭅니다.

afterEach(() => {
  vi.useRealTimers();
});

const call: PrologueCall = {
  callerName: "Jimin",
  lines: [
    { text: "여보세요?", translation: "Hello?" },
    { text: "이따 봐!", translation: "See you later!" },
  ],
};

function renderCall(overrides: Partial<Parameters<typeof PrologueCallScreen>[0]> = {}) {
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Episode 0.",
    call,
    callerPortrait: "portrait.png",
    onComplete: vi.fn<() => void>(),
    onBack: vi.fn<() => void>(),
    ...overrides,
  };
  render(<PrologueCallScreen {...props} />);
  return props;
}

function advance(seconds: number): void {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

test("[PC1] 머리 · 통화 상대 · 첫 대사를 그린다", () => {
  renderCall();

  expect(screen.getByTestId("prologue-call-screen-title")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("prologue-call-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "Voice call, Jimin",
  );
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
  expect(screen.getByTestId("prologue-call-screen-line-translation")).toHaveTextContent("Hello?");
  expect(screen.getByTestId("prologue-call-screen-line")).toHaveAttribute(
    "accessibility-label",
    "여보세요?, Hello?",
  );
});

test("[PC2] 시계가 1초마다 가고 대사가 3초마다 넘어간다", () => {
  vi.useFakeTimers();
  renderCall();

  advance(1);
  expect(screen.getByTestId("prologue-call-screen-clock")).toHaveTextContent("0:01");
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");

  advance(2);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("이따 봐!");
});

test("[PC3] 마지막 대사가 머문 뒤 통화 버튼 줄이 걷히고 하단에 Continue가 선다", () => {
  vi.useFakeTimers();
  const props = renderCall();
  expect(screen.queryByTestId("prologue-call-screen-complete")).not.toBeInTheDocument();

  advance(6);

  expect(screen.queryByTestId("prologue-call-screen-end")).not.toBeInTheDocument();
  expect(screen.queryByTestId("prologue-call-screen-mute")).not.toBeInTheDocument();
  const complete = screen.getByTestId("prologue-call-screen-complete");
  expect(complete).toHaveTextContent("Continue");
  expect(complete).toHaveAttribute("accessibility-traits", "button");
  // 끝나는 것만으로는 다음으로 가지 않습니다.
  expect(props.onComplete).not.toHaveBeenCalled();
});

test("[PC3b] 끝난 뒤 시계가 멈추고 마지막 대사가 남는다", () => {
  vi.useFakeTimers();
  renderCall();

  advance(6);
  advance(10);

  expect(screen.getByTestId("prologue-call-screen-clock")).toHaveTextContent("0:06");
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("이따 봐!");
});

test("[PC4] 종료 버튼 tap → 통화가 끝나 Continue가 서고, onComplete는 아직 0회", () => {
  const props = renderCall();

  const end = screen.getByTestId("prologue-call-screen-end");
  expect(end).toHaveAttribute("accessibility-label", "End call");
  fireEvent.tap(end, {});

  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
  expect(props.onComplete).not.toHaveBeenCalled();
  expect(props.onBack).not.toHaveBeenCalled();
});

test("[PC4b] Continue tap → onComplete 1회", () => {
  const props = renderCall();
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});

  fireEvent.tap(screen.getByTestId("prologue-call-screen-complete"), {});

  expect(props.onComplete).toHaveBeenCalledTimes(1);
});

test("[PC5] 뒤로 tap → onBack 1회, onEnd 0회", () => {
  const props = renderCall();

  fireEvent.tap(
    within(screen.getByTestId("prologue-call-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onComplete).not.toHaveBeenCalled();
});

test("[PC6] 음소거는 누를 때마다 켜지고 꺼지며, 이름이 상태를 말한다", () => {
  renderCall();
  const muteButton = screen.getByTestId("prologue-call-screen-mute");
  expect(muteButton).toHaveAttribute("accessibility-label", "Mute, off");
  expect(muteButton).toHaveAttribute("data-on", "false");

  fireEvent.tap(muteButton, {});
  expect(muteButton).toHaveAttribute("accessibility-label", "Mute, on");
  expect(muteButton).toHaveAttribute("data-on", "true");

  fireEvent.tap(muteButton, {});
  expect(muteButton).toHaveAttribute("accessibility-label", "Mute, off");
});

test("[PC7] 소리 크기 버튼이 판을 펼치고 접는다", () => {
  renderCall();
  expect(screen.queryByTestId("prologue-call-screen-volume-panel")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume"), {});
  expect(screen.getByTestId("prologue-call-screen-volume-panel")).toBeInTheDocument();
  expect(screen.getByTestId("prologue-call-screen-volume")).toHaveAttribute(
    "accessibility-label",
    "Volume, expanded",
  );

  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume"), {});
  expect(screen.queryByTestId("prologue-call-screen-volume-panel")).not.toBeInTheDocument();
});

test("[PC8] 판의 − · +가 크기를 한 단계씩 바꾸고 양 끝에서 멈춘다", () => {
  const { container } = render(
    <PrologueCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 0."
      call={call}
      callerPortrait="portrait.png"
      onComplete={vi.fn()}
      onBack={vi.fn()}
    />,
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume"), {});
  const level = () =>
    container.querySelector('[accessibility-label$=" of 5"]')?.getAttribute("accessibility-label");
  expect(level()).toBe("Volume 4 of 5");

  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume-up"), {});
  expect(level()).toBe("Volume 5 of 5");
  expect(screen.getByTestId("prologue-call-screen-volume-up")).toHaveAttribute(
    "accessibility-traits",
    "disabled",
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume-up"), {});
  expect(level()).toBe("Volume 5 of 5");

  for (let index = 0; index < 5; index += 1) {
    fireEvent.tap(screen.getByTestId("prologue-call-screen-volume-down"), {});
  }
  expect(level()).toBe("Volume 1 of 5");
});

test("[PC9] 음소거와 소리 크기는 통화를 끝내지 않는다", () => {
  const props = renderCall();

  fireEvent.tap(screen.getByTestId("prologue-call-screen-mute"), {});
  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume"), {});
  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume-down"), {});

  expect(props.onComplete).not.toHaveBeenCalled();
  expect(props.onBack).not.toHaveBeenCalled();
  expect(screen.queryByTestId("prologue-call-screen-complete")).not.toBeInTheDocument();
});

test("[PC11] 시계가 가도 통화 상대의 접근성 이름은 바뀌지 않는다", () => {
  vi.useFakeTimers();
  renderCall();

  advance(2);

  expect(screen.getByTestId("prologue-call-screen-clock")).toHaveTextContent("0:02");
  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "Voice call, Jimin",
  );
});

test("[ST2-E] 소리 버튼 이름이 영어다", () => {
  renderCall();

  expect(screen.getByTestId("prologue-call-screen-volume")).toHaveAttribute(
    "accessibility-label",
    "Volume",
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume"), {});
  expect(screen.getByTestId("prologue-call-screen-volume-down")).toHaveAttribute(
    "accessibility-label",
    "Volume down",
  );
  expect(screen.getByTestId("prologue-call-screen-volume-up")).toHaveAttribute(
    "accessibility-label",
    "Volume up",
  );
});

test("[ST2-M] 문구표에서 읽는다 — 통화 상대 · 종료 · 음소거 · 소리", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <PrologueCallScreen
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
        episodeLabel="Episode 0."
        call={call}
        callerPortrait="portrait.png"
        onComplete={vi.fn<() => void>()}
        onBack={vi.fn<() => void>()}
      />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("prologue-call-screen-caller")).toHaveAttribute(
    "accessibility-label",
    "⟦phoneCall.voiceCall⟧(Jimin)",
  );
  expect(screen.getByTestId("prologue-call-screen-end")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.endCall⟧",
  );
  expect(screen.getByTestId("prologue-call-screen-mute")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.mute⟧(false)",
  );
  expect(screen.getByTestId("prologue-call-screen-volume")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.volume⟧",
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-volume"), {});
  expect(screen.getByTestId("prologue-call-screen-volume")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.volumeExpanded⟧",
  );
  expect(screen.getByTestId("prologue-call-screen-volume-down")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.volumeDown⟧",
  );
  expect(screen.getByTestId("prologue-call-screen-volume-up")).toHaveAttribute(
    "accessibility-label",
    "⟦episodeIntro.call.volumeUp⟧",
  );
  fireEvent.tap(screen.getByTestId("prologue-call-screen-end"), {});
  expect(screen.getByTestId("prologue-call-screen-complete")).toHaveTextContent(
    "⟦common.continue⟧",
  );
});
