import { describe, expect, test } from "vitest";

import type { CatalogProgress } from "../../lib/catalog-progress";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import type { CatalogEntry, LockReason } from "../../lib/episode-catalog";
import { legacyCatalogInput } from "../../lib/episode-legacy.test-support";
import { uiCopyEn } from "../../lib/ui-copy-en";
import type {
  CatalogGate,
  CatalogMapSection,
  CatalogReadySection,
  CatalogUnavailableReason,
  CatalogUnavailableSection,
} from "./catalog-map.contract";
import * as catalogMap from "./catalog-map";
import {
  TUTORIAL_GATE_UNIT,
  canStartCatalogCover,
  catalogCaptionKindOf,
  catalogCompletionKeysOf,
  catalogCoverStatus,
  canStartCatalogUnit,
  catalogCoverAccessibilityLabel,
  catalogMapSectionsOf,
  catalogSectionDomId,
  catalogUnitDomId,
  catalogSelectorToken,
  catalogUnavailableAccessibilityLabel,
  catalogUnitNodeAccessibilityLabel,
  catalogUnitNodeTitle,
  catalogUnitNodesOf,
  catalogUnitRoleOf,
  catalogUnitStatus,
  noCatalogMapSections,
  tutorialPassedFrom,
} from "./catalog-map";
import { episodeSectionId } from "./journey-map-scroll";

// `unit` 계층: 카탈로그 → 구획 파생, 잠금, 셀렉터 토큰, 진행, 캡션, 라벨의 입출력만 봅니다.

type ReadyEntry = Extract<CatalogEntry, { status: "ready" }>;

const realCatalog = buildEpisodeCatalog({
  bundled: bundledCatalogInput,
  cache: { manifest: null, episodes: {} },
});
const baseReady = realCatalog[0] as ReadyEntry;

function ready(id: string, order: number, title = `제목 ${id}`): ReadyEntry {
  return { ...baseReady, id, order, title };
}

// 완료 조건이 없는 옛 형식 에피소드 — 기본 완료 키(RP)로 판정되는 구획을 만듭니다.
const legacyReady = (id: string, order: number): ReadyEntry => {
  const [first] = buildEpisodeCatalog({
    bundled: legacyCatalogInput,
    cache: { manifest: null, episodes: {} },
  });
  return { ...(first as ReadyEntry), id, order, title: `제목 ${id}` };
};

function pending(id: string, order: number): CatalogEntry {
  return { status: "pending", id, order, title: `제목 ${id}`, version: "v1" };
}

function locked(id: string, order: number, reason: LockReason): CatalogEntry {
  return { status: "locked", id, order, title: `제목 ${id}`, version: "v1", reason };
}

function readySection(sections: readonly CatalogMapSection[], index: number): CatalogReadySection {
  const section = sections[index];
  expect(section?.kind).toBe("catalog-ready");
  return section as CatalogReadySection;
}

function gate(tutorialPassed: boolean, progress: CatalogProgress = {}): CatalogGate {
  return { tutorialPassed, progress };
}

