import { describe, expect, it } from "vitest";

import {
  canOpenStep,
  completedStepCount,
  findStep,
  initialStepSheetState,
  journeySteps,
  stepAccessibilityLabel,
  stepSheetReducer,
  stepStatusAt,
  type StepSheetState,
} from "./journey-map";

// 계약: .agent-harness/work/lib-222/spec.md §3.1 (`unit` 테스트 계획, pureFunctions 표)
// DOM·컴포넌트를 import하지 않는다 — 순수 함수 다섯 + 고정 데이터만 본다.

describe("stepStatusAt", () => {
  // 계약 §3.1 표 · §1.5 판정 규칙: index < completedCount → "done"
  it("index가 completedCount보다 작으면 done이다", () => {
    expect(stepStatusAt(0, 2)).toBe("done");
    expect(stepStatusAt(1, 2)).toBe("done");
  });

  // index === completedCount → "current"
  it("index가 completedCount와 같으면 current다", () => {
    expect(stepStatusAt(2, 2)).toBe("current");
  });

  // 그 밖 → "locked"
  it("index가 completedCount보다 크면 locked다", () => {
    expect(stepStatusAt(3, 2)).toBe("locked");
    expect(stepStatusAt(4, 2)).toBe("locked");
  });

  it("아무것도 완료되지 않은 여정의 첫 스텝(0, 0)은 current다", () => {
    expect(stepStatusAt(0, 0)).toBe("current");
  });

  it("전부 완료되면(completedCount === steps.length) current가 없다 — 마지막 index도 done이다", () => {
    expect(stepStatusAt(4, 5)).toBe("done");
  });
});

describe("stepAccessibilityLabel", () => {
  // 계약 §1.5 접미사 표: "<title>, <접미사>"
  it("done 상태는 완료됨 접미사를 낸다", () => {
    expect(stepAccessibilityLabel("첫 인사", "done")).toBe("첫 인사, 완료됨");
  });

  it("current 상태는 현재 스텝 접미사를 낸다", () => {
    expect(stepAccessibilityLabel("주문하기", "current")).toBe("주문하기, 현재 스텝");
  });

  it("locked 상태는 잠김 접미사를 낸다", () => {
    expect(stepAccessibilityLabel("약속 잡기", "locked")).toBe("약속 잡기, 잠김");
  });
});

// 계약 재고정(§1.5.1, §4.4): "이 상태가 시트를 여는가"의 판정만 하는 순수 함수.
// 아무것도 막지 않는다 — 실제 차단(게이트)은 JourneyStepNode.ui.test.tsx가
// bindtap 뒤 onSelect 호출 횟수로 본다(§1.7.2). 여기서는 반환값만 본다.
describe("canOpenStep", () => {
  it("done은 시트를 연다 — true", () => {
    expect(canOpenStep("done")).toBe(true);
  });

  it("current는 시트를 연다 — true", () => {
    expect(canOpenStep("current")).toBe(true);
  });

  it("locked는 시트를 열지 않는다 — false", () => {
    expect(canOpenStep("locked")).toBe(false);
  });
});

describe("findStep", () => {
  it("배열에 있는 id면 그 스텝을 돌려준다", () => {
    const found = findStep(journeySteps, "ordering");

    expect(found?.title).toBe("주문하기");
  });

  it("배열에 없는 id면 undefined를 돌려준다", () => {
    // JourneyStepId는 닫힌 union이라, 계약이 없다고 명시한 경우는 as로만 만들 수 있다.
    expect(findStep(journeySteps, "not-a-real-step" as never)).toBeUndefined();
  });
});

describe("stepSheetReducer", () => {
  it("openStep — 닫혀 있던 시트가 그 스텝으로 열린다", () => {
    const next = stepSheetReducer(initialStepSheetState, {
      type: "openStep",
      stepId: "ordering",
    });

    expect(next).toEqual({ openStepId: "ordering" });
  });

  it("openStep — 다른 스텝이 열려 있으면 그 스텝으로 바뀐다", () => {
    const state: StepSheetState = { openStepId: "ordering" };

    const next = stepSheetReducer(state, { type: "openStep", stepId: "greeting" });

    expect(next).toEqual({ openStepId: "greeting" });
  });

  it("openStep — 이미 그 스텝이 열려 있으면 같은 참조를 돌려준다", () => {
    const state: StepSheetState = { openStepId: "ordering" };

    const next = stepSheetReducer(state, { type: "openStep", stepId: "ordering" });

    expect(next).toBe(state);
  });

  it("closeSheet — 열려 있던 시트를 닫는다", () => {
    const state: StepSheetState = { openStepId: "ordering" };

    const next = stepSheetReducer(state, { type: "closeSheet" });

    expect(next).toEqual({ openStepId: null });
  });

  it("closeSheet — 이미 닫혀 있으면 같은 참조를 돌려준다", () => {
    const next = stepSheetReducer(initialStepSheetState, { type: "closeSheet" });

    expect(next).toBe(initialStepSheetState);
  });

  it("부수효과 없음 — 호출 뒤 입력 state 객체가 변형되지 않는다", () => {
    const state: StepSheetState = { openStepId: "ordering" };
    const snapshot: StepSheetState = { openStepId: "ordering" };

    stepSheetReducer(state, { type: "openStep", stepId: "greeting" });
    stepSheetReducer(state, { type: "closeSheet" });

    expect(state).toEqual(snapshot);
  });
});

describe("journeySteps · completedStepCount (고정 데이터)", () => {
  it("스텝이 다섯이다", () => {
    expect(journeySteps).toHaveLength(5);
  });

  it("id가 중복되지 않는다", () => {
    const ids = journeySteps.map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("completedStepCount가 0 이상 스텝 개수 이하다", () => {
    expect(completedStepCount).toBeGreaterThanOrEqual(0);
    expect(completedStepCount).toBeLessThanOrEqual(journeySteps.length);
  });

  it("completedStepCount가 계약 §1.4가 고정한 값(2)이다", () => {
    expect(completedStepCount).toBe(2);
  });

  // 계약 §1.4 표: 파생 상태가 done 2 · current 1 · locked 2가 되게 한다.
  it("파생 상태가 §1.4 표와 일치한다 — greeting·introduction done, ordering current, appointment·directions locked", () => {
    const derived = journeySteps.map((step, index) => ({
      id: step.id,
      status: stepStatusAt(index, completedStepCount),
    }));

    expect(derived).toEqual([
      { id: "greeting", status: "done" },
      { id: "introduction", status: "done" },
      { id: "ordering", status: "current" },
      { id: "appointment", status: "locked" },
      { id: "directions", status: "locked" },
    ]);
  });
});
