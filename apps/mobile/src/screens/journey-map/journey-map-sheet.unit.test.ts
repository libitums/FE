import { describe, expect, it } from "vitest";

import {
  initialStepSheetState,
  stepSheetPlacement,
  stepSheetProgress,
  stepSheetReducer,
  stepSheetTop,
  type StepSheetState,
} from "./journey-map-sheet";
import { uiCopyEn } from "../../lib/ui-copy-en";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("stepSheetProgress", () => {
  it("낱말 둘과 막대가 같은 수에서 나온다", () => {
    expect(stepSheetProgress(1, 4, uiCopyEn)).toEqual({
      countLabel: "1/4 activities",
      percentLabel: "25%",
      fillPercent: 25,
    });
  });

  it("아직 아무것도 안 끝냈으면 0%이고 막대도 0이다", () => {
    expect(stepSheetProgress(0, 3, uiCopyEn)).toEqual({
      countLabel: "0/3 activities",
      percentLabel: "0%",
      fillPercent: 0,
    });
  });

  it("다 끝냈으면 100%다", () => {
    expect(stepSheetProgress(3, 3, uiCopyEn)).toEqual({
      countLabel: "3/3 activities",
      percentLabel: "100%",
      fillPercent: 100,
    });
  });

  // 라벨은 반올림하고 막대는 반올림하지 않습니다 — 낱말은 자리를 아끼고 막대는
  // 자리를 아낄 이유가 없습니다. 둘이 같은 수에서 나온다는 것은 그대로입니다.
  it("나누어떨어지지 않으면 라벨만 반올림한다", () => {
    expect(stepSheetProgress(1, 3, uiCopyEn)).toEqual({
      countLabel: "1/3 activities",
      percentLabel: "33%",
      fillPercent: (1 / 3) * 100,
    });
  });

  it("활동이 하나뿐이면 단수형이다 — RL5", () => {
    expect(stepSheetProgress(1, 1, uiCopyEn).countLabel).toBe("1/1 activity");
  });

  it("전체 활동 수가 0이면 던진다", () => {
    expect(() => stepSheetProgress(0, 0, uiCopyEn)).toThrow(/1 이상의 정수/);
  });

  it("끝낸 수가 전체보다 많으면 던진다", () => {
    expect(() => stepSheetProgress(4, 3, uiCopyEn)).toThrow(/전체보다 많습니다/);
  });

  it("끝낸 수가 음수면 던진다", () => {
    expect(() => stepSheetProgress(-1, 3, uiCopyEn)).toThrow(/0 이상의 정수/);
  });
});

// 높은 화면입니다 — 가운데에 선 유닛 아래로 말풍선이 넉넉히 들어갑니다.
const tallScreen = { scrollViewTop: 60, scrollViewHeight: 800, screenTop: 0, screenHeight: 900 };

describe("stepSheetPlacement", () => {
  it("유닛 중심을 스크롤 상자 가운데로 옮기는 목적지를 낸다", () => {
    // 가운데는 60 + 400 = 460이고 유닛 중심은 700 + 50 = 750입니다.
    const placement = stepSheetPlacement({ ...tallScreen, unitTop: 700, scrollTop: 120 });

    expect(placement.targetScrollTop).toBe(120 + (750 - 460));
  });

  it("말풍선 자리는 탭 좌표가 아니라 유닛의 아래 모서리에서 나온다", () => {
    const placement = stepSheetPlacement({ ...tallScreen, unitTop: 700, scrollTop: 120 });

    expect(placement.anchorY).toBe(800);
  });

  it("화면 상자가 LynxView 꼭대기에서 떨어져 있으면 그만큼 뺀다", () => {
    const placement = stepSheetPlacement({
      ...tallScreen,
      screenTop: 40,
      unitTop: 700,
      scrollTop: 0,
    });

    expect(placement.anchorY).toBe(760);
  });

  it("유닛이 가운데보다 위에 있고 더 내릴 스크롤이 없으면 목적지는 0이다", () => {
    const placement = stepSheetPlacement({ ...tallScreen, unitTop: 100, scrollTop: 0 });

    expect(placement.targetScrollTop).toBe(0);
  });

  it("화면이 낮으면 말풍선이 들어갈 만큼 유닛을 가운데보다 위에 세운다", () => {
    // 끝은 600 − 68 − 16 − 250 = 266이고, 유닛 중심이 설 자리는 266 − 8 − 50 = 208입니다
    // (가운데 300보다 위).
    const placement = stepSheetPlacement({
      scrollViewTop: 0,
      scrollViewHeight: 600,
      screenTop: 0,
      screenHeight: 600,
      unitTop: 400,
      scrollTop: 0,
    });

    expect(placement.anchorLimit).toBe(266);
    expect(placement.targetScrollTop).toBe(450 - 208);
  });
});

describe("stepSheetTop", () => {
  const open: StepSheetState = {
    openStepId: "ordering",
    anchorY: 800,
    anchorScrollTop: 120,
    anchorLimit: null,
  };

  it("유닛 아래 모서리에서 간격만큼 띄운다", () => {
    expect(stepSheetTop(open, 120)).toBe(808);
  });

  it("스크롤이 내려간 만큼 말풍선이 올라가 유닛에 붙어 있다", () => {
    expect(stepSheetTop(open, 410)).toBe(808 - 290);
  });

  it("끝을 알면 그 아래로 내려가지 않는다", () => {
    expect(stepSheetTop({ ...open, anchorLimit: 566 }, 120)).toBe(566);
  });

  it("스크롤이 끝나 유닛이 제자리에 서면 말풍선이 끝 안에 들어온다", () => {
    const placement = stepSheetPlacement({ ...tallScreen, unitTop: 700, scrollTop: 120 });
    const state: StepSheetState = {
      openStepId: "ordering",
      anchorY: placement.anchorY,
      anchorScrollTop: 120,
      anchorLimit: placement.anchorLimit,
    };

    // 유닛 아래 모서리는 가운데 460 + 반지름 50 = 510에 섭니다.
    expect(stepSheetTop(state, placement.targetScrollTop)).toBe(518);
  });
});

describe("stepSheetReducer — anchorStep", () => {
  it("열린 스텝의 자리를 잰 값으로 바로잡는다", () => {
    const state: StepSheetState = {
      openStepId: "ordering",
      anchorY: 512,
      anchorScrollTop: 0,
      anchorLimit: null,
    };

    const next = stepSheetReducer(state, {
      type: "anchorStep",
      stepId: "ordering",
      anchorY: 540,
      scrollTop: 10,
      anchorLimit: 566,
    });

    expect(next).toEqual({
      openStepId: "ordering",
      anchorY: 540,
      anchorScrollTop: 10,
      anchorLimit: 566,
    });
  });

  it("재는 사이에 닫혔으면 다시 열지 않는다", () => {
    const next = stepSheetReducer(initialStepSheetState, {
      type: "anchorStep",
      stepId: "ordering",
      anchorY: 540,
      scrollTop: 10,
      anchorLimit: 566,
    });

    expect(next).toBe(initialStepSheetState);
  });

  it("재는 사이에 다른 스텝으로 바뀌었으면 그 스텝의 자리를 건드리지 않는다", () => {
    const state: StepSheetState = {
      openStepId: "greeting",
      anchorY: 300,
      anchorScrollTop: 0,
      anchorLimit: null,
    };

    const next = stepSheetReducer(state, {
      type: "anchorStep",
      stepId: "ordering",
      anchorY: 540,
      scrollTop: 10,
      anchorLimit: 566,
    });

    expect(next).toBe(state);
  });
});
