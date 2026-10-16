import { describe, expect, test } from "vitest";

import { uiCopyEn } from "./ui-copy-en";

// `unit` 계층: 에피소드 띠 설명 줄 문구 `journeyMap.episodeUnitLabel`(spec §19 H-2).
// 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.

describe("journeyMap.episodeUnitLabel", () => {
  test.each([
    ["Episode 0.", 3, "Episode 0, unit 03"],
    ["Episode 0.", 0, "Episode 0, unit 00"],
    ["Episode 0.", 9, "Episode 0, unit 09"],
    ["Episode 0.", 10, "Episode 0, unit 10"],
    ["Episode 1.", 0, "Episode 1, unit 00"],
    ["Episode 12.", 11, "Episode 12, unit 11"],
  ])("HL1. (%s, %s) -> %s", (episodeLabel, unit, expected) => {
    expect(uiCopyEn.journeyMap.episodeUnitLabel(episodeLabel, unit)).toBe(expected);
  });

  test("HL3. 마침표가 없는 라벨은 그대로 둔다", () => {
    expect(uiCopyEn.journeyMap.episodeUnitLabel("Episode 2", 5)).toBe("Episode 2, unit 05");
  });

  test("HL4. 카탈로그 라벨(copy.catalogMap.episodeLabel)을 첫 인자로 받는다", () => {
    const label = uiCopyEn.catalogMap.episodeLabel(1);

    expect(uiCopyEn.journeyMap.episodeUnitLabel(label, 0)).toBe("Episode 1, unit 00");
  });
});
