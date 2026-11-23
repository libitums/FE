import { describe, expect, test } from "vitest";

import {
  ADULT_AGE,
  ageBandOf,
  catalogWithVisibleFriends,
  shouldAskAdultAck,
} from "./companion-friends";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `unit` 계층(CF-U1 ~ CF-U3): 추천 친구(ADR-0164)의 판정. 보이는 친구 거르기 · 생년 연령대 · 성인 확인을 물을지.

const ids = (catalog: { characters: readonly { id: string }[] }) =>
  catalog.characters.map((c) => c.id);
/** 2026-11-19T00:00:00Z */
const NOW = Date.UTC(2026, 10, 19);

describe("CF-U1 보이는 친구", () => {
  const catalog = catalogOf([
    friend("duksu"),
    general("seoyeon", { romanceTier: "open" }),
    friend("mina"),
    general("daeun"),
    general("haejun", { romanceTier: "open" }),
  ]);

  test("이야기 인물은 그대로 · 일반 인물은 서버 목록에 있는 것만 서버 순서로", () => {
    const visible = catalogWithVisibleFriends(catalog, [
      { id: "daeun", romanceTier: "standard" },
      { id: "seoyeon", romanceTier: "open" },
    ]);
    expect(ids(visible)).toEqual(["duksu", "mina", "daeun", "seoyeon"]);
  });

  test("수위는 서버 값이 덮는다", () => {
    const visible = catalogWithVisibleFriends(catalog, [
      { id: "seoyeon", romanceTier: "standard" },
      { id: "daeun", romanceTier: "open" },
    ]);
    const tiers = visible.characters.map((c) => [c.id, c.romanceTier ?? "standard"]);
    expect(tiers).toContainEqual(["seoyeon", "standard"]);
    expect(tiers).toContainEqual(["daeun", "open"]);
  });

  test("빈 목록 · 못 읽음(null)이면 일반 인물이 하나도 없다 — 이야기 인물은 남는다", () => {
    expect(ids(catalogWithVisibleFriends(catalog, []))).toEqual(["duksu", "mina"]);
    expect(ids(catalogWithVisibleFriends(catalog, null))).toEqual(["duksu", "mina"]);
  });

  test("카탈로그에 없는 id(앱이 모르는 친구)는 건너뛴다 · 카테고리는 그대로", () => {
    const withCategory = catalogOf([general("daeun")], [{ id: "c1", label: { en: "C" } }]);
    const visible = catalogWithVisibleFriends(withCategory, [
      { id: "stranger", romanceTier: "standard" },
      { id: "daeun", romanceTier: "standard" },
    ]);
    expect(ids(visible)).toEqual(["daeun"]);
    expect(visible.categories).toEqual(withCategory.categories);
  });
});

describe("CF-U2 생년 연령대(서버 companion.age_band와 같은 경계)", () => {
  test("그해 연도 − 생년이 18 이상이면 성인, 아래면 미성년자, 생년이 없으면 모름", () => {
    expect(ADULT_AGE).toBe(18);
    expect(ageBandOf(2008, NOW)).toBe("adult");
    expect(ageBandOf(1990, NOW)).toBe("adult");
    expect(ageBandOf(2009, NOW)).toBe("minor");
    expect(ageBandOf(null, NOW)).toBe("unknown");
  });

  test("연도는 UTC로 센다 — 12월 31일 밤(UTC)도 그해다", () => {
    expect(ageBandOf(2008, Date.UTC(2026, 11, 31, 23, 59))).toBe("adult");
    expect(ageBandOf(2009, Date.UTC(2027, 0, 1, 0, 0))).toBe("adult");
  });
});

describe("CF-U3 성인 확인을 물을지(shouldAskAdultAck)", () => {
  const adult = { ageBand: "adult", adultAck: false } as const;

  test("open 인물 + 생년상 성인 + 동의 없음일 때만 묻는다", () => {
    expect(shouldAskAdultAck({ romanceTier: "open", state: adult, asked: false })).toBe(true);
  });

  test("이 계정에 이미 물었으면(Just friends for now) 다시 묻지 않는다", () => {
    expect(shouldAskAdultAck({ romanceTier: "open", state: adult, asked: true })).toBe(false);
  });

  test("이미 동의했으면 묻지 않는다", () => {
    expect(
      shouldAskAdultAck({
        romanceTier: "open",
        state: { ageBand: "adult", adultAck: true },
        asked: false,
      }),
    ).toBe(false);
  });

  test("나이 모름 · 미성년자에게는 묻지 않는다(안내도 없음)", () => {
    for (const ageBand of ["unknown", "minor"] as const) {
      expect(
        shouldAskAdultAck({
          romanceTier: "open",
          state: { ageBand, adultAck: false },
          asked: false,
        }),
      ).toBe(false);
    }
  });

  test("standard · 수위 없음 인물, 상태를 못 읽음(null)이면 묻지 않는다", () => {
    expect(shouldAskAdultAck({ romanceTier: "standard", state: adult, asked: false })).toBe(false);
    expect(shouldAskAdultAck({ romanceTier: undefined, state: adult, asked: false })).toBe(false);
    expect(shouldAskAdultAck({ romanceTier: "open", state: null, asked: false })).toBe(false);
  });
});
