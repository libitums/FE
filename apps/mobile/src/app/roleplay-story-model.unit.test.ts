import { expect, test } from "vitest";

import { bundledCatalogInput } from "../lib/episode-bundled";
import { buildEpisodeCatalog } from "../lib/episode-catalog";
import { fillPlaceholders } from "../lib/placeholder-fill";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type { EpisodeContent } from "./episode-content";
import {
  catalogRoleplaySectionsOf,
  roleplayStoryModelOf,
  roleplayWildcardsOf,
} from "./roleplay-story-model";

// `unit` 계층: 내장 세 에피소드(u01 · u02 · u03)로 롤플레이 구획 · 모델을 봅니다 — 콘텐츠가 이미 「표지 마지막
// 컷 = 최종 테스트 첫 턴 대사」 모양이라는 것을 이 테스트가 지킵니다.

const catalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const content: EpisodeContent = {
  catalog,
  imageUrlOf: (path) => `https://cdn/${path}`,
  fillText: fillPlaceholders,
  audioTimingOf: () => null,
};
const sections = catalogMapSectionsOf(catalog);
const label = (ordinal: number) => `Episode ${String(ordinal)}.`;
const emma: LearnerProfile = {
  name: "Emma",
  country: { ko: "독일", roman: "dogil", en: "Germany" },
};

test("[RM1] 준비된 에피소드마다 구획 하나 · 항목 하나(상대 이름 · 대사 수), 진행이 없으면 잠김", () => {
  const result = catalogRoleplaySectionsOf(content, sections, {}, noLearnerProfile, label);
  expect(result.map((section) => section.episodeId)).toEqual([
    "u01-water",
    "u02-checkin",
    "u03-mina",
  ]);
  expect(result[0]).toMatchObject({
    label: "Episode 1.",
    unlocked: false,
    premiumItems: [],
    items: [{ form: "story", unitId: "story-u01-water", episodeId: "u01-water", lineCount: 3 }],
  });
  expect(result[0]?.items[0]?.title).toBe("Buying Water");
  // 카드 바탕은 그 에피소드 표지의 첫 그림입니다.
  expect(result[0]?.items[0]).toMatchObject({
    imageUrl: "https://cdn/content/images/u01-water/pre-1.jpg",
  });
  expect(result.map((section) => section.items[0])).toMatchObject([
    { lineCount: 3 },
    { lineCount: 5 },
    { lineCount: 5 },
  ]);
});

test("[RM2] 에피소드의 완료 키를 모두 끝내면 그 구획만 열린다", () => {
  const u01 = sections.find((section) => section.episodeId === "u01-water");
  if (u01 === undefined || u01.kind !== "catalog-ready") throw new Error("u01 not ready");
  const progress = { "u01-water": u01.completionKeys };
  const result = catalogRoleplaySectionsOf(content, sections, progress, noLearnerProfile, label);
  expect(result.map((section) => section.unlocked)).toEqual([true, false, false]);
});

test("[RM3] 모델 — 표지 마지막 컷(첫 턴 대사)은 빠지고 나머지 컷 · 턴 · 장면 그림이 선다", () => {
  const model = roleplayStoryModelOf(content, sections, "u01-water", noLearnerProfile);
  expect(model).not.toBeNull();
  expect(model?.turns[0].line.ko).toBe("봉투 드릴까요?");
  expect(model?.turns).toHaveLength(3);
  expect(model?.cuts).toHaveLength(5);
  expect(model?.cuts?.at(-1)?.text.ko).not.toBe("봉투 드릴까요?");
  expect(model?.imageUrl).toContain("u01-water/pre-6.jpg");
  expect(model?.counterpartName).toBe("편의점 점원");
});

test("[RM4] 세 에피소드 모두 표지 마지막 컷이 첫 턴 대사라 한 컷씩 빠진다", () => {
  for (const [episodeId, cutCount] of [
    ["u01-water", 5],
    ["u02-checkin", 4],
    ["u03-mina", 3],
  ] as const) {
    expect(roleplayStoryModelOf(content, sections, episodeId, noLearnerProfile)?.cuts).toHaveLength(
      cutCount,
    );
  }
});

test("[RM5] 프로필이 있으면 대답에 이름이 채워지고 판정 예외 낱말은 이름 · 나라(한국어)다", () => {
  const model = roleplayStoryModelOf(content, sections, "u02-checkin", emma);
  expect(model?.turns[0].accepted[0]).toContain("Emma");
  expect(model?.wildcards).toEqual(["Emma", "독일"]);
  expect(roleplayWildcardsOf(noLearnerProfile)).toEqual([]);
});

test("[RM6] 없는 에피소드는 null", () => {
  expect(roleplayStoryModelOf(content, sections, "nope", noLearnerProfile)).toBeNull();
});
