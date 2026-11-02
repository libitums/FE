import { expect, test } from "vitest";

import type { CatalogEntry } from "../../lib/episode-catalog";
import type { ItemStory, LearningItem, LearningUnit } from "../../lib/episode-content.model";
import { catalogMapSectionsOf } from "./catalog-map";
import { catalogStoryFinalSourceOf } from "./catalog-map-story";

// `unit` 계층: 여정맵 이야기 파이널(level-3 S8)의 구획 파생 — 원천 유닛은 레슨 노드 · 완료 키에서 빠지고 파이널
// 노드(진도 키 RP)가 그 문항을 씁니다. 원천이 없으면(옛 콘텐츠) 지금 그대로입니다.

const story: ItemStory = {
  lineId: "D2",
  hintAfterMiss: true,
  lead: [{ speaker: "점원", line: { ko: "봉투 드릴까요?" } }],
  line: { ko: "아니요, 괜찮아요." },
};
const plain = { id: "S1-01", type: "CLOZE", event: "R" } as unknown as LearningItem;
const storied = { ...plain, id: "S8-01", story } as unknown as LearningItem;
const unit = (id: string, items: LearningItem[]): LearningUnit => ({ id, order: 1, items });

function entryWith(units: LearningUnit[], requires?: string[]): CatalogEntry {
  return {
    id: "u01-water",
    order: 1,
    title: "물 사기",
    status: "ready",
    episode: {
      units,
      finalTest: { id: "RP", order: 99, items: [] },
      ...(requires === undefined ? {} : { completion: { requires } }),
    },
  } as unknown as CatalogEntry;
}

test("SM1. 모든 문항이 이야기인 마지막 유닛이 원천이고, 없으면 null이다", () => {
  expect(catalogStoryFinalSourceOf([unit("S1", [plain]), unit("S8", [storied])])).toBe("S8");
  expect(catalogStoryFinalSourceOf([unit("S1", [plain]), unit("S8", [storied, plain])])).toBeNull();
  expect(catalogStoryFinalSourceOf([unit("INT", [])])).toBeNull();
});

test("SM2. 원천 유닛은 레슨 키 · 완료 키에서 빠지고 구획에 원천 키로 실린다", () => {
  const [section] = catalogMapSectionsOf([
    entryWith(
      [unit("S1", [plain]), unit("S8", [storied]), unit("CULT", [plain])],
      ["S1", "S8", "CULT", "RP"],
    ),
  ]);
  if (section?.kind !== "catalog-ready") throw new Error("not ready");
  expect(section.lessonKeys).toEqual(["S1", "CULT"]);
  expect(section.completionKeys).toEqual(["S1", "CULT", "RP"]);
  expect(section.finalKey).toBe("RP");
  expect(section.storyFinalKey).toBe("S8");
});

test("SM3. 원천이 없으면 레슨 키 · 완료 키가 지금 그대로이고 원천 키가 없다", () => {
  const [section] = catalogMapSectionsOf([entryWith([unit("S1", [plain]), unit("S8", [plain])])]);
  if (section?.kind !== "catalog-ready") throw new Error("not ready");
  expect(section.lessonKeys).toEqual(["S1", "S8"]);
  expect(section.completionKeys).toEqual(["RP"]);
  expect(section).not.toHaveProperty("storyFinalKey");
});
