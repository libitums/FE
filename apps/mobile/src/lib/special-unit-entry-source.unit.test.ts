import { describe, expect, it } from "vitest";

import { specialUnitExitLabel } from "./special-unit-entry-source";
import { uiCopyEn } from "./ui-copy-en";

describe("specialUnitExitLabel", () => {
  it("E1. journey 출처는 맵으로를 돌려준다", () => {
    expect(specialUnitExitLabel("journey", uiCopyEn)).toBe("Back to map");
  });

  it("E2. roleplay 출처는 목록으로를 돌려준다", () => {
    expect(specialUnitExitLabel("roleplay", uiCopyEn)).toBe("Back to list");
  });

  it("E3. 두 출처의 라벨이 서로 다르다", () => {
    expect(specialUnitExitLabel("journey", uiCopyEn)).not.toBe(
      specialUnitExitLabel("roleplay", uiCopyEn),
    );
  });

  it("부수효과 없음 — 같은 출처를 두 번 불러도 같은 값이다", () => {
    expect(specialUnitExitLabel("roleplay", uiCopyEn)).toBe(
      specialUnitExitLabel("roleplay", uiCopyEn),
    );
    expect(specialUnitExitLabel("journey", uiCopyEn)).toBe(
      specialUnitExitLabel("journey", uiCopyEn),
    );
  });
});
