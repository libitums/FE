import { describe, expect, it } from "vitest";

import {
  initialStepSheetState,
  mapBottomInset,
  stepSheetCaretOffset,
  stepSheetPlacement,
  stepSheetProgress,
  stepSheetReducer,
  stepSheetTop,
  type StepSheetState,
} from "./journey-map-sheet";
import * as sheet from "./journey-map-sheet";
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

describe("stepSheetCaretOffset", () => {
  it("SC1. 유닛 중심 − 화면 중심이다", () => {
    expect(stepSheetCaretOffset(120, 201, 105)).toBe(-81);
    expect(stepSheetCaretOffset(282, 201, 105)).toBe(81);
  });

  it("SC2. 한도 밖은 ±한도로 가둔다", () => {
    expect(stepSheetCaretOffset(10, 201, 105)).toBe(-105);
    expect(stepSheetCaretOffset(400, 201, 105)).toBe(105);
  });

  it("SC3. 둘 중 하나라도 모르면 0이다", () => {
    expect(stepSheetCaretOffset(null, 201, 105)).toBe(0);
    expect(stepSheetCaretOffset(120, null, 105)).toBe(0);
  });

  it("SC4. 바텀 네비게이션 높이는 68이고 기존 배치 계산은 그대로다", () => {
    expect(mapBottomInset).toBe(68);
    // anchorLimit = 812 − 68 − 16 − 250 = 478, 유닛 중심 750이 설 자리는 가운데 406.
    expect(
      stepSheetPlacement({
        unitTop: 700,
        scrollViewTop: 0,
        scrollViewHeight: 812,
        screenTop: 0,
        screenHeight: 812,
        scrollTop: 0,
      }),
    ).toEqual({ targetScrollTop: 344, anchorY: 800, anchorLimit: 478 });
  });
});

// 말풍선의 카드 회피(정정 2) — 새 심볼은 이름공간으로 읽어, 아직 없을 때도 파일 수집이 깨지지 않고 단언이 떨어집니다.
type HeaderCard = {
  readonly bottom: number;
  readonly left: number | null;
  readonly width: number | null;
};
type Measure = Parameters<typeof stepSheetPlacement>[0];
type Placement = ReturnType<typeof stepSheetPlacement>;

function belowHeader(
  measure: Measure,
  unitCenterX: number | null,
  header: HeaderCard | null,
  gap = 24,
): Placement {
  const value = (sheet as unknown as Record<string, unknown>)["stepSheetPlacementBelowHeader"];
  expect(typeof value, "stepSheetPlacementBelowHeader가 export되어 있다").toBe("function");
  return (
    value as (m: Measure, x: number | null, h: HeaderCard | null, gap: number) => Placement
  )(measure, unitCenterX, header, gap);
}

