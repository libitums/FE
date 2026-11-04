import { describe, expect, test } from "vitest";

import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import {
  FOOTPRINT_STEP,
  clearedSegmentsOf,
  footprintEnterDelayMs,
  footprintLayoutOf,
  footprintsAlong,
  mapNodeAnchorOf,
  mapNodeShapeOf,
  type MapCellRect,
} from "./map-footprints";

// `unit` 계층: 발자국의 순수 파생 — 기하 · 구간 · 모양 · 자리 · 지연. 던지지 않습니다.

const section = {
  episodeId: "u01-water",
  lessonKeys: ["S1", "S2", "CULT", "S3"],
  finalKey: "RP",
  storyKeys: ["S3"],
};

describe("footprintsAlong", () => {
  test("FP1. 가로 구간: 개수 = round(길이 / 20), 좌우 ±5 번갈아(첫 발 왼쪽), 발끝은 오른쪽(90°)", () => {
    // 중심 거리 199, inset 56 · 56 → 길이 87 → 4개. 경로 y = 100이고 오른쪽으로 가므로 왼쪽 = 위(y − 5).
    const prints = footprintsAlong({ x: 0, y: 100 }, { x: 199, y: 100 }, 56, 56);
    expect(prints).toHaveLength(4);
    expect(prints.map((p) => p.flip)).toEqual([-1, 1, -1, 1]);
    expect(prints.map((p) => p.rotation)).toEqual([90, 90, 90, 90]);
    expect(prints.map((p) => Math.round(p.x))).toEqual([67, 89, 110, 132]);
    expect(prints.map((p) => p.y)).toEqual([95, 105, 95, 105]);
  });

  test("FP1. 세로 아래 구간은 180°, 대각은 atan2 + 90, 길이가 0 이하면 빈 목록", () => {
    const down = footprintsAlong({ x: 50, y: 0 }, { x: 50, y: 200 }, 50, 50);
    expect(down).toHaveLength(5);
    expect(down.every((p) => p.rotation === 180)).toBe(true);
    // 아래로 갈 때 왼쪽은 +x.
    expect(down.map((p) => p.x)).toEqual([55, 45, 55, 45, 55]);

    const diagonal = footprintsAlong({ x: 0, y: 0 }, { x: 100, y: 100 }, 20, 20);
    expect(diagonal.length).toBe(
      Math.max(2, Math.round((Math.hypot(100, 100) - 40) / FOOTPRINT_STEP)),
    );
    expect(diagonal.every((p) => p.rotation === 135)).toBe(true);

    expect(footprintsAlong({ x: 0, y: 0 }, { x: 100, y: 0 }, 56, 56)).toEqual([]);
    expect(footprintsAlong({ x: 0, y: 0 }, { x: 0, y: 0 }, 0, 0)).toEqual([]);
  });

  test("FP1. 짧은 구간도 최소 둘", () => {
    expect(footprintsAlong({ x: 0, y: 0 }, { x: 130, y: 0 }, 56, 56)).toHaveLength(2);
  });
});

describe("clearedSegmentsOf", () => {
  test("FP2. 진행 없음 → 없음, intro 끝 → intro→S1, 셋 끝 → 셋, 마지막은 S3→RP이고 RP 뒤는 없다", () => {
    expect(clearedSegmentsOf(section, {})).toEqual([]);
    expect(clearedSegmentsOf(section, { "u01-water": [CATALOG_INTRO_KEY] })).toEqual([
      { from: CATALOG_INTRO_KEY, to: "S1" },
    ]);
    expect(clearedSegmentsOf(section, { "u01-water": [CATALOG_INTRO_KEY, "S1", "S2"] })).toEqual([
      { from: CATALOG_INTRO_KEY, to: "S1" },
      { from: "S1", to: "S2" },
      { from: "S2", to: "CULT" },
    ]);
    const all = clearedSegmentsOf(section, {
      "u01-water": [CATALOG_INTRO_KEY, "S1", "S2", "CULT", "S3", "RP"],
    });
    expect(all).toHaveLength(5);
    expect(all[4]).toEqual({ from: "S3", to: "RP" });
  });

  test("FP2. 끝낸 유닛만 — 중간을 건너뛴 기록도 그 유닛의 다음 구간만", () => {
    expect(clearedSegmentsOf(section, { "u01-water": ["S2"] })).toEqual([
      { from: "S2", to: "CULT" },
    ]);
    expect(clearedSegmentsOf(section, { "u02-checkin": [CATALOG_INTRO_KEY] })).toEqual([]);
  });
});

