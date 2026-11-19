import { describe, expect, test } from "vitest";

import { COMPANION_CATALOG, COMPANION_CHARACTERS, companionSeed } from "./companion-roster";
import {
  friendStatusOf,
  localizedLine,
  offerBadgeOf,
  offerOf,
  SUGGESTED_ROW_MAX,
  suggestedFriendsOf,
  suggestedRowOf,
} from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(SF-U1 ~ SF-U7 · CS-U1): 추천 친구 줄의 판정(ADR-0162). 카탈로그 · 방 · 시각만 넣고 결과를 봅니다.

const HOUR = 3_600_000;
const NOW = 1_800_000_000_000;
const ids = (list: readonly { character: { id: string } }[]) => list.map((s) => s.character.id);

describe("SF-U1 추천 대상", () => {
  test("방이 열린 인물 · 방이 스냅숏에 없는 인물은 추천에 없다", () => {
    const catalog = catalogOf([friend("a"), friend("b"), friend("c")]);
    const rooms = [room("a", true), room("b", false)];
    expect(ids(suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW }))).toEqual([
      "b",
    ]);
  });

  test("추천은 그 인물의 방(얼굴 그림)을 싣는다", () => {
    const [only] = suggestedFriendsOf({
      catalog: catalogOf([friend("b")]),
      rooms: [room("b", false)],
      earlyAccess: false,
      now: NOW,
    });
    expect(only?.room.counterpart.avatarUrl).toBe("https://img/b.webp");
    expect(only?.status).toBe("locked");
  });
});

describe("SF-U2 순서", () => {
  test("일반 추가 가능 → 이야기 추가 가능 → 잠김+제안 → 잠김, 묶음 안은 카탈로그 순서", () => {
    const catalog = catalogOf([
      friend("lockedA"),
      friend("early", { earlyAccess: { price: 100, endsAt: null } }),
      friend("met", { unlockEpisodeId: "u-met" }),
      general("g1"),
      friend("lockedB"),
      general("g2"),
    ]);
    const rooms = catalog.characters.map((c) => room(c.id, false));
    const list = suggestedFriendsOf({
      catalog,
      rooms,
      earlyAccess: true,
      now: NOW,
      metEpisode: (episodeId) => episodeId === "u-met",
    });
    expect(ids(list)).toEqual(["g1", "g2", "met", "early", "lockedA", "lockedB"]);
    expect(list.map((s) => s.status)).toEqual([
      "addable",
      "addable",
      "addable",
      "locked",
      "locked",
      "locked",
    ]);
    expect(list[3]?.offer).toEqual({ price: 100, endsAt: null });
    expect(list[4]?.offer).toBeNull();
  });

  test("먼저 만나기가 꺼지면 제안 있는 인물도 제안 없이 카탈로그 순서로 잠김 묶음에 선다", () => {
    const catalog = catalogOf([
      friend("lockedA"),
      friend("early", { earlyAccess: { price: 100, endsAt: null } }),
    ]);
    const rooms = catalog.characters.map((c) => room(c.id, false));
    const list = suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW });
    expect(ids(list)).toEqual(["lockedA", "early"]);
    expect(list.every((s) => s.offer === null)).toBe(true);
  });
});

test("SF-U3 줄은 최대 8명이다(9명이면 앞 8명)", () => {
  const catalog = catalogOf(Array.from({ length: 9 }, (_, i) => general(`g${i}`)));
  const rooms = catalog.characters.map((c) => room(c.id, false));
  const row = suggestedRowOf(suggestedFriendsOf({ catalog, rooms, earlyAccess: false, now: NOW }));
  expect(SUGGESTED_ROW_MAX).toBe(8);
  expect(ids(row)).toEqual(["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"]);
});

