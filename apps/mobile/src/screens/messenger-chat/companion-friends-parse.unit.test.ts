import { describe, expect, test } from "vitest";

import { adultAckFrom, friendsFrom } from "./companion-friends-parse";
import { profileFrom } from "./companion-parse";

// `unit` 계층(RF-U50 ~ U52): 추천 친구 RPC 답 해석 — 틀린 줄은 그 줄만 버리고, 모양이 틀리면 null(친구 없음).

describe("companion_friends · companion_ack_adult (RF-U50 ~ U52)", () => {
  test("RF-U50 friends 목록 — 등급이 틀리거나 id가 없거나 겹친 줄은 버린다", () => {
    expect(
      friendsFrom(
        JSON.stringify({
          friends: [
            { id: "seoyeon", romanceTier: "open" },
            { id: "daeun", romanceTier: "standard" },
            { id: "seoyeon", romanceTier: "standard" },
            { id: "haejun", romanceTier: "spicy" },
            { romanceTier: "open" },
            "geonwoo",
          ],
        }),
      ),
    ).toEqual([
      { id: "seoyeon", romanceTier: "open" },
      { id: "daeun", romanceTier: "standard" },
    ]);
    expect(friendsFrom(JSON.stringify({ friends: [] }))).toEqual([]);
    expect(friendsFrom(JSON.stringify({ items: [] }))).toBeNull();
    expect(friendsFrom("not json")).toBeNull();
    expect(friendsFrom(null)).toBeNull();
  });

  test("RF-U51 ack — ok이고 adultAck가 불리언일 때만 그 값", () => {
    expect(adultAckFrom(JSON.stringify({ ok: true, adultAck: true }))).toBe(true);
    expect(adultAckFrom(JSON.stringify({ ok: true, adultAck: false }))).toBe(false);
    expect(adultAckFrom(JSON.stringify({ ok: false, adultAck: true }))).toBeNull();
    expect(adultAckFrom(JSON.stringify({ ok: true }))).toBeNull();
    expect(adultAckFrom(null)).toBeNull();
  });

  test("RF-U52 프로필 답의 adultAck — 있으면 싣고, 없으면(옛 서버) 칸이 없다", () => {
    expect(profileFrom(JSON.stringify({ birthYear: 1990, adultAck: true }))).toEqual({
      birthYear: 1990,
      replySuggestions: null,
      adultAck: true,
    });
    expect(profileFrom(JSON.stringify({ birthYear: 1990 }))).not.toHaveProperty("adultAck");
  });
});
