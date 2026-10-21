import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import type { CatalogEntry } from "../../lib/episode-catalog";
import type { LearningItem, LearningUnit } from "../../lib/episode-content.model";
import { legacyCatalogInput } from "../../lib/episode-legacy.test-support";
import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  canStartCatalogUnit,
  catalogCompletionKeysOf,
  catalogCultureKeysOf,
  catalogMapSectionsOf,
  catalogUnitNodeAccessibilityLabel,
  catalogUnitNodeTitle,
  catalogUnitNodesOf,
  catalogUnitRoleOf,
} from "./catalog-map";
import type {
  CatalogMapSection,
  CatalogReadySection,
  CatalogUnitNode,
} from "./catalog-map.contract";

// `unit` 계층: 문화 단계의 콘텐츠 판별(cultureKeys)과 문화 노드(role · 제목 · 낭독)만 봅니다(순수 함수).

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});

const itemOf = (type: string, id: string): LearningItem =>
  ({ id, event: "R", type }) as unknown as LearningItem;
const unitOf = (id: string, types: readonly string[]): LearningUnit => ({
  id,
  order: 1,
  items: types.map((type, index) => itemOf(type, `${id}-${String(index)}`)),
});
const sixCulture = [
  "CULTURE_CARD",
  "CULTURE_CARD",
  "CULTURE_CARD",
  "CULTURE_CHECK",
  "CULTURE_CHECK",
  "CULTURE_CHECK",
];

function readyOf(catalog: readonly CatalogEntry[], index: number): CatalogReadySection {
  const section: CatalogMapSection | undefined = catalogMapSectionsOf(catalog)[index];
  if (section === undefined || section.kind !== "catalog-ready") throw new Error("ready 아님");
  return section;
}

function readyById(catalog: readonly CatalogEntry[], episodeId: string): CatalogReadySection {
  const section = catalogMapSectionsOf(catalog).find(
    (candidate) => candidate.episodeId === episodeId,
  );
  if (section === undefined || section.kind !== "catalog-ready") throw new Error("ready 아님");
  return section;
}

const throughS8 = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

describe("catalogCultureKeysOf (CN1)", () => {
  test("CN1. 모든 문항이 문화 유형인 유닛만 든다", () => {
    const units = [unitOf("S1", ["VOCAB_CARD", "CLOZE"]), unitOf("CULT", sixCulture)];

    expect(catalogCultureKeysOf(units)).toEqual(["CULT"]);
  });

  test("CN1. 문화 카드 하나가 섞인 일반 유닛은 들지 않는다", () => {
    const units = [unitOf("S1", ["VOCAB_CARD", "CULTURE_CARD", "CLOZE"]), unitOf("S2", ["CLOZE"])];

    expect(catalogCultureKeysOf(units)).toEqual([]);
  });

  test("CN1. 문화 확인만 있는 유닛도 든다", () => {
    expect(catalogCultureKeysOf([unitOf("C1", ["CULTURE_CHECK", "CULTURE_CHECK"])])).toEqual([
      "C1",
    ]);
  });

  test("CN1. 빈 유닛은 들지 않는다", () => {
    expect(catalogCultureKeysOf([unitOf("S1", [])])).toEqual([]);
    expect(catalogCultureKeysOf([])).toEqual([]);
  });

  test("CN1. 유닛 id가 CULT가 아니어도 내용이 문화면 든다(이름으로 가르지 않는다)", () => {
    const units = [
      unitOf("S1", ["CLOZE"]),
      unitOf("C9", sixCulture),
      unitOf("C10", ["CULTURE_CARD"]),
    ];

    expect(catalogCultureKeysOf(units)).toEqual(["C9", "C10"]);
  });

  test("CN1. 이름이 CULT여도 내용이 문화가 아니면 들지 않는다", () => {
    expect(catalogCultureKeysOf([unitOf("CULT", ["VOCAB_CARD", "CULTURE_CHECK"])])).toEqual([]);
  });

  test("CN1. 입력을 바꾸지 않고 같은 입력이면 같은 결과다", () => {
    const units = [unitOf("S1", ["CLOZE"]), unitOf("CULT", sixCulture)];
    const snapshot = structuredClone(units);

    expect(catalogCultureKeysOf(units)).toEqual(catalogCultureKeysOf(units));
    expect(units).toEqual(snapshot);
  });
});