describe("catalogMapSectionsOf", () => {
  test("CM1. 실데이터 카탈로그는 준비된 구획 셋을 자리 순서대로 낸다", () => {
    const sections = catalogMapSectionsOf(realCatalog);

    expect(sections.map((section) => section.kind)).toEqual([
      "catalog-ready",
      "catalog-ready",
      "catalog-ready",
    ]);
    expect(sections.map((section) => section.ordinal)).toEqual([1, 2, 3]);
    expect(sections.map((section) => section.episodeId)).toEqual([
      "u01-water",
      "u02-checkin",
      "u03-mina",
    ]);
    const first = readySection(sections, 0);
    expect(first.lessonKeys).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"]);
    expect(first.finalKey).toBe("RP");
    expect(first.title).toBe(realCatalog[0]?.title);
    expect(first.title).toBe("물 사기");
  });

  test("CM2. pending · locked 항목은 사유가 붙은 unavailable 구획이 된다", () => {
    const a = ready("a", 1);
    const sections = catalogMapSectionsOf([a, pending("b", 2), locked("c", 3, "client-too-old")]);

    expect(sections).toEqual([
      {
        kind: "catalog-ready",
        episodeId: "a",
        ordinal: 1,
        title: "제목 a",
        lessonKeys: a.episode.units.map((unit) => unit.id),
        finalKey: a.episode.finalTest.id,
        completionKeys: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"],
        cultureKeys: ["CULT"],
      },
      {
        kind: "catalog-unavailable",
        episodeId: "b",
        ordinal: 2,
        title: "제목 b",
        reason: "pending",
      },
      {
        kind: "catalog-unavailable",
        episodeId: "c",
        ordinal: 3,
        title: "제목 c",
        reason: "client-too-old",
      },
    ]);
  });

  test("CM3. 빈 카탈로그는 빈 구획이고 기본값 상수는 하나의 참조다", async () => {
    expect(catalogMapSectionsOf([])).toEqual([]);
    expect(noCatalogMapSections).toHaveLength(0);

    const again = await import("./catalog-map");
    expect(again.noCatalogMapSections).toBe(noCatalogMapSections);
    expect(catalogMap.noCatalogMapSections).toBe(noCatalogMapSections);
  });
});

describe("셀렉터 토큰", () => {
  test.each([
    ["u01-water", "u01-water"],
    ["a b", "a_20_b"],
    ["a_b", "a_5f_b"],
    ["a:b/c", "a_3a_b_2f_c"],
    ["한", "_d55c_"],
    ["", ""],
    ["😀", "_1f600_"],
  ])("CM4. catalogSelectorToken(%j) → %j", (input, expected) => {
    expect(catalogSelectorToken(input)).toBe(expected);
  });

  test("CM4. 출력은 셀렉터에 안전하고 서로 다른 입력은 서로 다른 출력이다", () => {
    const inputs = [
      "u01-water",
      "a b",
      "a_b",
      "a_20_b",
      "a:b/c",
      "a_3a_b_2f_c",
      "한",
      "",
      "x.y",
      "x_y",
    ];
    const tokens = inputs.map((input) => catalogSelectorToken(input));

    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]*$/);
    expect(new Set(tokens).size).toBe(inputs.length);
    expect(catalogSelectorToken("a_b")).not.toBe(catalogSelectorToken("a b"));
  });

  test("CM5. 구획 DOM id는 카탈로그 접두에 토큰을 붙이고 튜토리얼 접두와 다르다", () => {
    expect(catalogSectionDomId("u01-water")).toBe("journey-map-screen-catalog-u01-water");
    expect(catalogSectionDomId("a:b")).toBe("journey-map-screen-catalog-a_3a_b");
    expect(catalogSectionDomId("tutorial")).not.toBe(episodeSectionId("tutorial"));
    expect(episodeSectionId("tutorial").startsWith("journey-map-screen-catalog-")).toBe(false);
  });
});

