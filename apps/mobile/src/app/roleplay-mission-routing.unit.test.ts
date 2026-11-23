import { describe, expect, test } from "vitest";

import { uiCopyEn } from "../lib/ui-copy-en";
import {
  roleplayItemAccessibilityLabel,
  roleplayItemSubtitle,
} from "../screens/roleplay-list/roleplay-list";
import type { RoleplaySection } from "../screens/roleplay-list/roleplay-list.contract";
import { missionListFixture } from "../screens/roleplay-mission/mission-fixture";
import { missionPriceLine } from "../screens/roleplay-mission/mission-model";
import type { EpisodeContent } from "./episode-content";
import { roleplayMissionEnabled } from "./roleplay-mission-wiring";
import { withMissionItems } from "./roleplay-sections";
import { roleplayScreenFor } from "./screen-routing";

// `unit` 계층(MR-U1 ~): 미션 목록 항목 — 구획에 붙이기 · 카드 둘째 줄 · 선택 → route · 값 줄 · 스위치 기본값.

const section = (episodeId: string): RoleplaySection => ({
  episodeId,
  label: "Episode 6.",
  title: "Coffee.",
  unlocked: true,
  items: [
    {
      form: "story",
      unitId: `story-${episodeId}`,
      episodeId,
      title: "Coffee",
      lineCount: 3,
      imageUrl: null,
    },
  ],
  premiumItems: [],
});
const content = { catalog: [], imageUrlOf: () => null } as unknown as EpisodeContent;

describe("미션 목록 항목", () => {
  test("MR-U1 스위치는 기본으로 꺼져 있다", () => {
    expect(roleplayMissionEnabled()).toBe(false);
  });

  test("MR-U2 미션은 그 에피소드 구획의 대본형 항목 뒤에 붙고, 구획이 없는 미션은 빠진다", () => {
    const [cafe, other] = withMissionItems(
      [section("u06-cafe"), section("u02-checkin")],
      missionListFixture,
      content,
    );
    expect(cafe?.items.map((item) => item.unitId)).toEqual(["story-u06-cafe", "mission-u06-cafe"]);
    expect(cafe?.items[1]).toMatchObject({
      form: "mission",
      missionId: "u06-cafe",
      goalCount: 4,
      bestScore: 73,
      reportBadge: null,
    });
    expect(other?.items).toHaveLength(1);
  });

  test("MR-U2b 채점 대기 판이 있는 미션 항목만 「Report ready」 — 낭독 이름에도 붙는다", () => {
    const pendingList = {
      ...missionListFixture,
      pendingReports: [
        {
          conversationId: "6c2d8f3b-5d2e-4a8f-8b62-3e4f5a6b7c81",
          missionId: "u06-cafe",
          endedAt: null,
        },
      ],
    };
    const [cafe] = withMissionItems([section("u06-cafe")], pendingList, content);
    const [story, mission] = cafe?.items ?? [];
    if (story === undefined || mission === undefined) throw new Error("items");
    expect(mission).toMatchObject({ reportBadge: "ready" });
    expect(roleplayItemAccessibilityLabel(mission, false, uiCopyEn)).toBe(
      "Order a coffee, Mission · 4 goals · Best 73, Report ready",
    );
    expect(roleplayItemAccessibilityLabel(story, false, uiCopyEn)).toBe(
      "Coffee, Roleplay · 3 lines",
    );
  });

  test("MR-U3 카드 둘째 줄 — 목표 수와 최고 기록(없으면 생략)", () => {
    const base = {
      form: "mission",
      unitId: "mission-u06-cafe",
      episodeId: "u06-cafe",
      missionId: "u06-cafe",
      title: "Order a coffee",
      goalCount: 4,
      imageUrl: null,
      reportBadge: null,
    } as const;
    expect(roleplayItemSubtitle({ ...base, bestScore: 73 }, uiCopyEn)).toBe(
      "Mission · 4 goals · Best 73",
    );
    expect(roleplayItemSubtitle({ ...base, bestScore: null }, uiCopyEn)).toBe("Mission · 4 goals");
  });

  test("MR-U4 선택 → route: 미션은 roleplay-mission, 대본형은 그대로 roleplay-story", () => {
    const [cafe] = withMissionItems([section("u06-cafe")], missionListFixture, content);
    const [story, mission] = cafe?.items ?? [];
    if (story === undefined || mission === undefined) throw new Error("items");
    expect(roleplayScreenFor(mission)).toEqual({ name: "roleplay-mission", missionId: "u06-cafe" });
    expect(roleplayScreenFor(story)).toEqual({ name: "roleplay-story", episodeId: "u06-cafe" });
  });

  test("MR-U5 값 줄 — 무료가 남았으면 무료, 아니면 엽전 정액 · 잔액(지갑이 없으면 정액만)", () => {
    const copy = uiCopyEn.roleplayMission;
    expect(missionPriceLine({ freeLeft: 1, cost: 5, balance: 42 }, copy)).toBe(
      "Free today · 1 left",
    );
    expect(missionPriceLine({ freeLeft: 0, cost: 5, balance: 42 }, copy)).toBe(
      "5 Yeopjeon · You have 42",
    );
    expect(missionPriceLine({ freeLeft: 0, cost: 5, balance: null }, copy)).toBe("5 Yeopjeon");
  });
});
