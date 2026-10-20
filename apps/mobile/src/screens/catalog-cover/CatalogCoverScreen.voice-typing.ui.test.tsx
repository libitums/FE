import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층: 컷 뷰의 voiceSyncMs가 첫 렌더부터 타자기 간격이 되는지 봅니다. 간격은 가짜 타이머를 흘려
// 보이는 글자 수로 판정합니다. 소리 모듈만 대역이고 화면과 타자기는 실물입니다. 뷰는 손으로 세웠습니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const KO_1 = "어서 오세요.";
const KO_2 = "사장님, 손님 오셨어요!";
const KO_3 = "물 주세요, 감사합니다.";
const SOURCE = "https://cdn/audio/u01-water/pre-3.m4a";

function line(index: number, ko: string, voiceSyncMs?: number): CatalogCutView {
  return {
    kind: "line",
    voice: "speech",
    index,
    speaker: { kind: "named", name: "점원" },
    text: { ko, en: `Line ${index}`, roman: `daesa ${index}` },
    aside: null,
    imageUrl: null,
    audioSource: SOURCE,
    ...(voiceSyncMs === undefined ? {} : { voiceSyncMs }),
  };
}

function cutsOf(list: readonly CatalogCutView[]): CatalogCuts {
  const [first, ...rest] = list;
  if (first === undefined) {
    throw new Error("컷이 하나는 있어야 합니다");
  }
  return [first, ...rest];
}

function mount(list: readonly CatalogCutView[], motion?: "reduced") {
  const element = (
    <CatalogCoverScreen
      stage="prologue"
      insets={insets}
      ordinal={1}
      cuts={cutsOf(list)}
      onComplete={vi.fn<() => void>()}
      onExit={vi.fn<() => void>()}
    />
  );
  render(
    motion === undefined ? element : <MotionProvider motion={motion}>{element}</MotionProvider>,
  );
}

const root = () => screen.getByTestId("catalog-cover-screen");
const dialog = () => screen.getByTestId("ui-lynx-visual-novel-dialog");
// 비어 있을 때 대사 줄이 채우는 보이지 않는 자리 글자는 지웁니다.
const shown = () =>
  (screen.getByTestId("ui-lynx-visual-novel-dialog-line").textContent ?? "").replaceAll(
    "\u200b",
    "",
  );
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const tapNext = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const tapLine = () =>
  fireEvent.tap(screen.getByTestId("catalog-cover-screen-line"), { eventType: "catchEvent" });
// 다음 컷으로: 쓰는 중이면 첫 탭이 완성이므로 끝까지 흘린 뒤 한 번 더 탭합니다.
const nextCut = () => {
  advance(5000);
  tapNext();
};

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

describe("CatalogCoverScreen 음성 길이에 맞춘 타이핑", () => {
  test("VT1. voiceSyncMs 1763이면 첫 렌더부터 251ms 간격이다(35ms 간격으로 시작하지 않는다)", () => {
    mount([line(0, KO_1, 1763)]);

    expect(dialog()).toHaveAttribute("data-status", "revealing");
    advance(35);
    expect(shown()).toBe("");
    advance(215);
    expect(shown()).toBe("");
    advance(1);
    expect(shown()).toBe("어");
    advance(251 * 6);
    expect(shown()).toBe(KO_1);
    expect(dialog()).toHaveAttribute("data-status", "ready");
  });

  test("VT2. 컷을 넘기면 그 컷의 길이를 따르고, 길이가 없는 컷은 앞 컷의 값을 끌고 가지 않는다", () => {
    mount([line(0, KO_1, 1763), line(1, KO_2, 2027), line(2, KO_3)]);

    nextCut();
    expect(root()).toHaveAttribute("data-cut-index", "1");
    advance(154);
    expect(shown()).toBe("");
    advance(1);
    expect(shown()).toBe("사");

    nextCut();
    expect(root()).toHaveAttribute("data-cut-index", "2");
    advance(34);
    expect(shown()).toBe("");
    advance(1);
    expect(shown()).toBe("물");
  });

  test("VT3. voiceSyncMs가 없는 컷은 35ms에 첫 글자가 나온다(소리가 있어도)", () => {
    mount([line(0, KO_1)]);

    advance(34);
    expect(shown()).toBe("");
    advance(1);
    expect(shown()).toBe("어");
  });

  test("VT4. 안전 범위: 큰 길이는 300ms, 작은 길이는 35ms다", () => {
    mount([line(0, KO_1, 2299), line(1, KO_2, 10)]);

    advance(299);
    expect(shown()).toBe("");
    advance(1);
    expect(shown()).toBe("어");

    nextCut();
    advance(34);
    expect(shown()).toBe("");
    advance(1);
    expect(shown()).toBe("사");
  });

  test("VT5. 동작 줄이기에서는 길이와 무관하게 처음부터 전체이고 Next 한 번에 넘어간다", () => {
    mount([line(0, KO_1, 1763), line(1, KO_2, 2027)], "reduced");

    expect(dialog()).toHaveAttribute("data-reveal", "instant");
    expect(dialog()).toHaveAttribute("data-status", "ready");
    expect(shown()).toBe(KO_1);
    tapNext();
    expect(root()).toHaveAttribute("data-cut-index", "1");
  });

  test("VT6. 쓰는 중 첫 탭은 대사만 완성하고(소리 그대로), 둘째 탭이 넘긴다", () => {
    mount([line(0, KO_1, 1763), line(1, KO_2, 2027)]);
    expect(playAudio).toHaveBeenCalledTimes(1);

    advance(20);
    expect(dialog()).toHaveAttribute("data-status", "revealing");
    tapNext();
    expect(root()).toHaveAttribute("data-cut-index", "0");
    expect(shown()).toBe(KO_1);
    expect(dialog()).toHaveAttribute("data-status", "ready");
    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(stopAudio).not.toHaveBeenCalled();

    tapNext();
    expect(root()).toHaveAttribute("data-cut-index", "1");
  });

  test("VT6b. 대사 상자 토글은 쓰던 진행을 되감지 않는다", () => {
    mount([line(0, KO_1, 1763)]);

    advance(251);
    expect(shown()).toBe("어");
    tapLine();
    advance(251);
    expect(shown()).toBe("어서");
    expect(dialog()).toHaveAttribute("data-status", "revealing");
  });
});