describe("stepSheetPlacementBelowHeader", () => {
  const wide: Measure = {
    scrollViewTop: 60,
    scrollViewHeight: 800,
    screenTop: 0,
    screenHeight: 900,
    unitTop: 700,
    scrollTop: 0,
  };
  const card = (
    bottom: number,
    left: number | null = 16,
    width: number | null = 151,
  ): HeaderCard => ({ bottom, left, width });
  // 화면 800 · 스크롤 상자 높이 400 — 가운데 정렬이 표식을 위 210에 세워 카드(아래 228) 뒤로 보냅니다.
  const short: Measure = { ...wide, screenHeight: 800, scrollViewHeight: 400 };
  const leftColumn = 102;
  const rightColumn = 290;

  it("SB1. 머리 카드를 모르면 stepSheetPlacement와 같다(네 입력)", () => {
    for (const measure of [wide, { ...wide, scrollTop: 120 }, { ...wide, unitTop: 100 }, short]) {
      expect(belowHeader(measure, leftColumn, null)).toEqual(stepSheetPlacement(measure));
    }
  });

  it("SB2. 넓은 화면(표식 위 410 ≥ 252)은 카드가 있어도 base 그대로다", () => {
    expect(stepSheetPlacement(wide).targetScrollTop).toBe(290);
    expect(belowHeader(wide, leftColumn, card(228))).toEqual(stepSheetPlacement(wide));
  });

  it("SB3. 낮은 화면에서 base가 이미 카드 아래(278 ≥ 270)면 base 그대로다", () => {
    const low: Measure = { ...wide, screenHeight: 720, scrollViewHeight: 620 };
    expect(belowHeader(low, leftColumn, card(270))).toEqual(stepSheetPlacement(low));
  });

  it("SB4. 남는 자리로 해결한다 — 표식이 카드 아래 + 24(252)에 서는 목적지(448)다", () => {
    const base = stepSheetPlacement(short);
    expect(base.targetScrollTop).toBe(490);
    expect(belowHeader(short, leftColumn, card(228))).toEqual({
      targetScrollTop: 448,
      anchorY: base.anchorY,
      anchorLimit: base.anchorLimit,
    });
    expect(base.anchorLimit).toBe(466);
  });

  it("SB5. 오른쪽 칸 유닛은 카드와 가로로 안 겹쳐 base 그대로다", () => {
    expect(belowHeader(short, rightColumn, card(228))).toEqual(stepSheetPlacement(short));
  });

  it.each([
    ["표식의 가운데 x를 모르면", null, card(228)],
    ["카드의 left를 모르면", leftColumn, card(228, null, 151)],
    ["카드의 width를 모르면", leftColumn, card(228, 16, null)],
  ] as const)("SB6. %s 겹친다고 보고 SB4와 같은 답을 낸다", (_name, unitCenterX, header) => {
    expect(belowHeader(short, unitCenterX, header).targetScrollTop).toBe(448);
  });

  it("SB7. 화면이 더 낮으면(616) 표식이 카드 아래(228)에 붙고 말풍선 자리는 base 그대로다", () => {
    const tiny: Measure = { ...wide, screenHeight: 616 };
    const base = stepSheetPlacement(tiny);
    expect(base.anchorLimit).toBe(282);
    expect(base.targetScrollTop).toBe(526);
    const result = belowHeader(tiny, leftColumn, card(228));
    expect(result.targetScrollTop).toBe(700 - 228);
    expect(result.anchorLimit).toBe(282);
    expect(result.anchorY).toBe(base.anchorY);
  });

  it("SB8. 간격을 줄여도 모자라지 않는 화면(690)은 말풍선 자리를 깎지 않고 base 그대로다", () => {
    const mid: Measure = { ...wide, screenHeight: 690 };
    expect(stepSheetPlacement(mid).anchorLimit).toBe(356);
    expect(belowHeader(mid, leftColumn, card(228))).toEqual(stepSheetPlacement(mid));
  });

  it("SB9. 표식 끝이 카드 끝에 닿기만 하면 겹치지 않고, 1만 겹쳐도 겹친다", () => {
    // 표식 [52, 152] · 카드 [152, 252] / 카드 [16, 52].
    expect(belowHeader(short, 102, card(228, 152, 100))).toEqual(stepSheetPlacement(short));
    expect(belowHeader(short, 102, card(228, 16, 36))).toEqual(stepSheetPlacement(short));
    expect(belowHeader(short, 102, card(228, 151, 100)).targetScrollTop).toBe(448);
    expect(belowHeader(short, 102, card(228, 16, 37)).targetScrollTop).toBe(448);
  });

  it("SB10. 맵 맨 위의 유닛은 0 아래로 가지 않고 base보다 더 올라가지 않는다", () => {
    for (const unitTop of [0, 100, 250, 500, 700, 1500]) {
      for (const scrollTop of [0, 50, 400]) {
        const measure: Measure = { ...short, unitTop, scrollTop };
        const result = belowHeader(measure, leftColumn, card(228));
        expect(result.targetScrollTop).toBeGreaterThanOrEqual(0);
        // 표식이 base보다 위로 서지 않는다 — 곧 목적지가 base보다 크지 않다.
        expect(result.targetScrollTop).toBeLessThanOrEqual(
          stepSheetPlacement(measure).targetScrollTop,
        );
      }
    }
    expect(belowHeader({ ...short, unitTop: 100 }, leftColumn, card(228)).targetScrollTop).toBe(0);
  });

  it("SB11. gap 인자를 쓴다 — gap 0이면 표식이 카드 아래(228)에 붙는다", () => {
    expect(belowHeader(short, leftColumn, card(228), 0).targetScrollTop).toBe(700 - 228);
  });
});
