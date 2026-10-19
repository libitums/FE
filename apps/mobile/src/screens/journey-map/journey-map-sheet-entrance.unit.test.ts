import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";
import { describe, expect, test } from "vitest";

import type { SheetTargetId } from "./catalog-map.contract";
import {
  initialSheetEntranceState,
  sheetEntranceAwaitsQuiet,
  sheetEntranceDeadlineMs,
  sheetEntrancePhaseOf,
  sheetEntranceQuietMs,
  sheetEntranceReducer,
  type SheetEntranceAction,
  type SheetEntranceState,
} from "./journey-map-sheet-entrance";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).

const A: SheetTargetId = "catalog:u01-water:S1";
const B: SheetTargetId = "catalog:u01-water:S2";
const tol = 1;

function step(state: SheetEntranceState, action: SheetEntranceAction): SheetEntranceState {
  return sheetEntranceReducer(state, action, tol);
}

function run(actions: readonly SheetEntranceAction[]): SheetEntranceState {
  return actions.reduce(step, initialSheetEntranceState);
}

const open = (stepId: SheetTargetId): SheetEntranceAction => ({ type: "open", stepId });
const measured = (
  stepId: SheetTargetId,
  offset: number | null,
  scrollTop: number,
): SheetEntranceAction => ({ type: "measured", stepId, offset, scrollTop });
const scroll = (scrollTop: number): SheetEntranceAction => ({ type: "scroll", scrollTop });
const expire = (stepId: SheetTargetId): SheetEntranceAction => ({ type: "expire", stepId });
const close: SheetEntranceAction = { type: "close" };

const measuringA: SheetEntranceState = { phase: "measuring", stepId: A };
const enteringA: SheetEntranceState = { phase: "entering", stepId: A };

describe("sheetEntranceReducer", () => {
  test("SE1. open은 measuring으로 — entering에서 다시 열어도 새로 시작한다", () => {
    expect(run([open(A)])).toEqual({ phase: "measuring", stepId: A });
    expect(step(enteringA, open(A))).toEqual({ phase: "measuring", stepId: A });
    expect(step(enteringA, open(B))).toEqual({ phase: "measuring", stepId: B });
  });

  test.each([
    { scrollTop: 290, label: "차 0" },
    { scrollTop: 289, label: "차 1" },
    { scrollTop: 291, label: "차 -1" },
    { scrollTop: 289.4, label: "차 0.6" },
  ])("SE2-a. 바로 닿아 있으면($label) 곧장 entering이다", ({ scrollTop }) => {
    expect(run([open(A), measured(A, 290, scrollTop)])).toEqual(enteringA);
  });

  test("SE2-b. 허용오차(1)를 넘으면 travelling(목적지 290)이다", () => {
    expect(run([open(A), measured(A, 290, 288.99)])).toEqual({
      phase: "travelling",
      stepId: A,
      offset: 290,
    });
  });

  test("SE3. 도착하면 entering — 가는 도중 스크롤은 같은 참조다", () => {
    const travelling = run([open(A), measured(A, 290, 0)]);
    expect(travelling).toEqual({ phase: "travelling", stepId: A, offset: 290 });
    expect(step(travelling, scroll(120))).toBe(travelling);
    expect(step(travelling, scroll(289.6))).toEqual(enteringA);
    expect(step(travelling, scroll(291))).toEqual(enteringA);
    expect(step(travelling, scroll(291.5))).toBe(travelling);
  });

  test("SE4. 끝에서 멈춰 닿지 못하면 expire로 entering이다", () => {
    const travelling = run([open(A), measured(A, 5000, 0)]);
    expect(travelling).toEqual({ phase: "travelling", stepId: A, offset: 5000 });
    expect(step(travelling, scroll(3200))).toBe(travelling);
    expect(step(travelling, expire(A))).toEqual(enteringA);
  });

  test("SE5. 측정 실패(offset null)는 스크롤로 풀리지 않고 expire로만 entering이다", () => {
    const travelling = run([open(A), measured(A, null, 0)]);
    expect(travelling).toEqual({ phase: "travelling", stepId: A, offset: null });
    expect(step(travelling, scroll(0))).toBe(travelling);
    expect(step(travelling, scroll(290))).toBe(travelling);
    expect(step(travelling, expire(A))).toEqual(enteringA);
  });

  test("SE6. 답이 없어도 상한(expire)이 오면 entering이다", () => {
    expect(step(measuringA, expire(A))).toEqual(enteringA);
  });

  test("SE7. 늦은 답은 버린다 — 같은 참조", () => {
    // 가드: 제때 온 답은 받는다.
    expect(step(measuringA, measured(A, 290, 290))).toEqual(enteringA);
    const idle = initialSheetEntranceState;
    expect(step(idle, measured(A, 290, 290))).toBe(idle);
    expect(step(idle, expire(A))).toBe(idle);
    expect(step(idle, scroll(290))).toBe(idle);
    const measuringB: SheetEntranceState = { phase: "measuring", stepId: B };
    expect(step(measuringB, measured(A, 290, 290))).toBe(measuringB);
    expect(step(measuringB, expire(A))).toBe(measuringB);
    expect(step(enteringA, expire(A))).toBe(enteringA);
    expect(step(enteringA, measured(A, 290, 0))).toBe(enteringA);
    expect(step(enteringA, scroll(290))).toBe(enteringA);
    // 닫은 뒤에 온 측정 답은 버린다.
    expect(run([open(A), close, measured(A, 290, 290)])).toEqual(initialSheetEntranceState);
  });

  test("SE8. close는 어느 단계에서든 idle이고, idle이면 같은 참조다", () => {
    const travelling = run([open(A), measured(A, 290, 0)]);
    expect(step(measuringA, close)).toEqual(initialSheetEntranceState);
    expect(step(travelling, close)).toEqual(initialSheetEntranceState);
    expect(step(enteringA, close)).toEqual(initialSheetEntranceState);
    const idle = initialSheetEntranceState;
    expect(step(idle, close)).toBe(idle);
  });
});

describe("sheetEntrance 조회 · 상수", () => {
  test("SE9. 조용함 타이머는 travelling에서만, 단계 이름은 entering만 entering이다", () => {
    const travelling = run([open(A), measured(A, 290, 0)]);
    const travellingBlind = run([open(A), measured(A, null, 0)]);
    expect(sheetEntranceAwaitsQuiet(travelling)).toBe(true);
    expect(sheetEntranceAwaitsQuiet(travellingBlind)).toBe(true);
    expect(sheetEntranceAwaitsQuiet(initialSheetEntranceState)).toBe(false);
    expect(sheetEntranceAwaitsQuiet(measuringA)).toBe(false);
    expect(sheetEntranceAwaitsQuiet(enteringA)).toBe(false);

    expect(sheetEntrancePhaseOf(enteringA)).toBe("entering");
    expect(sheetEntrancePhaseOf(initialSheetEntranceState)).toBe("waiting");
    expect(sheetEntrancePhaseOf(measuringA)).toBe("waiting");
    expect(sheetEntrancePhaseOf(travelling)).toBe("waiting");
  });

  test("SE10. 조용함 · 상한 시간은 d4 · d9 토큰이고 조용함이 더 짧다", () => {
    expect(sheetEntranceQuietMs).toBe(motionDurationMs(motion.duration.d4));
    expect(sheetEntranceDeadlineMs).toBe(motionDurationMs(motion.duration.d9));
    expect(sheetEntranceQuietMs).toBeGreaterThan(0);
    expect(sheetEntranceQuietMs).toBeLessThan(sheetEntranceDeadlineMs);
  });
});
