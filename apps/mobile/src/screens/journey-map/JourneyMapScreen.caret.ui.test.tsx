import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import {
  mapScreen,
  scrollSelector,
  stubHost,
  twoStepsDone,
  type Rect,
} from "./JourneyMapScreen.test-support";

// `ui` 계층: 말풍선이 잰 가로 중심으로 꼬리를 치우치고(SH1 ~ SH3), 동작 줄이기에서 스크롤이 즉시가
// 되는지(SH4)만 봅니다. 호스트의 질의는 대역이고 잰 값은 이 파일이 정합니다. 치우침 식은 unit이 지고,
// 꼬리가 화면에서 실제로 어디에 서는지는 기기(e2e)에서만 닫힙니다.
//
// 값: 화면 가로 중심 = 0 + 402 / 2 = 201. ordering 유닛 중심 = 70 + 100 / 2 = 120 → 치우침 −81.
// greeting 유닛 중심 = 230 + 100 / 2 = 280 → 치우침 +79.

const screenRect: Rect = { top: 0, height: 900, left: 0, width: 402 };

const rects = (withHorizontal: boolean): Record<string, Rect> => ({
  [scrollSelector]: { top: 60, height: 800 },
  "#journey-map-screen": screenRect,
  "#journey-step-node-ordering": withHorizontal
    ? { top: 700, height: 124, left: 70, width: 100 }
    : { top: 700, height: 124 },
  "#journey-step-node-greeting": { top: 200, height: 124, left: 230, width: 100 },
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const tapStep = (id: string, y: number): void => {
  act(() => {
    fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${id}`), { detail: { y } });
  });
};
const caretOffset = (): string | null | undefined =>
  screen.queryByTestId("step-sheet-caret")?.getAttribute("data-caret-offset");
const sheetTop = (): string =>
  screen.getByTestId("step-sheet-panel").parentElement?.getAttribute("style") ?? "";

describe("말풍선 꼬리의 가로 치우침", () => {
  test("SH1. 유닛 중심이 화면 중심보다 왼쪽이면 꼬리가 그 차이만큼 왼쪽으로 치우친다", () => {
    stubHost({ rects: rects(true) });
    render(mapScreen({ progress: twoStepsDone }));

    tapStep("ordering", 750);

    expect(caretOffset()).toBe("-81");
  });

  test("SH2. 가로 값이 없는 잰 값에서도 측정은 실패가 아니고 꼬리는 가운데, 세로 자리는 기존 그대로다", () => {
    const host = stubHost({ rects: rects(false) });
    render(mapScreen({ progress: twoStepsDone }));

    tapStep("ordering", 750);

    expect(caretOffset()).toBe("0");
    // 끝(900 − 68 − 16 − 250 = 566)에 걸려 가두는 값입니다 — `JourneyMapScreen.anchor.ui.test.tsx`와 같습니다.
    expect(sheetTop()).toContain("566px");
    expect(host.scrollTos()).toContainEqual({
      selector: scrollSelector,
      method: "scrollTo",
      params: { offset: 290, smooth: true },
    });
    expect(
      host.scrollIntoViews().filter((call) => call.selector === "#journey-step-node-ordering"),
    ).toEqual([]);
  });

  test("SH3. 닫고 다른 스텝을 열면 답이 오기 전에는 꼬리가 가운데로 돌아가 있다가 답이 오면 새 치우침이 된다", () => {
    const host = stubHost({ rects: rects(true) });
    render(mapScreen({ progress: twoStepsDone }));

    tapStep("ordering", 750);
    expect(caretOffset()).toBe("-81");

    act(() => {
      fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
    });
    host.defer = () => true;
    tapStep("greeting", 250);

    expect(screen.queryByTestId("step-sheet-panel")).not.toBeNull();
    expect(caretOffset()).toBe("0");

    host.flush();
    expect(caretOffset()).toBe("79");
  });

  test("SH4. 동작 줄이기에서는 말풍선의 스크롤이 즉시(smooth 거짓)이고, 측정이 실패하면 behavior none으로 맡긴다", () => {
    const measured = stubHost({ rects: rects(true) });
    render(
      <MotionProvider motion="reduced">{mapScreen({ progress: twoStepsDone })}</MotionProvider>,
    );

    tapStep("ordering", 750);

    expect(measured.scrollTos()).toEqual([
      { selector: scrollSelector, method: "scrollTo", params: { offset: 290, smooth: false } },
    ]);

    cleanup();
    vi.restoreAllMocks();

    const failing = stubHost({ measurable: false });
    render(
      <MotionProvider motion="reduced">{mapScreen({ progress: twoStepsDone })}</MotionProvider>,
    );
    tapStep("ordering", 750);

    expect(failing.scrollIntoViews()).toContainEqual({
      selector: "#journey-step-node-ordering",
      method: "scrollIntoView",
      params: { scrollIntoViewOptions: { block: "center", behavior: "none" } },
    });
  });
});