describe("mapNodeShapeOf · mapNodeAnchorOf", () => {
  const rect: MapCellRect = { left: 10, top: 200, width: 100, height: 120 };

  test("FP3. intro · 최종 · 이야기는 square, 레슨 · 문화는 circle", () => {
    expect(mapNodeShapeOf(section, CATALOG_INTRO_KEY)).toBe("square");
    expect(mapNodeShapeOf(section, "RP")).toBe("square");
    expect(mapNodeShapeOf(section, "S3")).toBe("square");
    expect(mapNodeShapeOf(section, "S1")).toBe("circle");
    expect(mapNodeShapeOf(section, "CULT")).toBe("circle");
  });

  test("FP3. 중심은 표식 rect의 가운데, inset은 circle 56 · square 68", () => {
    expect(mapNodeAnchorOf(rect, "circle")).toEqual({ center: { x: 60, y: 260 }, inset: 56 });
    expect(mapNodeAnchorOf(rect, "square")).toEqual({ center: { x: 60, y: 260 }, inset: 68 });
    expect(mapNodeAnchorOf({ left: 0, top: 0, width: 124, height: 124 }, "square")).toEqual({
      center: { x: 62, y: 62 },
      inset: 68,
    });
  });
});

describe("footprintLayoutOf", () => {
  // 표식 rect — 표지 halo 124, 레슨 링 100(두 열 셀 가운데).
  const rects: Record<string, MapCellRect | undefined> = {
    [CATALOG_INTRO_KEY]: { left: 133, top: 100, width: 124, height: 124 },
    S1: { left: 51.5, top: 300, width: 100, height: 100 },
    S2: { left: 238.5, top: 300, width: 100, height: 100 },
  };
  const shapeOf = (key: string) => mapNodeShapeOf(section, key);

  test("FP4. 구획 원점을 뺀 좌표로 구간 순서대로 내고, rect 없는 구간은 뺀다", () => {
    const layout = footprintLayoutOf(
      [
        { from: CATALOG_INTRO_KEY, to: "S1" },
        { from: "S1", to: "S2" },
        { from: "S2", to: "CULT" },
      ],
      rects,
      { x: 16, y: 100 },
      shapeOf,
    );
    expect(layout.map((s) => [s.from, s.to])).toEqual([
      [CATALOG_INTRO_KEY, "S1"],
      ["S1", "S2"],
    ]);
    // S1 → S2: 중심 (101.5, 350) → (288.5, 350), inset 56 · 56 → 구획 기준 y 250.
    const horizontal = layout[1]?.prints ?? [];
    expect(horizontal.length).toBe(4);
    expect(horizontal.every((p) => p.rotation === 90)).toBe(true);
    expect(horizontal.map((p) => p.y)).toEqual([245, 255, 245, 255]);
    expect(Math.round(horizontal[0]?.x ?? 0)).toBe(Math.round(101.5 - 16 + 56 + 75 * 0.125));
    // intro → S1: 네모 중심 (195, 162) → 원 중심 (101.5, 350).
    const first = layout[0]?.prints ?? [];
    expect(first.length).toBeGreaterThanOrEqual(2);
    // 아래 왼쪽으로 내려가므로 발끝은 180°(아래)와 270°(왼쪽) 사이.
    expect(first.every((p) => p.rotation > 180 && p.rotation < 270)).toBe(true);
  });
});

describe("footprintEnterDelayMs", () => {
  test("FP5. d6 + i × d2", () => {
    const tokens = { d6: 300, d2: 100 };
    expect([0, 1, 2, 7].map((i) => footprintEnterDelayMs(i, tokens))).toEqual([
      300, 400, 500, 1000,
    ]);
  });
});
