import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { CatalogFinalScreen } from "./CatalogFinalScreen";
import type { CatalogRoleplayTurn, CatalogRoleplayTurns } from "./catalog-final.contract";

// `ui` 계층: 최종 테스트 화면의 음성 — 턴이 서면 상대 줄 자동 재생 · 정답 뒤 내 줄 · 오답은 조용 ·
// 다음 턴 / 나가기에 정지 · 소리가 끝나도 진행은 그대로. 소리 모듈만 대역이고 화면과 훅은 실물입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const counterpartOne = "https://cdn/audio/u01-water/d-01.m4a";
const replyOne = "https://cdn/audio/u01-water/d-02.m4a";
const counterpartTwo = "https://cdn/audio/u01-water/d-03.m4a";

function turnOf(id: string, ko: string, accepted: string): CatalogRoleplayTurn {
  return {
    id,
    instruction: "What do you say?",
    line: { ko, roman: null, en: null },
    tiles: [
      { ko: "괜찮아요.", roman: "gwaenchanayo." },
      { ko: "아니요,", roman: "aniyo," },
    ],
    accepted: [accepted],
    replyTranslation: null,
    imageUrl: null,
  };
}

// 턴 1: 상대 C1 · 내 R1, 턴 2: 상대 C2 · 내 없음, 턴 3: 둘 다 없음.
const turns: CatalogRoleplayTurns = [
  {
    ...turnOf("RP-01", "봉투 드릴까요?", "아니요, 괜찮아요."),
    counterpartAudioSource: counterpartOne,
    replyAudioSource: replyOne,
  },
  {
    ...turnOf("RP-02", "삼천 원입니다.", "아니요, 괜찮아요."),
    counterpartAudioSource: counterpartTwo,
  },
  turnOf("RP-03", "영수증 드릴까요?", "아니요, 괜찮아요."),
];
// 모든 턴에서 둘째 타일이 문장의 앞입니다.
const correctOrder = [1, 0] as const;
const wrongOrder = [0, 1] as const;

function mount() {
  const onFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const onExit = vi.fn<() => void>();
  render(
    <CatalogFinalScreen
      insets={insets}
      ordinal={1}
      counterpartName="편의점 점원"
      turns={turns}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );
  return { onFinish, onExit };
}

const root = () => screen.getByTestId("catalog-final-screen");
const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const actionButton = () =>
  within(screen.getByTestId("catalog-final-screen-action")).getByTestId("ui-lynx-button");
