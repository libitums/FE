import { describe, expect, test } from "vitest";

import {
  initialRevealState,
  revealFrameClassName,
  revealFrameStyle,
  revealMeasureRoomPx,
  revealContainerClassName,
  revealContainerStyle,
  revealItemClassName,
  revealItemDelayMs,
  revealReducer,
  revealSettleMs,
  revealTimerOf,
  revealTiming,
  type RevealState,
} from "./reveal-on-answer";

// `unit` 계층: 답하면 카드가 펼쳐지는 단계 · 시간표(ADR-0212, 시안 C안).

const closed: RevealState = { phase: "closed", height: null };
const measuring: RevealState = { phase: "measuring", height: null };

describe("시간표 — 시안 C안의 값을 가장 가까운 모션 토큰으로 옮긴다(calc 없음)", () => {
  test("RA1. 높이 d6 300 · 첫 글 d2 100 · 간격 d1 50 · 글 하나 d4 200 · 측정 기다림 d2 100 · 글 최대 넷", () => {
    expect(revealTiming).toEqual({
      heightMs: 300,
      firstItemDelayMs: 100,
      itemStaggerMs: 50,
      itemMs: 200,
      measureTimeoutMs: 100,
      maxItems: 4,
    });
  });

  test("RA2. 글 순서마다 100ms부터 50ms 간격(CSS 지연 d2 · d3 · d4 · d5) — 넷째 뒤는 넷째와 같다", () => {
    expect([0, 1, 2, 3, 7].map(revealItemDelayMs)).toEqual([100, 150, 200, 250, 250]);
    expect(revealItemDelayMs(-1)).toBe(100);
  });

  test("RA3. 끝나는 시각은 높이와 마지막 글 중 늦은 쪽이다", () => {
    expect(revealSettleMs(3)).toBe(400);
    expect(revealSettleMs(1)).toBe(300);
    expect(revealSettleMs(0)).toBe(300);
  });
});

describe("단계 전이", () => {
  test("RB1. 처음부터 보이면(대본 켬) 열림, 아니면 닫힘 — 처음부터 보이는 것은 움직이지 않는다", () => {
    expect(initialRevealState(true)).toEqual({ phase: "open", height: null });
    expect(initialRevealState(false)).toEqual(closed);
  });

  test("RB2. 닫힘 + 보임 — 표준은 재는 중, 움직임 줄이기는 바로 열림", () => {
    expect(revealReducer(closed, { type: "show", motion: "standard" })).toEqual(measuring);
    expect(revealReducer(closed, { type: "show", motion: "reduced" })).toEqual({
      phase: "open",
      height: null,
    });
  });

  test("RB3. 잰 높이가 양수이면 그 높이까지 펼치고, 0 · 숫자 아님이면 다음 답을 기다린다(재는 중 유지)", () => {
    expect(revealReducer(measuring, { type: "measured", height: 84 })).toEqual({
      phase: "expanding",
      height: 84,
    });
    for (const height of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, undefined, "84"]) {
      expect(revealReducer(measuring, { type: "measured", height })).toBe(measuring);
    }
  });

  test("RB4. 측정이 늦으면(시간 초과) 글만 나타난다", () => {
    expect(revealReducer(measuring, { type: "measure-timeout" })).toEqual({
      phase: "fading",
      height: null,
    });
  });

  test("RB5. 펼침 · 글만 나타남이 끝나면 열림(높이 auto)", () => {
    expect(revealReducer({ phase: "expanding", height: 84 }, { type: "settled" })).toEqual({
      phase: "open",
      height: null,
    });
    expect(revealReducer({ phase: "fading", height: null }, { type: "settled" })).toEqual({
      phase: "open",
      height: null,
    });
  });

  test("RB6. 숨김은 어느 단계에서든 닫힘 — 다음 문항으로 넘어감", () => {
    for (const phase of ["measuring", "expanding", "fading", "open"] as const) {
      expect(revealReducer({ phase, height: 84 }, { type: "hide" })).toEqual(closed);
    }
  });

  test("RB7. 맞지 않는 사건은 상태를 바꾸지 않는다", () => {
    const expanding: RevealState = { phase: "expanding", height: 84 };
    expect(revealReducer(expanding, { type: "measured", height: 120 })).toBe(expanding);
    expect(revealReducer(expanding, { type: "measure-timeout" })).toBe(expanding);
    expect(revealReducer(expanding, { type: "show", motion: "standard" })).toBe(expanding);
    expect(revealReducer(closed, { type: "settled" })).toBe(closed);
    expect(revealReducer(measuring, { type: "settled" })).toBe(measuring);
  });
});