describe("SF-U4 offerOf", () => {
  const offer = { price: 100, endsAt: NOW + HOUR };
  test("꺼짐 · 제안 없음 · 끝 시각 지남 → null", () => {
    expect(offerOf(friend("a", { earlyAccess: offer }), false, NOW)).toBeNull();
    expect(offerOf(friend("a"), true, NOW)).toBeNull();
    expect(offerOf(friend("a", { earlyAccess: offer }), true, NOW + HOUR)).toBeNull();
  });
  test("켜짐 · 끝 시각 전 · 끝 시각 없음 → 그 제안", () => {
    expect(offerOf(friend("a", { earlyAccess: offer }), true, NOW)).toEqual(offer);
    const open = { price: 100, endsAt: null };
    expect(offerOf(friend("a", { earlyAccess: open }), true, NOW)).toEqual(open);
  });
  test("이미 추가할 수 있는 인물(일반)은 제안이 없다", () => {
    expect(offerOf(general("g", { earlyAccess: offer }), true, NOW)).toBeNull();
  });
});

describe("SF-U5 offerBadgeOf — 가짜 카운트다운 없음", () => {
  test("끝 시각이 없으면 LIMITED만", () => {
    expect(offerBadgeOf({ price: 100, endsAt: null }, NOW)).toEqual({ kind: "limited" });
  });
  test("2일 14시간 30분 남으면 2d 14h(내림)", () => {
    const endsAt = NOW + (2 * 24 + 14) * HOUR + 30 * 60_000;
    expect(offerBadgeOf({ price: 100, endsAt }, NOW)).toEqual({
      kind: "until",
      days: 2,
      hours: 14,
    });
  });
});

test("SF-U6 localizedLine — 그 언어 칸, 없으면 en", () => {
  const line = { en: "Hello", ja: "こんにちは" };
  expect(localizedLine(line, "ja")).toBe("こんにちは");
  expect(localizedLine(line, "vi")).toBe("Hello");
  expect(localizedLine(line, "th")).toBe("Hello");
});

describe("SF-U7 friendStatusOf · 오늘 카탈로그", () => {
  test("열린 방 → added, 일반 · 규칙 없음 · 끝낸 에피소드 → addable, 그 밖 locked", () => {
    expect(friendStatusOf(friend("a"), room("a", true))).toBe("added");
    expect(friendStatusOf(general("g"), room("g", false))).toBe("addable");
    expect(friendStatusOf(friend("d", { unlockEpisodeId: null }), room("d", false))).toBe(
      "addable",
    );
    expect(friendStatusOf(friend("m"), room("m", false), () => true)).toBe("addable");
    expect(friendStatusOf(friend("l"), room("l", false))).toBe("locked");
  });

  test("오늘 카탈로그는 이야기 인물 다섯 · 카테고리 없음 · 먼저 만나기 제안 없음 · 소개는 다섯 언어", () => {
    expect(COMPANION_CATALOG.characters.map((c) => c.id)).toEqual([
      "duksu",
      "yoonkyung",
      "mina",
      "doyun",
      "jaemin",
    ]);
    expect(COMPANION_CATALOG.categories).toEqual([]);
    for (const c of COMPANION_CATALOG.characters) {
      expect(c.kind, c.id).toBe("story");
      expect(c.earlyAccess, c.id).toBeNull();
      expect(Object.keys(c.intro ?? {}).sort(), c.id).toEqual(["en", "es", "id", "ja", "vi"]);
    }
  });
});

test("CS-U1 서버 씨앗은 일반 인물을 잠긴 방(unlockEpisode 0)으로 심는다 — 목록에 없고 추가로 연다", () => {
  const seed = companionSeed([...COMPANION_CHARACTERS, { ...general("g1"), firstLine: null }]);
  const g1 = seed.rooms.find((r) => r.roomId === "g1");
  expect(g1?.access).toEqual({ kind: "locked", unlockEpisode: 0 });
  expect(seed.rooms.find((r) => r.roomId === "duksu")?.access).toEqual({ kind: "open" });
  expect(seed.rooms.find((r) => r.roomId === "mina")?.access).toEqual({
    kind: "locked",
    unlockEpisode: 3,
  });
});
