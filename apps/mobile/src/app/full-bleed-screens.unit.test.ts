import { describe, expect, test } from "vitest";

import { isFullBleedScreen, shellHeaderTop, shellInsetsFor } from "./full-bleed-screens";
import type { Screen } from "./nav-state";

// `unit` 계층: 셸이 여백을 잡지 않는 route 판정의 입출력만 봅니다.

// 카탈로그 학습 route는 이 단계에서 `Screen`에 더해지므로 모양만 흉내 낸 값을 `Screen`으로 다룹니다.
const asScreen = (screen: object): Screen => screen as unknown as Screen;

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
    ["catalog-final", asScreen({ name: "catalog-final", episodeId: "u01-water" })],
    ["catalog-epilogue", asScreen({ name: "catalog-epilogue", episodeId: "u01-water" })],
  ])("FB1′. %s는 전체 화면이다", (_name, screen) => {
    expect(isFullBleedScreen(screen)).toBe(true);
  });

  test.each<[string, Screen]>([
    [
      "catalog-lesson",
      asScreen({ name: "catalog-lesson", episodeId: "u01-water", unitKey: "S3", activityIndex: 0 }),
    ],
    [
      "catalog-unit-complete",
      asScreen({
        name: "catalog-unit-complete",
        episodeId: "u01-water",
        unitKey: "S3",
        results: [],
        skippedCount: 0,
        questionCount: 0,
      }),
    ],
  ])("FB1′. %s는 전체 화면이 아니다", (_name, screen) => {
    expect(isFullBleedScreen(screen)).toBe(false);
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

// ⟨2026-10-19⟩ 여정 맵은 상태 표시줄 뒤까지 스크롤한다(사용자 결정) — 셸은 위 여백만 잡지 않는다.
describe("shellInsetsFor", () => {
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };

  test("SI1. 여정 맵은 위만 0이고 아래 · 좌우는 그대로다", () => {
    expect(shellInsetsFor({ name: "journey-map" } as Screen, insets)).toEqual({
      top: 0,
      bottom: 34,
      left: 0,
      right: 0,
    });
  });

  test("SI2. 다른 탭 루트 · 학습 화면은 그대로 잡는다", () => {
    expect(shellInsetsFor({ name: "settings" } as Screen, insets)).toEqual(insets);
    expect(shellInsetsFor({ name: "roleplay-list" } as Screen, insets)).toEqual(insets);
  });

  test("SI3. 가장자리까지 그림을 까는 화면은 넷 다 0이다", () => {
    expect(
      shellInsetsFor({ name: "episode-intro", unitId: "tutorial-intro" } as Screen, insets),
    ).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});

describe("shellHeaderTop", () => {
  const insets = { top: 59, bottom: 34, left: 0, right: 0 };

  test("SH1. 여정 맵에서는 칩이 안전 영역 아래 기본 자리(12 + 59)다", () => {
    expect(shellHeaderTop({ name: "journey-map" } as Screen, insets)).toBe(71);
  });

  test("SH2. 셸이 위 여백을 잡는 다른 탭 루트에서는 기본 자리 12다", () => {
    expect(shellHeaderTop({ name: "settings" } as Screen, insets)).toBe(12);
  });
});