describe("표지 잠금", () => {
  // A ready · B ready · C unavailable · D ready
  const sections = catalogMapSectionsOf([
    legacyReady("A", 1),
    legacyReady("B", 2),
    pending("C", 3),
    legacyReady("D", 4),
  ]);

  test("CM6. 첫 표지는 튜토리얼을 통과해야 열린다", () => {
    expect(catalogCoverStatus(sections, 0, gate(false))).toBe("locked");
    expect(catalogCoverStatus(sections, 0, gate(true))).toBe("available");
  });

  test("CM6. 끝낸 표지는 앞 조건과 무관하게 completed다", () => {
    expect(catalogCoverStatus(sections, 0, gate(false, { A: ["intro"] }))).toBe("completed");
    expect(catalogCoverStatus(sections, 0, gate(true, { A: ["intro"] }))).toBe("completed");
    expect(catalogCoverStatus(sections, 1, gate(false, { B: ["intro"] }))).toBe("completed");
  });

  test("CM6. 둘째 이후는 앞 에피소드의 최종 테스트를 끝내야 열린다", () => {
    expect(catalogCoverStatus(sections, 1, gate(true))).toBe("locked");
    expect(catalogCoverStatus(sections, 1, gate(true, { A: ["intro", "S1"] }))).toBe("locked");
    expect(catalogCoverStatus(sections, 1, gate(false, { A: ["RP"] }))).toBe("available");
  });

  test("CM6. unavailable 구획은 어떤 진행이어도 locked다", () => {
    expect(catalogCoverStatus(sections, 2, gate(true))).toBe("locked");
    expect(catalogCoverStatus(sections, 2, gate(true, { B: ["RP"], C: ["intro", "RP"] }))).toBe(
      "locked",
    );
  });

  test("CM6. 앞이 unavailable이어도 그 id의 최종 테스트가 진행에 있으면 열린다", () => {
    expect(catalogCoverStatus(sections, 3, gate(true))).toBe("locked");
    expect(catalogCoverStatus(sections, 3, gate(true, { C: ["RP"] }))).toBe("available");
  });

  test("CM7. 열린 표지만 시작할 수 있다", () => {
    const open = gate(true);

    expect(canStartCatalogCover(sections, "A", open)).toBe(true);
    expect(canStartCatalogCover(sections, "B", open)).toBe(false);
    expect(canStartCatalogCover(sections, "C", gate(true, { B: ["RP"] }))).toBe(false);
    expect(canStartCatalogCover(sections, "nope", open)).toBe(false);
    expect(canStartCatalogCover(sections, "A", gate(false, { A: ["intro"] }))).toBe(true);
    expect(canStartCatalogCover(sections, "A", gate(false))).toBe(false);
  });
});

describe("튜토리얼 통과", () => {
  test("CM12. 튜토리얼 최종 id가 있어야 통과다", () => {
    expect(tutorialPassedFrom([])).toBe(false);
    expect(tutorialPassedFrom(["tutorial-final-test"])).toBe(true);
    expect(TUTORIAL_GATE_UNIT).toBe("tutorial-final-test");
  });
});

