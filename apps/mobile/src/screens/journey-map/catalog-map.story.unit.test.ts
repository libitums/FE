import { describe, expect, test } from "vitest";

import { catalogStoryModelOf } from "../../app/catalog-story";
import { noEpisodeContent } from "../../app/episode-content";
import { isCatalogEpisodeComplete } from "../../lib/catalog-progress";
import { catalogUnitTicketCost } from "../../lib/catalog-ticket-cost";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog, CONTENT_CLIENT_LEVEL } from "../../lib/episode-catalog";
import type { CatalogEntry } from "../../lib/episode-catalog";
import type { EpisodeStory, LearningUnit } from "../../lib/episode-content.model";
import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  catalogLessonOrdinalOf,
  catalogMapSectionsOf,
  catalogUnitNodeTitle,
  catalogUnitNodesOf,
  catalogUnitStatus,
} from "./catalog-map";
import { catalogIsStoryUnit, catalogStoryIconsOf, catalogStoryKeysOf } from "./catalog-map-story";
import type { CatalogReadySection } from "./catalog-map.contract";

// `unit` 계층: 막간 이야기 유닛(ADR-0088)의 맵 파생 — 스페셜 노드 · 레슨 번호 · 사슬 · 완료 · 티켓 · 컷 모델.

const EP = "u01-water";
const story: EpisodeStory = {
  form: "cuts",
  caption: { ko: "그 시각, 게스트하우스", roman: "geu sigak", en: "Meanwhile, at the guesthouse" },
  cuts: [
    {
      kind: "narration",
      index: 1,
      narration: { ko: "새 손님이 오는 날.", en: "A new guest." },
      imageBrief: "",
      imageUrl: "images/u01-water/int-1.webp",
    },
    {
      kind: "speech",
      index: 2,
      speaker: "낯선 사람",
      line: { ko: "새로 오셨나 봐요?", en: "New here?" },
      aside: { ko: "" },
      imageBrief: "",
      imageUrl: "images/u01-water/int-2.webp",
    },
  ],
};
const storyUnit: LearningUnit = { id: "INT", order: 5, items: [], story };

// 실제 내장 u01에 S4 뒤 INT를 끼우고 완료 키에도 넣은 카탈로그입니다.
function catalogWithStory(): readonly CatalogEntry[] {
  return buildEpisodeCatalog({
    bundled: bundledCatalogInput,
    cache: { manifest: null, episodes: {} },
  }).map((entry) => {
    if (entry.id !== EP || entry.status !== "ready") return entry;
    const units = [...entry.episode.units];
    units.splice(units.findIndex((unit) => unit.id === "S4") + 1, 0, storyUnit);
    const requires = [...units.map((unit) => unit.id), entry.episode.finalTest.id];
    return { ...entry, episode: { ...entry.episode, units, completion: { requires } } };
  });
}

const catalog = catalogWithStory();
const sections = catalogMapSectionsOf(catalog);
const section = sections.find((candidate) => candidate.episodeId === EP) as CatalogReadySection;
const through = (...keys: string[]) => ({ [EP]: ["intro", ...keys] });

