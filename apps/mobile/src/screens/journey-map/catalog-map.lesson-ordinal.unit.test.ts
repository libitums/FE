import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import type { CatalogEntry } from "../../lib/episode-catalog";
import { catalogLessonOrdinalOf, catalogMapSectionsOf } from "./catalog-map";

// `unit` 계층: 레슨 완료 카드의 칩(`Lesson n`)이 쓰는 순번 — 맵 노드의 순번과 같은 규칙인가만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const [first] = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const sections = catalogMapSectionsOf([{ ...(first as ReadyEntry), id: "a", order: 1 }]);

describe("catalogLessonOrdinalOf (CLO)", () => {
  test("CLO1. 레슨 키는 맵 노드와 같은 1부터의 순번이다", () => {
    expect(catalogLessonOrdinalOf(sections, "a", "S1")).toBe(1);
    expect(catalogLessonOrdinalOf(sections, "a", "S3")).toBe(3);
  });

  test("CLO2. 문화 · 최종 · 모르는 키 · 모르는 에피소드는 순번이 없다 — 칩을 지어내지 않는다", () => {
    expect(catalogLessonOrdinalOf(sections, "a", "CULT")).toBeUndefined();
    expect(catalogLessonOrdinalOf(sections, "a", "RP")).toBeUndefined();
    expect(catalogLessonOrdinalOf(sections, "a", "ZZ")).toBeUndefined();
    expect(catalogLessonOrdinalOf(sections, "b", "S1")).toBeUndefined();
  });
});