describe("catalogMapSectionsOf — cultureKeys (CN2)", () => {
  test("CN2. 내장 u01 구획은 cultureKeys가 [CULT]다", () => {
    expect(readyById(realCatalog, "u01-water").cultureKeys).toEqual(["CULT"]);
  });

  test("CN2. u01 ~ u03 모두 CULT가 문화 유닛이다", () => {
    for (const episodeId of ["u01-water", "u02-checkin", "u03-mina"]) {
      expect(readyById(realCatalog, episodeId).cultureKeys).toEqual(["CULT"]);
    }
  });

  test("CN2. 튜토리얼(u00)은 S12 · S13 둘이 문화 유닛이다", () => {
    expect(readyById(realCatalog, "u00-tutorial").cultureKeys).toEqual(["S12", "S13"]);
  });

  test("CN2. 옛 픽스처 에피소드에는 문화 유닛이 없다", () => {
    const legacy = buildEpisodeCatalog({
      bundled: legacyCatalogInput,
      cache: { manifest: null, episodes: {} },
    });

    expect(readyOf(legacy, 0).cultureKeys).toEqual([]);
  });

  test("CN2. 준비 안 된 구획에는 cultureKeys 필드가 없다", () => {
    const sections = catalogMapSectionsOf([
      { status: "pending", id: "p", order: 1, title: "P", version: "v1" },
    ]);

    expect(sections[0]).toBeDefined();
    expect(Object.hasOwn(sections[0] ?? {}, "cultureKeys")).toBe(false);
  });
});

describe("catalogUnitNodesOf — 문화 노드 (CN3)", () => {
  test("CN3. 문화 키 노드는 role culture이고 번호는 레슨 키 순번 그대로다", () => {
    const nodes = catalogUnitNodesOf(readyById(realCatalog, "u01-water"), {
      "u01-water": throughS8,
    });

    expect(nodes[8]).toEqual({ key: "CULT", role: "culture", ordinal: 9, status: "available" });
  });

  test("CN3. 나머지 레슨은 lesson이고 최종은 레슨 수 + 1번이다", () => {
    const nodes = catalogUnitNodesOf(readyById(realCatalog, "u01-water"), {});

    expect(nodes.slice(0, 8).map((node) => node.role)).toEqual(Array(8).fill("lesson"));
    expect(nodes.slice(0, 8).map((node) => node.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(nodes[9]).toEqual({ key: "RP", role: "final", ordinal: 10, status: "locked" });
  });

  test("CN3. 문화 노드의 상태는 사슬 그대로다 — 잠김 · 열림 · 끝", () => {
    const section = readyById(realCatalog, "u01-water");
    const statusOf = (done: readonly string[]) =>
      catalogUnitNodesOf(section, { "u01-water": done }).find((node) => node.key === "CULT")
        ?.status;

    expect(statusOf(["intro", "S1"])).toBe("locked");
    expect(statusOf(throughS8)).toBe("available");
    expect(statusOf([...throughS8, "CULT"])).toBe("completed");
  });

  test("CN3. 문화 단계가 레슨 사이에 와도 그 키만 culture다", () => {
    const section: CatalogReadySection = {
      kind: "catalog-ready",
      episodeId: "x",
      ordinal: 1,
      title: "X",
      lessonKeys: ["S1", "C1", "S2"],
      finalKey: "RP",
      completionKeys: ["RP"],
      cultureKeys: ["C1"],
    };

    expect(
      catalogUnitNodesOf(section, {}).map((node) => [node.key, node.role, node.ordinal]),
    ).toEqual([
      ["S1", "lesson", 1],
      ["C1", "culture", 2],
      ["S2", "lesson", 3],
      ["RP", "final", 4],
    ]);
  });
});

describe("문화 노드 제목 · 낭독 (CN4)", () => {
  const culture = (ordinal: number): CatalogUnitNode => ({
    key: "CULT",
    role: "culture",
    ordinal,
    status: "locked",
  });

  test("CN4. 제목은 번호와 상관없이 Culture다", () => {
    expect(catalogUnitNodeTitle(culture(9), uiCopyEn)).toBe("Culture");
    expect(catalogUnitNodeTitle(culture(3), uiCopyEn)).toBe("Culture");
  });

  test("CN4. 낭독은 에피소드 번호 + Culture다", () => {
    expect(catalogUnitNodeAccessibilityLabel(1, culture(9), uiCopyEn)).toBe("Episode 1. Culture");
    expect(catalogUnitNodeAccessibilityLabel(3, culture(9), uiCopyEn)).toBe("Episode 3. Culture");
  });
});

describe("변하지 않는 것 (CN5)", () => {
  const u01 = () => readyById(realCatalog, "u01-water");

  test("CN5. 결선이 쓰는 역할은 문화 키도 lesson이다", () => {
    expect(catalogUnitRoleOf(u01(), "CULT")).toBe("lesson");
    expect(catalogUnitRoleOf(u01(), "RP")).toBe("final");
  });

  test("CN5. 시작 규칙과 완료 키는 그대로다", () => {
    const section = u01();
    const sections = [section];

    expect(canStartCatalogUnit(sections, "u01-water", "CULT", { "u01-water": throughS8 })).toBe(
      true,
    );
    expect(canStartCatalogUnit(sections, "u01-water", "CULT", { "u01-water": ["intro"] })).toBe(
      false,
    );
    expect(catalogCompletionKeysOf(sections)("u01-water")).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "CULT",
      "RP",
    ]);
  });

  test("CN5. 문화 노드도 레슨 키에 든다 — 노드는 열 개다", () => {
    expect(u01().lessonKeys).toContain("CULT");
    expect(catalogUnitNodesOf(u01(), {})).toHaveLength(10);
  });
});
