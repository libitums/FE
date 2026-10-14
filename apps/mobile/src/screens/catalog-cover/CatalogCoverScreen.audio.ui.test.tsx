import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층: 표지 컷 화면의 음성 — 컷이 설 때 재생 · 다음 컷 / 나가기 / 언마운트에 정지 · 소리 없는 컷은 조용 ·
// 소리가 끝나도 진행은 그대로. 소리 모듈만 대역이고 화면과 훅은 실물입니다. 컷 표시 모델은 손으로 세웠습니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const sourceA = "https://cdn/audio/u01-water/pre-1.m4a";
const sourceB = "https://cdn/audio/u01-water/pre-3.m4a";

function narration(index: number, audioSource?: string): CatalogCutView {
  return {
    kind: "narration",
    index,
    text: { ko: `지문 ${index}`, en: `Narration ${index}`, roman: `jimun ${index}` },
    imageUrl: null,
    ...(audioSource === undefined ? {} : { audioSource }),
  };
}

function line(index: number, audioSource?: string): CatalogCutView {
  return {
    kind: "line",
    voice: "speech",
    index,
    speaker: { kind: "named", name: "점원" },
    text: { ko: `대사 ${index}`, en: `Line ${index}`, roman: `daesa ${index}` },
    aside: null,
    imageUrl: null,
    ...(audioSource === undefined ? {} : { audioSource }),
  };
}

// 1 소리 없음 · 2 A · 3 B · 4 소리 없음.
const mixed: readonly CatalogCutView[] = [
  narration(0),
  line(1, sourceA),
  line(2, sourceB),
  narration(3),
];
// 첫 컷부터 소리가 있는 변형.
const soundFirst: readonly CatalogCutView[] = [line(0, sourceA), line(1, sourceB), narration(2)];
const silent: readonly CatalogCutView[] = [narration(0), line(1), narration(2)];

function cutsOf(list: readonly CatalogCutView[]): CatalogCuts {
  const [first, ...rest] = list;
  if (first === undefined) {
    throw new Error("컷이 하나는 있어야 합니다");
  }
  return [first, ...rest];
}

function mount(list: readonly CatalogCutView[]) {
  const onComplete = vi.fn<() => void>();
  const onExit = vi.fn<() => void>();
  const view = render(
    <CatalogCoverScreen
      stage="prologue"
      insets={insets}
      ordinal={1}
      cuts={cutsOf(list)}
      onComplete={onComplete}
      onExit={onExit}
    />,
  );
  return { onComplete, onExit, ...view };
}

const root = () => screen.getByTestId("catalog-cover-screen");
const tapNext = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const tapLine = () =>
  fireEvent.tap(screen.getByTestId("catalog-cover-screen-line"), { eventType: "catchEvent" });
const tapBack = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(5000);
  });
// 대사를 끝까지 보인 뒤 다음 컷으로 넘깁니다.
const nextCut = () => {
  settle();
  tapNext();
};
const order = (mock: { readonly mock: { readonly invocationCallOrder: number[] } }, at = 0) =>
  mock.mock.invocationCallOrder[at] ?? 0;

beforeEach(() => {
  vi.useFakeTimers();
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("CatalogCoverScreen 음성", () => {
  test("UCA1. 첫 컷에 소리가 있으면 마운트 직후 한 번 재생하고, 없으면 재생하지 않는다", () => {
    mount(soundFirst);

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(sourceA, expect.any(Function));

    cleanup();
    playAudio.mockClear();
    mount(mixed);

    expect(playAudio).toHaveBeenCalledTimes(0);
  });

  test("UCA2. 쓰는 중 진행 버튼으로 대사를 완성하거나 대사 상자를 탭해도 소리 호출은 늘지 않고 컷도 그대로다", () => {
    mount(soundFirst);
    const playsBefore = playAudio.mock.calls.length;
    const stopsBefore = stopAudio.mock.calls.length;

    tapNext();
    expect(root()).toHaveAttribute("data-cut-index", "0");
    tapLine();
    expect(root()).toHaveAttribute("data-cut-index", "0");

    expect(playAudio).toHaveBeenCalledTimes(playsBefore);
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore);
  });

  test("UCA3. 컷이 넘어가면 앞 소리를 멈추고 새 소리를 재생하며, 소리 없는 컷에서는 멈추기만 한다", () => {
    mount(mixed);
    expect(playAudio).toHaveBeenCalledTimes(0);

    nextCut();
    expect(root()).toHaveAttribute("data-cut-index", "1");
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenLastCalledWith(sourceA, expect.any(Function));

    const stopsBeforeSecond = stopAudio.mock.calls.length;
    nextCut();
    expect(root()).toHaveAttribute("data-cut-index", "2");
    expect(playAudio).toHaveBeenCalledTimes(2);
    expect(playAudio).toHaveBeenLastCalledWith(sourceB, expect.any(Function));
    expect(stopAudio).toHaveBeenCalledTimes(stopsBeforeSecond + 1);
    expect(order(stopAudio, stopsBeforeSecond)).toBeLessThan(order(playAudio, 1));

    const stopsBeforeThird = stopAudio.mock.calls.length;
    nextCut();
    expect(root()).toHaveAttribute("data-cut-index", "3");
    expect(stopAudio).toHaveBeenCalledTimes(stopsBeforeThird + 1);
    expect(playAudio).toHaveBeenCalledTimes(2);
  });

  test("UCA4. 소리가 나는 컷에서 나가기 버튼 · 시스템 뒤로는 onExit보다 먼저 멈춘다", () => {
    const first = mount(soundFirst);
    expect(playAudio).toHaveBeenCalledTimes(1);
    const stopsBefore = stopAudio.mock.calls.length;

    tapBack();

    expect(first.onExit).toHaveBeenCalledTimes(1);
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore + 1);
    expect(order(stopAudio, stopsBefore)).toBeLessThan(order(first.onExit));
    cleanup();

    playAudio.mockClear();
    stopAudio.mockClear();
    const second = mount(soundFirst);
    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });

    expect(handled).toBe(true);
    expect(second.onExit).toHaveBeenCalledTimes(1);
    expect(stopAudio.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(order(stopAudio)).toBeLessThan(order(second.onExit));
  });

  test("UCA5. 소리 없는 컷만으로 끝까지 진행 · 완료 · 나가기를 해도 소리 모듈을 부르지 않는다", () => {
    const first = mount(silent);

    nextCut();
    nextCut();
    nextCut();
    expect(first.onComplete).toHaveBeenCalledTimes(1);
    cleanup();

    const second = mount(silent);
    tapBack();
    expect(second.onExit).toHaveBeenCalledTimes(1);

    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(stopAudio).toHaveBeenCalledTimes(0);
  });

  test("UCA6. 소리가 나는 컷에서 언마운트하면 멈춘다", () => {
    const { unmount } = mount(soundFirst);
    const stopsBefore = stopAudio.mock.calls.length;

    unmount();

    expect(stopAudio.mock.calls.length).toBeGreaterThan(stopsBefore);
  });

  test("UCA7. 소리가 끝나거나 실패해 완료 콜백이 불려도 컷은 넘어가지 않고 완료도 오르지 않는다", () => {
    const { onComplete } = mount(soundFirst);
    const onFinished = playAudio.mock.calls[0]?.[1];

    act(() => {
      if (typeof onFinished === "function") {
        onFinished();
      }
    });
    settle();

    expect(root()).toHaveAttribute("data-cut-index", "0");
    expect(onComplete).toHaveBeenCalledTimes(0);
  });
});
