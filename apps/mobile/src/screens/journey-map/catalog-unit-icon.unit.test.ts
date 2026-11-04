import { describe, expect, test } from "vitest";

import card from "@libitums/icons/lynx/card";
import dumbbell from "@libitums/icons/lynx/dumbbell";
import earth from "@libitums/icons/lynx/earth";
import light from "@libitums/icons/lynx/light";
import mic from "@libitums/icons/lynx/mic";
import play from "@libitums/icons/lynx/play";

import { catalogUnitGroupOf, catalogUnitIconOf } from "./catalog-unit-icon";

// `unit` 계층: 스텝 id → 묶음 → 아이콘 표(사용자 결정 2026-11-04 — light · card · dumbbell · mic · earth).

describe("catalogUnitGroupOf", () => {
  test.each([
    ["S1", "learn"],
    ["S3", "learn"],
    ["S2", "item"],
    ["S4", "item"],
    ["S5", "drill"],
    ["S6", "drill"],
    ["S7", "speak"],
    ["CULT", "culture"],
  ] as const)("UI-G1. %s → %s", (stepId, group) => {
    expect(catalogUnitGroupOf(stepId)).toBe(group);
  });

  test("UI-G1. 표 밖(S8 · S9 · RP · INT · 빈 값 · 프로토타입 키)은 null", () => {
    for (const stepId of [
      "S8",
      "S9",
      "S13",
      "RP",
      "INT",
      "",
      "s1",
      "toString",
      "__proto__",
      "constructor",
    ]) {
      expect(catalogUnitGroupOf(stepId)).toBeNull();
    }
  });
});

describe("catalogUnitIconOf", () => {
  test("UI-G1. 레슨은 묶음 아이콘, 모르면 play; 문화는 늘 earth", () => {
    expect(catalogUnitIconOf("lesson", "S1")).toBe(light);
    expect(catalogUnitIconOf("lesson", "S2")).toBe(card);
    expect(catalogUnitIconOf("lesson", "S5")).toBe(dumbbell);
    expect(catalogUnitIconOf("lesson", "S7")).toBe(mic);
    expect(catalogUnitIconOf("lesson", "S9")).toBe(play);
    expect(catalogUnitIconOf("lesson", "CULT")).toBe(earth);
    expect(catalogUnitIconOf("culture", "CULT")).toBe(earth);
    expect(catalogUnitIconOf("culture", "S1")).toBe(earth);
  });
});
