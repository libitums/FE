import { describe, expect, test } from "vitest";

import type { CatalogProgress } from "../../lib/catalog-progress";
import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import type { CatalogEntry, LockReason } from "../../lib/episode-catalog";
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
  catalogCoverStatus,
  catalogLockedNodeAccessibilityLabel,
  catalogLockedNodeTitle,
  catalogLockedNodesOf,
  catalogMapSectionsOf,
  catalogSectionDomId,
  catalogSectionProgress,
  catalogSelectorToken,
  catalogUnavailableAccessibilityLabel,
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
    expect(first.lessonKeys).toEqual(["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"]);
    expect(first.finalKey).toBe("RP");
    expect(first.title).toBe(realCatalog[0]?.title);
    expect(first.title).toBe("익선동 골목 어귀 편의점");
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
    ready("A", 1),
    ready("B", 2),
    pending("C", 3),
    ready("D", 4),
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

  test("CM8. 레슨 여덟 + 최종 하나, 순서와 번호가 맞다", () => {
    const u01 = u01Section();
    const nodes = catalogLockedNodesOf(u01);

    expect(nodes).toHaveLength(9);
    expect(nodes.slice(0, 8).map((node) => node.role)).toEqual(Array(8).fill("lesson"));
    expect(nodes.slice(0, 8).map((node) => node.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(nodes.slice(0, 8).map((node) => node.key)).toEqual(u01.lessonKeys);
    expect(nodes[8]).toEqual({ key: "RP", role: "final", ordinal: 9 });
  });

  test("CM9. 끝낸 유닛 수는 표지와 알려진 키만 센다", () => {
    const u01 = u01Section();
    expect(catalogSectionProgress(u01, { "u01-water": ["intro", "S1", "X"] })).toEqual({
      completed: 2,
      total: 10,
    });
    expect(catalogSectionProgress(u01, {})).toEqual({ completed: 0, total: 10 });
  });

  test("CM9. 다른 에피소드의 진행은 세지 않는다", () => {
    const u01 = u01Section();
    expect(catalogSectionProgress(u01, { "u02-checkin": ["intro", "S1"] })).toEqual({
      completed: 0,
      total: 10,
    });
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

  test("CM11. 잠긴 노드의 이름과 낭독을 문구표가 낸다", () => {
    const lesson = { key: "S1", role: "lesson", ordinal: 1 } as const;
    const final = { key: "RP", role: "final", ordinal: 9 } as const;

    expect(catalogLockedNodeTitle(lesson, uiCopyEn)).toBe("Lesson 1");
    expect(catalogLockedNodeTitle(final, uiCopyEn)).toBe("Final test");
    expect(catalogLockedNodeAccessibilityLabel(lesson, uiCopyEn)).toBe("Lesson 1, coming soon");
    expect(catalogLockedNodeAccessibilityLabel(final, uiCopyEn)).toBe("Final test, coming soon");
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
    const nodes = catalogLockedNodesOf(section);
    const status = catalogCoverStatus(first, 1, gate(true, progress));

    expect({ catalog, progress }).toEqual(snapshot);
    expect(second).toEqual(first);
    expect(catalogLockedNodesOf(section)).toEqual(nodes);
    expect(catalogCoverStatus(first, 1, gate(true, progress))).toBe(status);
    expect(catalogSectionProgress(section, progress)).toEqual(
      catalogSectionProgress(section, progress),
    );
  });
});
