import { describe, expect, test } from "vitest";

import {
  CATALOG_FINAL_KEY,
  CATALOG_INTRO_KEY,
  catalogProgressFrom,
  isCatalogEpisodePassed,
  isCatalogUnitDone,
  markCatalogUnitDone,
  mergeCatalogProgress,
} from "./catalog-progress";
import type { CatalogProgress } from "./catalog-progress";

describe("K1 catalogProgressFrom: 객체가 아니면 빈 진행", () => {
  test.each([undefined, null, [], "x", 1, true])("%j", (raw) => {
    expect(catalogProgressFrom(raw)).toEqual({});
  });
});

describe("K2 catalogProgressFrom: 정규화", () => {
  test("올바른 입력은 그대로", () => {
    expect(catalogProgressFrom({ a: ["intro", "S1"], b: ["RP"] })).toEqual({
      a: ["intro", "S1"],
      b: ["RP"],
    });
  });

  test("빈 키는 버린다", () => {
    expect(catalogProgressFrom({ "": ["intro"], a: ["intro"] })).toEqual({ a: ["intro"] });
  });

  test("배열이 아닌 값을 가진 키는 버린다", () => {
    expect(catalogProgressFrom({ a: "intro", b: 1, c: null, d: { 0: "x" }, e: ["S1"] })).toEqual({
      e: ["S1"],
    });
  });

  test("비문자열 · 빈 문자열 원소는 버린다", () => {
    expect(catalogProgressFrom({ a: ["intro", 1, null, "", {}, ["S1"], "S2"] })).toEqual({
      a: ["intro", "S2"],
    });
  });

  test("중복은 제거하고 처음 순서를 보존한다", () => {
    expect(catalogProgressFrom({ a: ["S2", "intro", "S2", "S1", "intro"] })).toEqual({
      a: ["S2", "intro", "S1"],
    });
  });

  test("남는 원소가 없는 키는 버린다", () => {
    expect(catalogProgressFrom({ a: [], b: ["", 1], c: ["intro"] })).toEqual({ c: ["intro"] });
  });

  test("입력을 바꾸지 않는다", () => {
    const raw = { a: ["intro", "intro", 1] };
    const before = JSON.stringify(raw);
    catalogProgressFrom(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe("K3 mergeCatalogProgress", () => {
  const a: CatalogProgress = { x: ["intro", "S2"], y: ["S1"] };
  const b: CatalogProgress = { x: ["S2", "S1"], z: ["intro"] };

  test("키별 합집합이고 a의 순서 뒤에 b의 새 것이 붙는다", () => {
    expect(mergeCatalogProgress(a, b)).toEqual({
      x: ["intro", "S2", "S1"],
      y: ["S1"],
      z: ["intro"],
    });
  });

  test("방향을 바꿔도 같은 집합이다", () => {
    const ba = mergeCatalogProgress(b, a);
    expect(Object.keys(ba).sort()).toEqual(["x", "y", "z"]);
    expect([...(ba["x"] ?? [])].sort()).toEqual(["S1", "S2", "intro"]);
  });

  test("빈 진행과의 합은 항등이고 멱등이다", () => {
    expect(mergeCatalogProgress(a, {})).toEqual(a);
    expect(mergeCatalogProgress({}, a)).toEqual(a);
    expect(mergeCatalogProgress(a, a)).toEqual(a);
  });

  test("입력을 바꾸지 않는다", () => {
    const aCopy = JSON.stringify(a);
    const bCopy = JSON.stringify(b);
    mergeCatalogProgress(a, b);
    expect(JSON.stringify(a)).toBe(aCopy);
    expect(JSON.stringify(b)).toBe(bCopy);
  });
});

describe("K4 isCatalogUnitDone", () => {
  const p: CatalogProgress = { a: ["intro", "S1"] };
  test("있음 · 없음 · 모르는 에피소드", () => {
    expect(isCatalogUnitDone(p, "a", "intro")).toBe(true);
    expect(isCatalogUnitDone(p, "a", "S1")).toBe(true);
    expect(isCatalogUnitDone(p, "a", "S2")).toBe(false);
    expect(isCatalogUnitDone(p, "b", "intro")).toBe(false);
    expect(isCatalogUnitDone({}, "a", "intro")).toBe(false);
  });
});

describe("K5 markCatalogUnitDone", () => {
  test("새 에피소드 키를 만든다", () => {
    const p: CatalogProgress = { a: ["intro"] };
    expect(markCatalogUnitDone(p, "b", "intro")).toEqual({ a: ["intro"], b: ["intro"] });
  });

  test("기존 키에 덧붙인다", () => {
    const p: CatalogProgress = { a: ["intro"] };
    const next = markCatalogUnitDone(p, "a", "S1");
    expect(next).toEqual({ a: ["intro", "S1"] });
    expect(isCatalogUnitDone(next, "a", "S1")).toBe(true);
  });

  test("이미 있으면 같은 참조를 돌려준다", () => {
    const p: CatalogProgress = { a: ["intro", "S1"] };
    expect(markCatalogUnitDone(p, "a", "S1")).toBe(p);
  });

  test("입력을 바꾸지 않는다", () => {
    const p: CatalogProgress = { a: ["intro"] };
    const before = JSON.stringify(p);
    const next = markCatalogUnitDone(p, "a", "S1");
    expect(JSON.stringify(p)).toBe(before);
    expect(next).not.toBe(p);
  });
});

describe("K6 isCatalogEpisodePassed", () => {
  test("RP가 있을 때만 통과다", () => {
    expect(CATALOG_FINAL_KEY).toBe("RP");
    expect(CATALOG_INTRO_KEY).toBe("intro");
    expect(isCatalogEpisodePassed({ a: [CATALOG_INTRO_KEY, "S1"] }, "a")).toBe(false);
    expect(isCatalogEpisodePassed({ a: ["intro", "RP"] }, "a")).toBe(true);
    expect(isCatalogEpisodePassed({ a: ["RP"] }, "b")).toBe(false);
    expect(isCatalogEpisodePassed({}, "a")).toBe(false);
  });

  test("K7. 빈 에피소드 id · 빈 유닛 키는 기록하지 않는다(서버가 거절해 저장이 멈추지 않게)", () => {
    const progress = { a: ["intro"] };
    expect(markCatalogUnitDone(progress, "", "S1")).toBe(progress);
    expect(markCatalogUnitDone(progress, "a", "")).toBe(progress);
  });

  test("K8. __proto__ 키는 프로토타입을 바꾸지 않고 버린다", () => {
    const parsed = catalogProgressFrom(JSON.parse('{"__proto__": ["intro"], "a": ["S1"]}'));
    expect(parsed).toEqual({ a: ["S1"] });
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    const marked = markCatalogUnitDone({}, "__proto__", "intro");
    expect(Object.getPrototypeOf(marked)).toBe(Object.prototype);
    expect(marked).toEqual({});
  });

  test.each(["toString", "constructor", "hasOwnProperty", "valueOf"])(
    "K9. 객체 기본 속성 이름(%s)의 에피소드 id도 던지지 않고 자기 값만 본다",
    (id) => {
      expect(isCatalogUnitDone({}, id, "intro")).toBe(false);
      expect(isCatalogEpisodePassed({}, id)).toBe(false);
      expect(markCatalogUnitDone({}, id, "intro")).toEqual({ [id]: ["intro"] });
      expect(mergeCatalogProgress({}, { [id]: ["S1"] })).toEqual({ [id]: ["S1"] });
      expect(catalogProgressFrom(JSON.parse(`{"${id}": ["RP"]}`))).toEqual({ [id]: ["RP"] });
    },
  );
});
