import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import type { PrologueCall } from "./episode-intro.contract";
import { PrologueCallScreen } from "./PrologueCallScreen";

const tap = (id: string) => fireEvent.tap(screen.getByTestId(`prologue-call-screen-${id}`), {});
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(native = true, lines?: PrologueCall["lines"]) {
  vi.useFakeTimers();
  const play = vi.fn((_source: string, _done: (result: unknown) => void) => {});
  const stop = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();
  vi.stubGlobal(
    "NativeModules",
    native ? { AudioPlaybackModule: { play, stop, pause, resume } } : undefined,
  );
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    episodeLabel: "Before We Land",
    callerPortrait: null,
    call: {
      callerName: "Minseo",
      lines: lines ?? [
        { text: "여보세요?", translation: "Hello?", audioSource: "first" },
        { text: "곧 만나!", translation: "See you soon!", audioSource: "second" },
      ],
    },
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };
  return { ...render(<PrologueCallScreen {...props} />), props, play, stop, pause, resume };
}

test("음원 완료를 기다려 다음 대사를 재생하고 마지막 완료 뒤 직접 Continue를 누른다", () => {
  const v = mount();
  expect(v.play).toHaveBeenLastCalledWith("first", expect.any(Function));
  advance(10000);
  expect(v.play).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
  act(() => v.play.mock.calls[0]![1](null));
  expect(v.play).toHaveBeenLastCalledWith("second", expect.any(Function));
  act(() => v.play.mock.calls[1]![1](null));
  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
  expect(v.props.onComplete).not.toHaveBeenCalled();
  tap("complete");
  expect(v.props.onComplete).toHaveBeenCalledTimes(1);
});

test("일시정지·재개는 현재 음원을 다시 시작하지 않는다", () => {
  const v = mount();
  tap("playback");
  expect(v.pause).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("prologue-call-screen-playback")).toHaveAttribute(
    "accessibility-label",
    "Resume",
  );
  advance(10000);
  tap("playback");
  expect(v.resume).toHaveBeenCalledTimes(1);
  expect(v.play).toHaveBeenCalledTimes(1);
});

test("다시 듣기는 현재 대사를 재시작하고 이전 완료 신호를 무시한다", () => {
  const v = mount();
  const oldDone = v.play.mock.calls[0]![1];
  tap("playback");
  tap("replay");
  expect(v.play).toHaveBeenCalledTimes(2);
  expect(v.play).toHaveBeenLastCalledWith("first", expect.any(Function));
  expect(screen.getByTestId("prologue-call-screen-playback")).toHaveAttribute(
    "accessibility-label",
    "Pause",
  );
  act(() => oldDone(null));
  expect(v.play).toHaveBeenCalledTimes(2);
  expect(screen.queryByTestId("prologue-call-screen-complete")).toBeNull();
});

test.each(["end", "back", "unmount"] as const)(
  "%s 시 재생을 중단하고 늦은 완료 신호를 무시한다",
  (action) => {
    const v = mount();
    const done = v.play.mock.calls[0]![1];
    if (action === "unmount") v.unmount();
    else if (action === "back") {
      fireEvent.tap(
        within(screen.getByTestId("prologue-call-screen-back")).getByTestId("ui-lynx-round-button"),
        {},
      );
      expect(v.props.onBack).toHaveBeenCalledTimes(1);
    } else tap("end");
    expect(v.stop).toHaveBeenCalled();
    act(() => done(null));
    expect(v.play).toHaveBeenCalledTimes(1);
    expect(v.props.onComplete).not.toHaveBeenCalled();
  },
);

test("음원 모듈이 없는 환경은 읽기 타이머로 진행하며 일시정지 중에는 머문다", () => {
  mount(false);
  tap("playback");
  advance(10000);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
  tap("playback");
  advance(3000);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("곧 만나!");
  advance(3000);
  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
});

test("무음에서 켠 음소거·음량 강조가 음원 재생 버튼에 남지 않는다", () => {
  mount(true, [
    { text: "잠깐만.", translation: "One moment." },
    { text: "여보세요?", translation: "Hello?", audioSource: "first" },
  ]);
  tap("mute");
  tap("volume");
  advance(3000);
  for (const id of ["playback", "replay"]) {
    const button = screen.getByTestId(`prologue-call-screen-${id}`);
    expect(button).toHaveAttribute("data-on", "false");
    expect(button).not.toHaveClass("prologue-call-screen-side-on");
  }
  tap("playback");
  expect(screen.getByTestId("prologue-call-screen-playback")).toHaveAttribute("data-on", "true");
  tap("playback");
  expect(screen.getByTestId("prologue-call-screen-playback")).toHaveAttribute("data-on", "false");
});

test("연속 무음 대사는 각각 3초 동안 유지된다", () => {
  mount(false);
  advance(2999);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("여보세요?");
  advance(1);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("곧 만나!");
  advance(2999);
  expect(screen.queryByTestId("prologue-call-screen-complete")).toBeNull();
  advance(1);
  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
});

test("음원 종료 후 이어지는 무음 대사에도 각각 3초의 읽기 시간을 준다", () => {
  const v = mount(true, [
    { text: "여보세요?", translation: "Hello?", audioSource: "first" },
    { text: "기다릴게.", translation: "I'll wait." },
    { text: "이따 봐.", translation: "See you." },
  ]);
  advance(1700);
  act(() => v.play.mock.calls[0]![1](null));
  advance(2999);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("기다릴게.");
  advance(1);
  expect(screen.getByTestId("prologue-call-screen-line-text")).toHaveTextContent("이따 봐.");
  advance(2999);
  expect(screen.queryByTestId("prologue-call-screen-complete")).toBeNull();
  advance(1);
  expect(screen.getByTestId("prologue-call-screen-complete")).toBeInTheDocument();
});
