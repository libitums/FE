import { describe, expect, test } from "vitest";

import { isFullBleedScreen } from "./full-bleed-screens";
import type { Screen } from "./nav-state";

// `unit` 계층: 셸이 여백을 잡지 않는 route 판정의 입출력만 봅니다.

describe("isFullBleedScreen", () => {
  test.each<[string, Screen]>([
    ["episode-intro", { name: "episode-intro", unitId: "tutorial-intro" }],
    ["episode-prologue", { name: "episode-prologue", unitId: "tutorial-intro" }],
    ["episode-final", { name: "episode-final", unitId: "tutorial-final-test" }],
    ["visual-novel", { name: "visual-novel", unitId: "cafe-arrival-visual-novel" }],
    [
      "roleplay-visual-novel",
      { name: "roleplay-visual-novel", unitId: "cafe-arrival-visual-novel" },
    ],
    ["journey-entry", { name: "journey-entry" }],
    ["catalog-cover", { name: "catalog-cover", episodeId: "u01-water" }],
  ])("FB1. %s는 전체 화면이다", (_name, screen) => {
    expect(isFullBleedScreen(screen)).toBe(true);
  });

  test.each<[string, Screen]>([
    ["journey-map", { name: "journey-map" }],
    ["settings", { name: "settings" }],
    ["messenger", { name: "messenger", unitId: "appointment-confirmation" }],
    ["episode-prologue-complete", { name: "episode-prologue-complete", unitId: "tutorial-intro" }],
  ])("FB1. %s는 전체 화면이 아니다", (_name, screen) => {
    expect(isFullBleedScreen(screen)).toBe(false);
  });
});