describe("타이머 · 모양", () => {
  test("RC1. 재는 중은 측정 기다림, 펼침 · 글만은 끝나는 시각, 나머지는 타이머 없음", () => {
    expect(revealTimerOf("measuring", 3)).toEqual({ event: { type: "measure-timeout" }, ms: 100 });
    expect(revealTimerOf("expanding", 3)).toEqual({ event: { type: "settled" }, ms: 400 });
    expect(revealTimerOf("fading", 1)).toEqual({ event: { type: "settled" }, ms: 300 });
    expect(revealTimerOf("open", 3)).toBeNull();
    expect(revealTimerOf("closed", 3)).toBeNull();
  });

  test("RC2. 높이는 재는 중 0px · 펼침 중 잰 높이 · 나머지는 지정 없음(auto)", () => {
    expect(revealContainerStyle(measuring)).toEqual({ height: "0px" });
    expect(revealContainerStyle({ phase: "expanding", height: 84 })).toEqual({ height: "84px" });
    expect(revealContainerStyle({ phase: "fading", height: null })).toBeUndefined();
    expect(revealContainerStyle({ phase: "open", height: null })).toBeUndefined();
  });

  test("RC3. 상자 클래스는 움직이는 단계에만 단계 표지를 단다", () => {
    expect(revealContainerClassName("measuring")).toBe(
      "reveal-on-answer reveal-on-answer-measuring",
    );
    expect(revealContainerClassName("expanding")).toBe(
      "reveal-on-answer reveal-on-answer-expanding",
    );
    expect(revealContainerClassName("fading")).toBe("reveal-on-answer reveal-on-answer-fading");
    expect(revealContainerClassName("open")).toBe("reveal-on-answer");
  });

  test("RC4. 글 클래스 — 재는 중은 대기, 펼침 · 글만은 순서 지연과 함께 나타남, 열림은 표지 없음", () => {
    expect(revealItemClassName("measuring", 1)).toBe(
      "reveal-on-answer-item reveal-on-answer-item-pending",
    );
    expect(revealItemClassName("expanding", 1)).toBe(
      "reveal-on-answer-item reveal-on-answer-item-entering reveal-on-answer-item-1",
    );
    expect(revealItemClassName("fading", 9)).toBe(
      "reveal-on-answer-item reveal-on-answer-item-entering reveal-on-answer-item-3",
    );
    expect(revealItemClassName("open", 2)).toBe("reveal-on-answer-item");
  });

  test("RC5. 재는 틀은 재는 중 · 펼치는 중에만 흐름에서 뜨고, 재는 중은 넉넉한 높이 · 펼치는 중은 잰 높이다", () => {
    expect(revealFrameClassName("measuring")).toBe(
      "reveal-on-answer-frame reveal-on-answer-frame-floating",
    );
    expect(revealFrameClassName("expanding")).toBe(
      "reveal-on-answer-frame reveal-on-answer-frame-floating",
    );
    expect(revealFrameClassName("fading")).toBe("reveal-on-answer-frame");
    expect(revealFrameClassName("open")).toBe("reveal-on-answer-frame");
    expect(revealFrameStyle(measuring)).toEqual({ height: `${revealMeasureRoomPx}px` });
    expect(revealFrameStyle({ phase: "expanding", height: 84 })).toEqual({ height: "84px" });
    expect(revealFrameStyle({ phase: "open", height: null })).toBeUndefined();
  });
});
