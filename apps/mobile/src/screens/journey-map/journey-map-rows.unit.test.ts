import { describe, expect, test } from "vitest";

import { catalogUnitNodesOf } from "./catalog-map";
import type { CatalogReadySection, CatalogUnitNode } from "./catalog-map.contract";
import { journeyMapSections } from "./journey-map";
import type { JourneyMapItem } from "./journey-map";
import {
  catalogNodePlacement,
  catalogRowsOf,
  mapRowItems,
  mapRowsOf,
  tutorialItemId,
  tutorialItemPlacement,
  tutorialRowsOf,
} from "./journey-map-rows";
import type { MapRow, MapUnitPlacement } from "./journey-map-rows";

// `unit` 계층: 줄 나누기의 입출력만 봅니다 — DOM · 컴포넌트를 import하지 않습니다.

type Cell = { readonly id: string; readonly placement: MapUnitPlacement };

const P = (id: string): Cell => ({ id, placement: "paired" });
const S = (id: string): Cell => ({ id, placement: "solo" });
const placementOf = (cell: Cell): MapUnitPlacement => cell.placement;
const rowsOf = (cells: readonly Cell[]) => mapRowsOf(cells, placementOf);
const kindsOf = (rows: readonly MapRow<unknown>[]) => rows.map((row) => row.kind);

function readySection(lessonCount: number): CatalogReadySection {
  return {
    kind: "catalog-ready",
    episodeId: "u01-water",
    ordinal: 1,
    title: "T",
    lessonKeys: Array.from({ length: lessonCount }, (_, index) => `S${index + 1}`),
    finalKey: "RP",
    completionKeys: ["RP"],
    cultureKeys: [],
  };
}

const tutorialItems = journeyMapSections[0]!.items;

describe("mapRowsOf", () => {
  test("R1. 빈 목록은 빈 줄 목록이다", () => {
    expect(rowsOf([])).toEqual([]);
  });

  test("R2. 일반 넷은 pair 둘이고 왼쪽이 앞 원소다", () => {
    const [a, b, c, d] = [P("p1"), P("p2"), P("p3"), P("p4")];
    expect(rowsOf([a, b, c, d])).toEqual([
      { kind: "pair", left: a, right: b },
      { kind: "pair", left: c, right: d },
    ]);
  });

  test("R3. 일반 셋은 pair 하나와 orphan 하나다", () => {
    const [a, b, c] = [P("p1"), P("p2"), P("p3")];
    expect(rowsOf([a, b, c])).toEqual([
      { kind: "pair", left: a, right: b },
      { kind: "orphan", item: c },
    ]);
  });

  test("R4. 한 줄 전용 셋은 solo 셋이다", () => {
    const cells = [S("s1"), S("s2"), S("s3")];
    expect(rowsOf(cells)).toEqual(cells.map((item) => ({ kind: "solo", item })));
  });

  test("R5. 한 줄 전용이 묶음을 끊고 양쪽 잔여가 각각 orphan이다", () => {
    const [a, b, c, s, d] = [P("p1"), P("p2"), P("p3"), S("s1"), P("p4")];
    expect(rowsOf([a, b, c, s, d])).toEqual([
      { kind: "pair", left: a, right: b },
      { kind: "orphan", item: c },
      { kind: "solo", item: s },
      { kind: "orphan", item: d },
    ]);
  });

  test("R6. 한 줄 전용 사이의 짝과, 한 줄 전용을 건너 짝을 잇지 않는 경우", () => {
    const first = [S("s1"), P("p1"), P("p2"), S("s2")];
    expect(kindsOf(rowsOf(first))).toEqual(["solo", "pair", "solo"]);

    const second = [P("p1"), S("s1"), P("p2")];
    expect(kindsOf(rowsOf(second))).toEqual(["orphan", "solo", "orphan"]);
  });

  test("R7. 길이 1 ~ 9의 모든 P/S 조합에서 순서 · 참조 · 배치가 보존된다", () => {
    let combinations = 0;
    for (let length = 1; length <= 9; length += 1) {
      for (let mask = 0; mask < 2 ** length; mask += 1) {
        const cells = Array.from({ length }, (_, index) =>
          (mask >> index) & 1 ? S(`c${index}`) : P(`c${index}`),
        );
        const rows = rowsOf(cells);
        combinations += 1;

        const flat = rows.flatMap(mapRowItems);
        expect(flat).toHaveLength(cells.length);
        flat.forEach((cell, index) => expect(cell).toBe(cells[index]));

        rows.forEach((row, rowIndex) => {
          if (row.kind === "pair") {
            expect(row.left.placement).toBe("paired");
            expect(row.right.placement).toBe("paired");
          } else if (row.kind === "orphan") {
            expect(row.item.placement).toBe("paired");
            expect(rows[rowIndex + 1]?.kind).not.toBe("pair");
          } else {
            expect(row.item.placement).toBe("solo");
          }
        });

        // 독립 판정: 연속한 일반 묶음마다 floor(L / 2)개의 pair와 홀수면 orphan 하나.
        const expectedKinds: string[] = [];
        let run = 0;
        const flush = () => {
          expectedKinds.push(...Array.from({ length: Math.floor(run / 2) }, () => "pair"));
          if (run % 2 === 1) expectedKinds.push("orphan");
          run = 0;
        };
        for (const cell of cells) {
          if (cell.placement === "paired") run += 1;
          else {
            flush();
            expectedKinds.push("solo");
          }
        }
        flush();
        expect(kindsOf(rows)).toEqual(expectedKinds);
      }
    }
    expect(combinations).toBe(1022);
  });
});

