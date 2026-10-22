import { describe, expect, it } from "vitest";

import { syllableSlotStateOf } from "./syllable-build";

// `unit` 계층: 음절 칸 한 자리의 상태를 정하는 순수 함수의 입출력만 봅니다.

describe("syllableSlotStateOf (SB1)", () => {
  it("만드는 중에는 놓인 칸 filled, 다음 칸 current, 그 뒤 empty다", () => {
    expect(syllableSlotStateOf(0, 2, "building")).toBe("filled");
    expect(syllableSlotStateOf(1, 2, "building")).toBe("filled");
    expect(syllableSlotStateOf(2, 2, "building")).toBe("current");
    expect(syllableSlotStateOf(3, 2, "building")).toBe("empty");
  });

  it("하나도 안 놓았으면 첫 칸이 current다", () => {
    expect(syllableSlotStateOf(0, 0, "building")).toBe("current");
    expect(syllableSlotStateOf(1, 0, "building")).toBe("empty");
  });

  it("채점 뒤에는 current가 없다", () => {
    expect(syllableSlotStateOf(0, 2, "checked")).toBe("filled");
    expect(syllableSlotStateOf(1, 2, "checked")).toBe("filled");
    expect(syllableSlotStateOf(2, 2, "checked")).toBe("empty");
    expect(syllableSlotStateOf(3, 2, "checked")).toBe("empty");
  });

  it("칸이 다 차면 만드는 중이어도 current가 없다", () => {
    const states = [0, 1, 2].map((position) => syllableSlotStateOf(position, 3, "building"));

    expect(states).toEqual(["filled", "filled", "filled"]);
  });
});
