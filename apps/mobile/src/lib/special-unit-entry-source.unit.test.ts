import { describe, expect, it } from "vitest";

import { specialUnitExitLabel } from "./special-unit-entry-source";

// 계약: .agent-harness/work/lib-255/spec.md §2.1 · §3
// 계획: .agent-harness/work/lib-255/test-plan.md unit § `special-unit-entry-source.unit.test.ts`
//
// export하지 않는 사상 표 하나를 감싼 총함수다 — 던지지 않고 부수효과가 없다.
// 케이스 ID는 test-plan의 E1~E3 그대로다.

describe("specialUnitExitLabel (LIB-255 계약 §2.1)", () => {
  // E1
  it("E1. journey 출처는 맵으로를 돌려준다", () => {
    expect(specialUnitExitLabel("journey")).toBe("맵으로");
  });

  // E2
  it("E2. roleplay 출처는 목록으로를 돌려준다", () => {
    expect(specialUnitExitLabel("roleplay")).toBe("목록으로");
  });

  // E3
  it("E3. 두 출처의 라벨이 서로 다르다", () => {
    expect(specialUnitExitLabel("journey")).not.toBe(specialUnitExitLabel("roleplay"));
  });

  it("부수효과 없음 — 같은 출처를 두 번 불러도 같은 값이다", () => {
    expect(specialUnitExitLabel("roleplay")).toBe(specialUnitExitLabel("roleplay"));
    expect(specialUnitExitLabel("journey")).toBe(specialUnitExitLabel("journey"));
  });
});
