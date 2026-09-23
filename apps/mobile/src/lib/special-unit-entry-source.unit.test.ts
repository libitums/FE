import { describe, expect, it } from "vitest";

import { specialUnitExitLabel } from "./special-unit-entry-source";

describe("specialUnitExitLabel", () => {
  it("E1. journey 출처는 맵으로를 돌려준다", () => {
    expect(specialUnitExitLabel("journey")).toBe("맵으로");
  });

  it("E2. roleplay 출처는 목록으로를 돌려준다", () => {
    expect(specialUnitExitLabel("roleplay")).toBe("목록으로");
  });

  it("E3. 두 출처의 라벨이 서로 다르다", () => {
    expect(specialUnitExitLabel("journey")).not.toBe(specialUnitExitLabel("roleplay"));
  });

  it("부수효과 없음 — 같은 출처를 두 번 불러도 같은 값이다", () => {
    expect(specialUnitExitLabel("roleplay")).toBe(specialUnitExitLabel("roleplay"));
    expect(specialUnitExitLabel("journey")).toBe(specialUnitExitLabel("journey"));
  });
});
