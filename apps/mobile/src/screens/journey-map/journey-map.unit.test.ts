import { describe, expect, it } from "vitest";

import {
  canOpenStep,
  completeStep,
  initialCompletedStepCount,
  findStep,
  initialStepSheetState,
  journeySteps,
  journeyStepOrdinal,
  stepAccessibilityLabel,
  stepSheetReducer,
  stepStatusAt,
  type JourneyStepId,
  type StepSheetState,
} from "./journey-map";

// 계약: .agent-harness/work/lib-222/spec.md §3.1 (`unit` 테스트 계획, pureFunctions 표)
// 진행 갱신 둘(journeyStepOrdinal · completeStep)은 LIB-223 계약 §3.1(b)·§1.5(a)다.
// DOM·컴포넌트를 import하지 않는다 — 순수 함수 일곱 + 고정 데이터만 본다.

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

describe("journeySteps · initialCompletedStepCount (고정 데이터)", () => {
  it("스텝이 다섯이다", () => {
    expect(journeySteps).toHaveLength(5);
  });

  it("id가 중복되지 않는다", () => {
    const ids = journeySteps.map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("initialCompletedStepCount가 0 이상 스텝 개수 이하다", () => {
    expect(initialCompletedStepCount).toBeGreaterThanOrEqual(0);
    expect(initialCompletedStepCount).toBeLessThanOrEqual(journeySteps.length);
  });

  it("initialCompletedStepCount가 계약 §1.4가 고정한 값(2)이다", () => {
    expect(initialCompletedStepCount).toBe(2);
  });

  // 계약 §1.4 표: 파생 상태가 done 2 · current 1 · locked 2가 되게 한다.
  it("파생 상태가 §1.4 표와 일치한다 — greeting·introduction done, ordering current, appointment·directions locked", () => {
    const derived = journeySteps.map((step, index) => ({
      id: step.id,
      status: stepStatusAt(index, initialCompletedStepCount),
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

// ------------------------------------------------- 진행 갱신 (LIB-223 계약 §3.1(b))
// 여기부터가 LIB-223이 더하는 것이다. 위의 케이스는 하나도 지우거나 뜻을 바꾸지 않는다.

// 계약 §1.4 표의 스텝 다섯. 서수는 journeySteps의 자리(1-based)와 같다.
const allStepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

describe("journeyStepOrdinal", () => {
  // 계약 §3.1(b) 표: ("greeting") ("ordering") ("directions") → 1 · 3 · 5
  it("스텝의 1-based 자리를 돌려준다", () => {
    expect(journeyStepOrdinal("greeting")).toBe(1);
    expect(journeyStepOrdinal("ordering")).toBe(3);
    expect(journeyStepOrdinal("directions")).toBe(5);
  });

  it("나머지 둘도 자리대로다", () => {
    expect(journeyStepOrdinal("introduction")).toBe(2);
    expect(journeyStepOrdinal("appointment")).toBe(4);
  });

  // 계약 §1.5(a): 던지지 않는다 — union이 닫혀 있고 journeySteps가 다섯을 전부 갖는다
  it("다섯 스텝의 서수가 journeySteps의 자리와 1:1이다", () => {
    const ordinals = journeySteps.map((step) => journeyStepOrdinal(step.id));

    expect(ordinals).toEqual([1, 2, 3, 4, 5]);
  });

  it("서수가 서로 겹치지 않는다", () => {
    const ordinals = allStepIds.map((id) => journeyStepOrdinal(id));

    expect(new Set(ordinals).size).toBe(allStepIds.length);
  });
});

describe("completeStep", () => {
  // 계약 §3.1(b) 표 · §1.5(a): Math.max(completedCount, journeyStepOrdinal(id))

  // 수용 기준 8 — 방금 학습한 스텝이 done이 되고 다음이 current가 된다
  it("현재 스텝을 끝내면 진행이 그 스텝의 서수로 는다", () => {
    expect(completeStep(2, "ordering")).toBe(3);
  });

  // 수용 기준 9 — 진행은 되돌아가지 않는다
  it("이미 완료한 스텝을 다시 끝내도 진행이 줄지 않는다", () => {
    expect(completeStep(3, "greeting")).toBe(3);
  });

  it("이미 done인 스텝을 다시 돌아도 진행이 그대로다", () => {
    expect(completeStep(2, "greeting")).toBe(2);
  });

  // 계약 §1.5(a): 여정이 전부 완료된다 — current인 스텝이 없는 것이 정상이다
  it("마지막 스텝을 끝내면 진행이 5가 된다", () => {
    expect(completeStep(4, "directions")).toBe(5);
  });

  it("아무것도 완료되지 않은 여정에서 첫 스텝을 끝내면 1이 된다", () => {
    expect(completeStep(0, "greeting")).toBe(1);
  });

  it("건너뛴 스텝을 끝내면 그 스텝의 서수까지 한 번에 는다", () => {
    expect(completeStep(0, "directions")).toBe(5);
  });

  // 계약 §1.5(a) 「단조성이 계약이다」: 모든 입력에 대해 completeStep(c, id) >= c.
  // 조합으로 단언하지 않으면 분기 하나가 바뀌었을 때 조용히 깨진다.
  it("단조성 — 다섯 id × 진행 0..5의 모든 조합에서 진행이 줄지 않는다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= 5; count += 1) {
        expect(completeStep(count, id)).toBeGreaterThanOrEqual(count);
      }
    }
  });

  it("모든 조합에서 결과가 진행과 서수 중 큰 쪽이다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= 5; count += 1) {
        expect(completeStep(count, id)).toBe(Math.max(count, journeyStepOrdinal(id)));
      }
    }
  });

  it("같은 스텝을 두 번 끝내도 값이 더 늘지 않는다 — 멱등이다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= 5; count += 1) {
        const once = completeStep(count, id);

        expect(completeStep(once, id)).toBe(once);
      }
    }
  });

  it("어떤 조합에서도 진행이 스텝 개수를 넘지 않는다", () => {
    for (const id of allStepIds) {
      for (let count = 0; count <= journeySteps.length; count += 1) {
        expect(completeStep(count, id)).toBeLessThanOrEqual(journeySteps.length);
      }
    }
  });

  it("부수효과 없음 — 같은 입력을 두 번 불러도 같은 값이다", () => {
    expect(completeStep(2, "ordering")).toBe(completeStep(2, "ordering"));
  });
});

describe("여정 전부 완료 (계약 §1.5(a)의 빈칸)", () => {
  // 계약 §3.1(b) 표: stepStatusAt(0..4, 5) → 전부 "done". current인 스텝이 없다.
  it("진행이 5면 다섯 스텝이 전부 done이고 current가 없다", () => {
    const statuses = journeySteps.map((_step, index) => stepStatusAt(index, 5));

    expect(statuses).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("전부 done이어도 다섯 스텝이 전부 열린다 — 다시 돌 수 있다", () => {
    const openable = journeySteps.map((_step, index) => canOpenStep(stepStatusAt(index, 5)));

    expect(openable).toEqual([true, true, true, true, true]);
  });

  it("마지막 스텝을 끝내면 그 진행에 닿는다", () => {
    const completed = completeStep(4, "directions");

    expect(journeySteps.map((_step, index) => stepStatusAt(index, completed))).toEqual([
      "done",
      "done",
      "done",
      "done",
      "done",
    ]);
  });
});