describe("잠긴 노드와 진행", () => {
  // 수집 단계에서 던지지 않도록 테스트 안에서 만듭니다.
  const u01Section = () => readySection(catalogMapSectionsOf(realCatalog), 0);

  test("CM8′. 레슨 여덟 + 문화 + 최종 하나, 순서 · 번호 · 상태가 맞다", () => {
    const u01 = u01Section();
    const nodes = catalogUnitNodesOf(u01, {});

    expect(nodes).toHaveLength(10);
    expect(nodes.slice(0, 8).map((node) => node.role)).toEqual(Array(8).fill("lesson"));
    expect(nodes[8]?.role).toBe("culture");
    expect(nodes.slice(0, 9).map((node) => node.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(nodes.slice(0, 9).map((node) => node.key)).toEqual(u01.lessonKeys);
    expect(nodes[9]).toEqual({ key: "RP", role: "final", ordinal: 10, status: "locked" });
    expect(nodes.every((node) => node.status === "locked")).toBe(true);
  });
});

describe("사슬 잠금 — 표지 → 레슨들 → 최종", () => {
  const u01Section = () => readySection(catalogMapSectionsOf(realCatalog), 0);
  const statusesOf = (progress: CatalogProgress) =>
    Object.fromEntries(
      catalogUnitNodesOf(u01Section(), progress).map((node) => [node.key, node.status]),
    );
  const allKeys = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT", "RP"];

  test("CM-U1. 진행이 없으면 레슨 · 최종이 전부 잠겨 있다", () => {
    const statuses = statusesOf({});

    expect(allKeys.map((key) => statuses[key])).toEqual(Array(10).fill("locked"));
    expect(catalogUnitStatus(u01Section(), "S1", {})).toBe("locked");
  });

  test("CM-U2. 표지를 끝내면 첫 레슨만 열린다", () => {
    const statuses = statusesOf({ "u01-water": ["intro"] });

    expect(statuses["S1"]).toBe("available");
    expect(allKeys.slice(1).map((key) => statuses[key])).toEqual(Array(9).fill("locked"));
    expect(catalogUnitStatus(u01Section(), "S1", { "u01-water": ["intro"] })).toBe("available");
  });

  test("CM-U3. 바로 앞을 끝내면 열리고 끝낸 유닛은 앞이 아직이어도 completed다", () => {
    expect(statusesOf({ "u01-water": ["intro", "S1"] })["S2"]).toBe("available");
    expect(statusesOf({ "u01-water": ["intro", "S1"] })["S1"]).toBe("completed");
    expect(
      statusesOf({
        "u01-water": ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"],
      })["RP"],
    ).toBe("available");

    const skipped = statusesOf({ "u01-water": ["S5"] });
    expect(skipped["S5"]).toBe("completed");
    expect(skipped["S6"]).toBe("available");
    expect(skipped["S1"]).toBe("locked");
    expect(skipped["S7"]).toBe("locked");
  });

  test("CM-U3. 모르는 키는 잠겨 있고 다른 에피소드의 진행은 세지 않는다", () => {
    expect(catalogUnitStatus(u01Section(), "X", { "u01-water": ["intro", "S1"] })).toBe("locked");
    expect(statusesOf({ "u02-checkin": ["intro"] })["S1"]).toBe("locked");
  });

  test("CM-U4. 열린 레슨과 끝낸 레슨만 시작할 수 있다", () => {
    const sections = catalogMapSectionsOf(realCatalog);
    const openS1: CatalogProgress = { "u01-water": ["intro"] };
    const doneS5: CatalogProgress = { "u01-water": ["intro", "S1", "S3", "S4", "S5"] };

    expect(canStartCatalogUnit(sections, "u01-water", "S1", openS1)).toBe(true);
    expect(canStartCatalogUnit(sections, "u01-water", "S3", openS1)).toBe(false);
    expect(canStartCatalogUnit(sections, "u01-water", "S5", doneS5)).toBe(true);
    expect(canStartCatalogUnit(sections, "u01-water", "S2", openS1)).toBe(false);
    expect(canStartCatalogUnit(sections, "u01-water", "intro", openS1)).toBe(false);
    expect(canStartCatalogUnit(sections, "nope", "S1", openS1)).toBe(false);
  });

  test("CM-U4. 준비 안 된 구획은 시작할 수 없다", () => {
    const sections = catalogMapSectionsOf([pending("p1", 1)]);

    expect(canStartCatalogUnit(sections, "p1", "S1", { p1: ["intro"] })).toBe(false);
  });

  test("CM-U5. 유닛 역할은 레슨 · 최종 · 그 밖은 null이다", () => {
    const section = u01Section();

    expect(catalogUnitRoleOf(section, "S1")).toBe("lesson");
    expect(catalogUnitRoleOf(section, "RP")).toBe("final");
    expect(catalogUnitRoleOf(section, "intro")).toBeNull();
    expect(catalogUnitRoleOf(section, "X")).toBeNull();
  });
});

describe("완료 키 (CMF)", () => {
  const readyWith = (
    episodeId: string,
    ordinal: number,
    completionKeys: readonly string[],
  ): CatalogReadySection => ({
    kind: "catalog-ready",
    episodeId,
    ordinal,
    title: `제목 ${episodeId}`,
    lessonKeys: ["S1", "CULT"],
    finalKey: "RP",
    completionKeys,
    cultureKeys: [],
  });
  const unavailable = (episodeId: string, ordinal: number): CatalogUnavailableSection => ({
    kind: "catalog-unavailable",
    episodeId,
    ordinal,
    title: `제목 ${episodeId}`,
    reason: "pending",
  });

  test("CMF1. completion이 있는 에피소드는 requires가, 없는 에피소드는 RP가 완료 키다", () => {
    const withCompletion = catalogMapSectionsOf([ready("a", 1)]);
    expect(readySection(withCompletion, 0).completionKeys).toEqual([
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

    const legacy = buildEpisodeCatalog({
      bundled: legacyCatalogInput,
      cache: { manifest: null, episodes: {} },
    });
    const legacySections = catalogMapSectionsOf(legacy);
    expect(legacySections.map((section) => readySection([section], 0).completionKeys)).toEqual([
      ["RP"],
      ["RP"],
      ["RP"],
    ]);
  });

  test("CMF2. 다음 표지는 앞 에피소드의 완료 키를 모두 끝내야 열린다", () => {
    const sections = [readyWith("a", 1, ["S1", "CULT", "RP"]), readyWith("b", 2, ["RP"])];
    const noCult = gate(true, { a: ["intro", "S1", "RP"] });
    const withCult = gate(true, { a: ["intro", "S1", "CULT", "RP"] });

    expect(catalogCoverStatus(sections, 1, noCult)).toBe("locked");
    expect(catalogCoverStatus(sections, 1, withCult)).toBe("available");
    expect(canStartCatalogCover(sections, "b", noCult)).toBe(false);
    expect(canStartCatalogCover(sections, "b", withCult)).toBe(true);
  });

  test("CMF2. 앞 구획이 준비 안 됐으면 RP 규칙이다", () => {
    const sections = [unavailable("a", 1), readyWith("b", 2, ["RP"])];

    expect(catalogCoverStatus(sections, 1, gate(true, { a: ["S1"] }))).toBe("locked");
    expect(catalogCoverStatus(sections, 1, gate(true, { a: ["RP"] }))).toBe("available");
  });

  test("CMF3. 완료 키 해석기는 준비된 구획의 키를, 모르는 id · 준비 안 된 구획은 RP를 낸다", () => {
    const keysOf = catalogCompletionKeysOf([
      readyWith("a", 1, ["S1", "CULT", "RP"]),
      unavailable("b", 2),
    ]);

    expect(keysOf("a")).toEqual(["S1", "CULT", "RP"]);
    expect(keysOf("b")).toEqual(["RP"]);
    expect(keysOf("nope")).toEqual(["RP"]);
    expect(keysOf("toString")).toEqual(["RP"]);
  });

  test("CMF4′. u01은 레슨 아홉(CULT가 아홉째, 문화 노드)과 최종으로 이어지고 사슬 잠금이 CULT를 지난다", () => {
    const u01 = readySection(catalogMapSectionsOf(realCatalog), 0);
    const statusesOf = (progress: CatalogProgress) =>
      Object.fromEntries(catalogUnitNodesOf(u01, progress).map((node) => [node.key, node.status]));
    const throughS8 = ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];

    expect(u01.lessonKeys).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "CULT"]);
    expect(u01.finalKey).toBe("RP");
    expect(catalogUnitNodesOf(u01, {})[8]).toEqual({
      key: "CULT",
      role: "culture",
      ordinal: 9,
      status: "locked",
    });
    const afterS8 = statusesOf({ "u01-water": throughS8 });
    expect(afterS8["CULT"]).toBe("available");
    expect(afterS8["RP"]).toBe("locked");
    const afterCult = statusesOf({ "u01-water": [...throughS8, "CULT"] });
    expect(afterCult["CULT"]).toBe("completed");
    expect(afterCult["RP"]).toBe("available");
  });
});

describe("캡션과 라벨", () => {
  test.each([
    ["pending", "pending"],
    ["client-too-old", "update"],
    ["unsupported-schema", "update"],
    ["integrity-mismatch", "unavailable"],
    ["decode-failed", "unavailable"],
  ] as const satisfies readonly (readonly [CatalogUnavailableReason, string])[])(
    "CM10. %s → %s",
    (reason, kind) => {
      expect(catalogCaptionKindOf(reason)).toBe(kind);
    },
  );

  const unavailable = (reason: CatalogUnavailableReason): CatalogUnavailableSection => ({
    kind: "catalog-unavailable",
    episodeId: "e4",
    ordinal: 4,
    title: "Ep",
    reason,
  });

  test("CM11′. 레슨 · 최종 · 표지 노드의 이름과 낭독을 문구표가 낸다", () => {
    const lesson = { key: "S1", role: "lesson", ordinal: 1, status: "locked" } as const;
    const final = { key: "RP", role: "final", ordinal: 9, status: "locked" } as const;

    expect(catalogUnitNodeTitle(lesson, uiCopyEn)).toBe("Lesson 1");
    expect(catalogUnitNodeTitle(final, uiCopyEn)).toBe("Final test");
    expect(catalogUnitNodeAccessibilityLabel(1, lesson, uiCopyEn)).toBe("Episode 1. Lesson 1");
    expect(catalogUnitNodeAccessibilityLabel(1, final, uiCopyEn)).toBe("Episode 1. Final test");
    expect(catalogCoverAccessibilityLabel(1, uiCopyEn)).toBe("Episode 1. Episode intro");
  });

  test("CM11. 준비 안 된 구획의 낭독은 사유 종류별 꼬리를 문다", () => {
    expect(catalogUnavailableAccessibilityLabel(unavailable("pending"), uiCopyEn)).toBe(
      "Episode 4. Ep, coming soon",
    );
    expect(catalogUnavailableAccessibilityLabel(unavailable("client-too-old"), uiCopyEn)).toBe(
      "Episode 4. Ep, update the app to open",
    );
    expect(catalogUnavailableAccessibilityLabel(unavailable("decode-failed"), uiCopyEn)).toBe(
      "Episode 4. Ep, not available",
    );
  });
});

describe("순수성", () => {
  test("CM13. 입력을 바꾸지 않고 같은 입력이면 같은 결과다", () => {
    const catalog = [ready("A", 1), pending("B", 2), locked("C", 3, "decode-failed")];
    const progress: CatalogProgress = { A: ["intro", "S1"] };
    const snapshot = structuredClone({ catalog, progress });

    const first = catalogMapSectionsOf(catalog);
    const second = catalogMapSectionsOf(catalog);
    const section = readySection(first, 0);
    const nodes = catalogUnitNodesOf(section, progress);
    const status = catalogCoverStatus(first, 1, gate(true, progress));

    expect({ catalog, progress }).toEqual(snapshot);
    expect(second).toEqual(first);
    expect(catalogUnitNodesOf(section, progress)).toEqual(nodes);
    expect(catalogCoverStatus(first, 1, gate(true, progress))).toBe(status);
  });
});

describe("catalogUnitDomId", () => {
  const SAFE = /^[A-Za-z0-9_-]+$/;

  test("CD1. 결과가 선택자에 안전한 문자만 가진다", () => {
    for (const [episodeId, key] of [
      ["u01-water", "intro"],
      ["u01-water", "S1"],
      ["a b", "x/y"],
      ["한글", "RP"],
      ["a:b", "😀"],
    ] as const) {
      expect(catalogUnitDomId(episodeId, key)).toMatch(SAFE);
    }
  });

  test("CD2. 단사다 — 어떤 (에피소드, 키) 쌍도 겹치지 않는다", () => {
    expect(catalogUnitDomId("a-b", "c")).not.toBe(catalogUnitDomId("a", "b-c"));
    expect(catalogUnitDomId("a_b", "c")).not.toBe(catalogUnitDomId("a", "_b_c"));

    const pairs: ReadonlyArray<readonly [string, string]> = [
      ["한", "S1"],
      ["글", "S1"],
      ["a b", "S1"],
      ["a", "b S1"],
      ["a/b", "c"],
      ["a", "b/c"],
      ["a", "b"],
      ["a-b", "c"],
      ["a", "b-c"],
      ["", "S1"],
    ];
    const ids = pairs.map(([episodeId, key]) => catalogUnitDomId(episodeId, key));
    expect(new Set(ids).size).toBe(pairs.length);
  });

  test("CD3. 같은 구획의 구획 id와 겹치지 않는다", () => {
    for (const episodeId of ["u01-water", "a", "한"]) {
      for (const key of ["intro", "S1", "RP"]) {
        expect(catalogUnitDomId(episodeId, key)).not.toBe(catalogSectionDomId(episodeId));
      }
    }
    expect(catalogUnitDomId("u01-water", "intro")).not.toBe(catalogUnitDomId("u01-water", "S1"));
  });
});