const place = (tileOrder: readonly number[]) => {
  for (const tileIndex of tileOrder) {
    fireEvent.tap(chip(tileIndex), {});
  }
};
const check = (tileOrder: readonly number[]) => {
  place(tileOrder);
  fireEvent.tap(actionButton(), {});
};
const next = () => fireEvent.tap(actionButton(), {});
const tapBack = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-final-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
const order = (mock: { readonly mock: { readonly invocationCallOrder: number[] } }, at = 0) =>
  mock.mock.invocationCallOrder[at] ?? 0;

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("CatalogFinalScreen 음성", () => {
  test("UFA1. 마운트하면 첫 턴의 상대 줄을 한 번 재생한다", () => {
    mount();

    expect(playAudio).toHaveBeenCalledTimes(1);
    expect(playAudio).toHaveBeenCalledWith(counterpartOne, expect.any(Function));
  });

  test("UFA2. 정답을 확인하면 상대 줄을 멈추고 내 줄을 재생하며 판정이 같이 선다", () => {
    mount();
    const stopsBefore = stopAudio.mock.calls.length;

    check(correctOrder);

    expect(root()).toHaveAttribute("data-phase", "checked");
    expect(screen.getByTestId("catalog-final-screen-verdict")).toBeInTheDocument();
    expect(playAudio).toHaveBeenCalledTimes(2);
    expect(playAudio).toHaveBeenLastCalledWith(replyOne, expect.any(Function));
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore + 1);
    expect(order(stopAudio, stopsBefore)).toBeLessThan(order(playAudio, 1));
  });

  test("UFA3. 오답을 확인해도 소리 호출은 늘지 않는다", () => {
    mount();
    const playsBefore = playAudio.mock.calls.length;
    const stopsBefore = stopAudio.mock.calls.length;

    check(wrongOrder);

    expect(root()).toHaveAttribute("data-phase", "checked");
    expect(playAudio).toHaveBeenCalledTimes(playsBefore);
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore);
  });

  test("UFA4. 다음 턴에서는 멈춘 다음 새 상대 줄을 재생하고, 내 소리 없는 정답은 더 부르지 않는다", () => {
    mount();
    check(correctOrder);
    const playsBefore = playAudio.mock.calls.length;
    const stopsBefore = stopAudio.mock.calls.length;

    next();

    expect(root()).toHaveAttribute("data-turn-index", "1");
    expect(playAudio).toHaveBeenCalledTimes(playsBefore + 1);
    expect(playAudio).toHaveBeenLastCalledWith(counterpartTwo, expect.any(Function));
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore + 1);
    expect(order(stopAudio, stopsBefore)).toBeLessThan(order(playAudio, playsBefore));

    const playsAfterNext = playAudio.mock.calls.length;
    const stopsAfterNext = stopAudio.mock.calls.length;
    check(correctOrder);

    expect(root()).toHaveAttribute("data-phase", "checked");
    expect(playAudio).toHaveBeenCalledTimes(playsAfterNext);
    expect(stopAudio).toHaveBeenCalledTimes(stopsAfterNext);
  });

  test("UFA5. 소리가 나는 턴에서 나가기 버튼 · 시스템 뒤로는 onExit보다 먼저 멈춘다", () => {
    const first = mount();
    const stopsBefore = stopAudio.mock.calls.length;

    tapBack();

    expect(first.onExit).toHaveBeenCalledTimes(1);
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore + 1);
    expect(order(stopAudio, stopsBefore)).toBeLessThan(order(first.onExit));
    cleanup();

    playAudio.mockClear();
    stopAudio.mockClear();
    const second = mount();
    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });

    expect(handled).toBe(true);
    expect(second.onExit).toHaveBeenCalledTimes(1);
    expect(stopAudio.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(order(stopAudio)).toBeLessThan(order(second.onExit));
  });

  test("UFA6. 소리 없는 턴으로 넘어가면 멈추기만 하고, 그 턴의 정답에도 소리는 없다", () => {
    mount();
    check(correctOrder);
    next();
    check(correctOrder);
    const playsBefore = playAudio.mock.calls.length;
    const stopsBefore = stopAudio.mock.calls.length;

    next();

    expect(root()).toHaveAttribute("data-turn-index", "2");
    expect(stopAudio).toHaveBeenCalledTimes(stopsBefore + 1);
    expect(playAudio).toHaveBeenCalledTimes(playsBefore);

    const stopsAfterNext = stopAudio.mock.calls.length;
    check(correctOrder);

    expect(root()).toHaveAttribute("data-phase", "checked");
    expect(playAudio).toHaveBeenCalledTimes(playsBefore);
    expect(stopAudio).toHaveBeenCalledTimes(stopsAfterNext);
  });

  test("UFA7. 소리가 끝나거나 실패해 완료 콜백이 불려도 단계 · 턴 · 결과는 그대로다", () => {
    const { onFinish } = mount();
    const onFinished = playAudio.mock.calls[0]?.[1];

    act(() => {
      if (typeof onFinished === "function") {
        onFinished();
      }
    });

    expect(root()).toHaveAttribute("data-phase", "arranging");
    expect(root()).toHaveAttribute("data-turn-index", "0");
    expect(onFinish).toHaveBeenCalledTimes(0);
  });

  test("UFA8. 마지막 턴 See results를 연타해도 결과는 한 번만 올라간다", () => {
    const { onFinish } = mount();
    check(correctOrder);
    next();
    check(correctOrder);
    next();
    check(correctOrder);

    next();
    next();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "correct", "correct"]);
  });
});
