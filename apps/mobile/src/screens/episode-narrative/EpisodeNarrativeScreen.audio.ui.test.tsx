import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { EpisodeNarrativeScreen } from "./EpisodeNarrativeScreen";
import type { EpisodeNarrative } from "./episode-narrative";

afterEach(() => vi.unstubAllGlobals());

const audible = {
  speakerName: "Cabin crew",
  line: "곧 도착합니다.",
  translation: "Arriving soon.",
  audioSource: "announcement",
};
const silent = { speakerName: "Me", line: "현실로 돌아온다.", translation: "Back to reality." };
const advance = () => fireEvent.tap(screen.getByTestId("episode-narrative-screen-advance"), {});

function mount(beats: EpisodeNarrative["beats"] = [audible, silent]) {
  const play = vi.fn((_source: string, _done: (result: unknown) => void) => {});
  const stop = vi.fn();
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: { play, stop } });
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    label: "Before We Land",
    // 이 파일은 음원 생명주기를 검증합니다. 타이핑 상호작용은 별도 UI 테스트가 덮습니다.
    reducedMotion: true,
    narrative: { beats },
    onFinish: vi.fn(),
    onExit: vi.fn(),
  };
  return { ...render(<EpisodeNarrativeScreen {...props} />), ...props, play, stop };
}

test("장면 진입에 한 번 재생하고 재렌더·음원 완료는 대사를 넘기거나 재시작하지 않는다", () => {
  const view = mount();
  expect(view.play).toHaveBeenCalledTimes(1);
  expect(view.play).toHaveBeenCalledWith("announcement", expect.any(Function));
  view.rerender(<EpisodeNarrativeScreen {...view} />);
  act(() => view.play.mock.calls[0]![1](null));
  expect(view.play).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(audible.line);
  expect(view.onFinish).not.toHaveBeenCalled();
});

test("다음 무음 장면으로 넘기면 재생을 멈추고 늦은 완료 콜백은 영향을 주지 않는다", () => {
  const view = mount();
  const done = view.play.mock.calls[0]![1];
  advance();
  expect(view.stop).toHaveBeenCalledTimes(1);
  act(() => done(null));
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(silent.line);
  expect(view.play).toHaveBeenCalledTimes(1);
  expect(view.onFinish).not.toHaveBeenCalled();
});

test("서로 다른 장면이 같은 음원을 사용해도 각 장면에서 처음부터 재생한다", () => {
  const view = mount([audible, { ...audible, line: "다음 안내입니다." }]);
  advance();
  expect(view.stop).toHaveBeenCalledTimes(1);
  expect(view.play).toHaveBeenCalledTimes(2);
});

test.each(["exit", "finish", "unmount"] as const)("%s 시 음원을 중단한다", (action) => {
  const view = mount([audible]);
  if (action === "exit") {
    fireEvent.tap(
      within(screen.getByTestId("episode-narrative-screen-back")).getByTestId(
        "ui-lynx-round-button",
      ),
      {},
    );
    expect(view.onExit).toHaveBeenCalledTimes(1);
  } else if (action === "finish") {
    advance();
    expect(view.onFinish).toHaveBeenCalledTimes(1);
  } else view.unmount();
  expect(view.stop).toHaveBeenCalled();
});

test("음원 없는 서사는 재생·중단을 요청하지 않는다", () => {
  const view = mount([silent]);
  advance();
  view.unmount();
  expect(view.play).not.toHaveBeenCalled();
  expect(view.stop).not.toHaveBeenCalled();
});

test("네이티브 음원 모듈이 없어도 대사를 읽고 완료할 수 있다", () => {
  const view = mount([silent, audible]);
  vi.stubGlobal("NativeModules", undefined);
  advance();
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(audible.line);
  advance();
  expect(view.onFinish).toHaveBeenCalledTimes(1);
});