describe("mapRowItems", () => {
  test("pair는 [left, right], solo · orphan은 [item]이다", () => {
    const [a, b] = [P("a"), P("b")];
    expect(mapRowItems({ kind: "pair", left: a, right: b })).toEqual([a, b]);
    expect(mapRowItems({ kind: "solo", item: a })).toEqual([a]);
    expect(mapRowItems({ kind: "orphan", item: b })).toEqual([b]);
  });
});

describe("배치 표", () => {
  test("R11. 표 둘이 계약의 값과 리터럴로 같다", () => {
    expect(tutorialItemPlacement).toEqual({
      standard: "paired",
      "episode-intro": "solo",
      messenger: "solo",
      "phone-call": "solo",
      "visual-novel": "solo",
      "episode-final": "solo",
    });
    expect(catalogNodePlacement).toEqual({ lesson: "paired", culture: "solo", final: "solo" });
  });
});

describe("tutorialRowsOf · catalogRowsOf", () => {
  test("R8. 실데이터 튜토리얼 구획은 아홉 줄이고 첫 pair가 greeting · introduction이다", () => {
    const rows = tutorialRowsOf(tutorialItems, 2);

    expect(kindsOf(rows)).toEqual([
      "solo",
      "pair",
      "pair",
      "solo",
      "solo",
      "solo",
      "pair",
      "pair",
      "solo",
    ]);
    const first = rows[1];
    expect(first?.kind).toBe("pair");
    if (first?.kind === "pair") {
      expect(first.left).toBe(tutorialItems[1]);
      expect(first.right).toBe(tutorialItems[2]);
      expect((first.left as { step: { id: string } }).step.id).toBe("greeting");
      expect((first.right as { step: { id: string } }).step.id).toBe("introduction");
    }
    expect(rows.flatMap(mapRowItems)).toHaveLength(13);
  });

  test("R9. 레슨 8 + 최종은 pair 넷 뒤 solo 하나다", () => {
    const nodes = catalogUnitNodesOf(readySection(8), {});
    const rows = catalogRowsOf(nodes, 2);

    expect(kindsOf(rows)).toEqual(["pair", "pair", "pair", "pair", "solo"]);
    expect(rows.flatMap(mapRowItems).map((node) => node.key)).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "RP",
    ]);
    const first = rows[0];
    expect(first?.kind).toBe("pair");
    if (first?.kind === "pair") {
      expect(first.left.key).toBe("S1");
      expect(first.right.key).toBe("S2");
    }
  });

  test("R10. 레슨 7 + 최종은 pair 셋 · orphan · solo다", () => {
    const rows = catalogRowsOf(catalogUnitNodesOf(readySection(7), {}), 2);
    expect(kindsOf(rows)).toEqual(["pair", "pair", "pair", "orphan", "solo"]);
  });

  test("R12. 상태가 달라져도 줄 종류 · 짝이 같다", () => {
    const section = readySection(8);
    const locked = catalogRowsOf(catalogUnitNodesOf(section, {}), 2);
    const done = catalogRowsOf(
      catalogUnitNodesOf(section, {
        [section.episodeId]: ["intro", ...section.lessonKeys, "RP"],
      }),
      2,
    );
    const statuses = (rows: readonly MapRow<CatalogUnitNode>[]) =>
      new Set(rows.flatMap(mapRowItems).map((node) => node.status));
    const keys = (rows: readonly MapRow<CatalogUnitNode>[]) =>
      rows.map((row) => mapRowItems(row).map((node) => node.key));

    expect(statuses(locked)).not.toEqual(statuses(done));
    expect(kindsOf(done)).toEqual(["pair", "pair", "pair", "pair", "solo"]);
    expect(kindsOf(locked)).toEqual(kindsOf(done));
    expect(keys(locked)).toEqual(keys(done));
  });

  test("R13. 열 1이면 모든 줄이 solo이고 줄 수 = 유닛 수이며 순서가 보존된다", () => {
    const tutorial = tutorialRowsOf(tutorialItems, 1);
    expect(tutorial).toHaveLength(13);
    expect(tutorial.every((row) => row.kind === "solo")).toBe(true);
    tutorial.forEach((row, index) => {
      expect(mapRowItems(row)[0]).toBe(tutorialItems[index]);
    });

    for (const lessons of [8, 7]) {
      const nodes = catalogUnitNodesOf(readySection(lessons), {});
      const rows = catalogRowsOf(nodes, 1);
      expect(rows).toHaveLength(lessons + 1);
      expect(rows.every((row) => row.kind === "solo")).toBe(true);
      expect(rows.flatMap(mapRowItems)).toEqual(nodes);
    }
  });
});

describe("tutorialItemId", () => {
  test("R14. 스텝은 step.id, 특별 유닛은 id다", () => {
    const expected = [
      "tutorial-intro",
      "greeting",
      "introduction",
      "ordering",
      "appointment",
      "appointment-confirmation",
      "appointment-confirmation-phone-call",
      "cafe-arrival-visual-novel",
      "directions",
      "tutorial-listening",
      "tutorial-speaking",
      "tutorial-writing",
      "tutorial-final-test",
    ];
    expect(tutorialItems.map((item: JourneyMapItem) => tutorialItemId(item))).toEqual(expected);
  });
});
