import { describe, expect, test } from "vitest";

import { earlyOffersFrom, earlyUnlockFrom } from "./early-access-parse";
import { catalogWithOffers } from "./suggested-friends";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `unit` 계층(EA-U1 ~ EA-U3): 먼저 만나기 RPC 응답 풀기 · 카탈로그에 제안 얹기(ADR-0162 D5).

describe("EA-U1 제안 목록", () => {
  test("인물 · 값 · 끝 시각(ISO → ms, 없으면 null)", () => {
    const body = JSON.stringify([
      { characterId: "mina", price: 100, endsAt: null },
      { characterId: "jaemin", price: 80, endsAt: "2026-12-01T00:00:00Z" },
    ]);
    expect(earlyOffersFrom(body)).toEqual([
      { characterId: "mina", price: 100, endsAt: null },
      { characterId: "jaemin", price: 80, endsAt: Date.UTC(2026, 11, 1) },
    ]);
  });
  test("틀린 줄은 건너뛰고, 배열이 아니거나 빈 응답이면 null", () => {
    const body = JSON.stringify([
      { characterId: "mina", price: -1 },
      { price: 100 },
      { characterId: "a", price: 5, endsAt: null },
    ]);
    expect(earlyOffersFrom(body)).toEqual([{ characterId: "a", price: 5, endsAt: null }]);
    expect(earlyOffersFrom("{}")).toBeNull();
    expect(earlyOffersFrom(null)).toBeNull();
    expect(earlyOffersFrom("nope")).toBeNull();
  });
});

describe("EA-U2 열기 결과", () => {
  test("unlocked · already는 지갑 잔액을, short는 모자란 양을 싣는다", () => {
    const wallet = { sub: 0, grant: 150, paid: 0, balance: 150 };
    expect(earlyUnlockFrom(JSON.stringify({ result: "unlocked", wallet }))).toEqual({
      result: "unlocked",
      shortBy: null,
      balance: 150,
    });
    expect(earlyUnlockFrom(JSON.stringify({ result: "already", wallet }))).toMatchObject({
      result: "already",
      balance: 150,
    });
    expect(
      earlyUnlockFrom(JSON.stringify({ result: "short", shortBy: 40, wallet: { balance: 60 } })),
    ).toEqual({ result: "short", shortBy: 40, balance: 60 });
    expect(earlyUnlockFrom(JSON.stringify({ result: "no_offer" }))).toEqual({
      result: "no_offer",
      shortBy: null,
      balance: null,
    });
  });
  test("모르는 결과 · 빈 응답 · 틀린 JSON은 null", () => {
    expect(earlyUnlockFrom(JSON.stringify({ result: "paid" }))).toBeNull();
    expect(earlyUnlockFrom("")).toBeNull();
    expect(earlyUnlockFrom("{")).toBeNull();
  });
});

test("EA-U3 제안을 카탈로그 인물의 earlyAccess에 얹고, 제안 없는 인물은 그대로 둔다", () => {
  const catalog = catalogOf([friend("mina"), friend("doyun")]);
  const merged = catalogWithOffers(catalog, [{ characterId: "mina", price: 100, endsAt: null }]);
  expect(merged.characters.map((c) => [c.id, c.earlyAccess])).toEqual([
    ["mina", { price: 100, endsAt: null }],
    ["doyun", null],
  ]);
  expect(catalogWithOffers(catalog, [])).toBe(catalog);
});