describe("이야기 유닛의 맵 파생", () => {
  test("ST1. story가 있는 유닛만 storyKeys에 들고 구획에 실린다", () => {
    expect(catalogStoryKeysOf([storyUnit, { id: "S1", order: 1, items: [] }])).toEqual(["INT"]);
    expect(section.storyKeys).toEqual(["INT"]);
    expect(section.lessonKeys).toContain("INT");
  });

  test("ST2. 노드 순서는 Lesson 4 · Story · Lesson 5이고 레슨 번호는 이야기를 건너뛴다", () => {
    const nodes = catalogUnitNodesOf(section, {});
    const labels = nodes.map(
      (node) => `${node.key}:${node.role}:${catalogUnitNodeTitle(node, uiCopyEn)}`,
    );
    expect(labels.slice(3, 6)).toEqual([
      "S4:lesson:Lesson 4",
      "INT:story:Story",
      "S5:lesson:Lesson 5",
    ]);
    expect(catalogLessonOrdinalOf(sections, EP, "S5")).toBe(5);
    expect(catalogLessonOrdinalOf(sections, EP, "INT")).toBeUndefined();
  });

  test("ST3. 사슬 — S4 뒤 INT가 열리고, INT를 끝내야 S5가 열린다. 이미 끝낸 S5는 completed", () => {
    expect(catalogUnitStatus(section, "INT", through("S1", "S2", "S3", "S4"))).toBe("available");
    expect(catalogUnitStatus(section, "S5", through("S1", "S2", "S3", "S4"))).toBe("locked");
    expect(catalogUnitStatus(section, "S5", through("S1", "S2", "S3", "S4", "INT"))).toBe(
      "available",
    );
    expect(catalogUnitStatus(section, "S5", through("S1", "S2", "S3", "S4", "S5"))).toBe(
      "completed",
    );
  });

  test("ST4. 완료 키에서 이야기가 빠진다 — INT만 안 본 진행도 에피소드 완료다", () => {
    expect(section.completionKeys).not.toContain("INT");
    const allButStory = section.lessonKeys.filter((key) => key !== "INT");
    expect(
      isCatalogEpisodeComplete({ [EP]: [...allButStory, "RP"] }, EP, section.completionKeys),
    ).toBe(true);
  });

  test("ST5. 이야기 유닛은 티켓 0이다 — 구획에서 판정한다", () => {
    expect(catalogIsStoryUnit(sections, EP, "INT")).toBe(true);
    expect(catalogIsStoryUnit(sections, EP, "S5")).toBe(false);
    expect(catalogIsStoryUnit(sections, "nope", "INT")).toBe(false);
    expect(catalogUnitTicketCost({}, EP, "INT", {}, true)).toBe(0);
    expect(catalogUnitTicketCost({}, EP, "S5", {}, false)).toBe(1);
  });

  test("ST6. 이야기 모델 — 자막 · 첫 컷 그림은 시작 화면에, 컷은 본편만이고 형식을 싣는다. 이야기가 아니면 null", () => {
    const content = {
      ...noEpisodeContent,
      catalog,
      imageUrlOf: (path: string) => `https://x/${path}`,
    };
    const model = catalogStoryModelOf(content, sections, EP, "INT", {});
    expect(model?.ordinal).toBe(section.ordinal);
    expect(model?.form).toBe("cuts");
    expect(model?.intro).toEqual({
      ordinal: section.ordinal,
      caption: { ko: "그 시각, 게스트하우스", en: "Meanwhile, at the guesthouse" },
      backgroundUrl: "https://x/images/u01-water/int-1.webp",
    });
    expect(model?.cuts.map((cut) => [cut.kind, cut.text.ko, cut.imageUrl])).toEqual([
      ["narration", "새 손님이 오는 날.", "https://x/images/u01-water/int-1.webp"],
      ["line", "새로 오셨나 봐요?", "https://x/images/u01-water/int-2.webp"],
    ]);
    expect(model?.chat).toBeNull();
    expect(model?.call).toBeNull();
    expect(catalogStoryModelOf(content, sections, EP, "S5", {})).toBeNull();
  });

  test("ST7. 앱은 콘텐츠 수준 2다 — 수준 2 매니페스트부터 읽는다(ADR-0087)", () => {
    expect(CONTENT_CLIENT_LEVEL).toBe(2);
  });
});

describe("catalogStoryIconsOf", () => {
  const unitWith = (id: string, form: string | null): LearningUnit =>
    ({
      id,
      order: 1,
      items: [],
      ...(form === null ? {} : { story: { ...story, form } }),
    }) as LearningUnit;

  test("ST8. 문자는 말풍선, 전화는 전화, 컷 · 사진 보기 · 모르는 형식은 필름이고 이야기 아닌 유닛은 없다", () => {
    expect(
      catalogStoryIconsOf([
        unitWith("A", "message"),
        unitWith("B", "call"),
        unitWith("C", "cuts"),
        unitWith("D", "look"),
        unitWith("E", "hologram"),
        unitWith("S1", null),
      ]),
    ).toEqual({ A: "chat", B: "phone", C: "film", D: "film", E: "film" });
  });
});
