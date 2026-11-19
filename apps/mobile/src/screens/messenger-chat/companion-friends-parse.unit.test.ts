import { describe, expect, test } from "vitest";

import { adultAckFrom, visibleFriendsFrom } from "./companion-friends-parse";
import { profileFrom } from "./companion-parse";

// `unit` 계층(CF-U4 ~ CF-U6): 추천 친구 RPC 응답 풀기(ADR-0164). 틀린 응답은 null, 틀린 줄은 건너뜀.

describe("CF-U4 companion_friends()", () => {
  test("보이는 친구를 서버 순서로 푼다", () => {
    const body = JSON.stringify({
      friends: [
        { id: "seoyeon", romanceTier: "open" },
        { id: "daeun", romanceTier: "standard" },
      ],
    });
    expect(visibleFriendsFrom(body)).toEqual([
      { id: "seoyeon", romanceTier: "open" },
      { id: "daeun", romanceTier: "standard" },
    ]);
  });

  test("빈 목록(꺼짐 · 시험 계정 아님)은 빈 배열", () => {
    expect(visibleFriendsFrom(JSON.stringify({ friends: [] }))).toEqual([]);
  });

  test("틀린 줄(빈 id · 모르는 수위)은 건너뛴다", () => {
    const body = JSON.stringify({
      friends: [
        { id: "", romanceTier: "open" },
        { id: "haejun", romanceTier: "wild" },
        { id: "geonwoo", romanceTier: "standard" },
        "x",
      ],
    });
    expect(visibleFriendsFrom(body)).toEqual([{ id: "geonwoo", romanceTier: "standard" }]);
  });

  test("모양이 틀리면 · 못 읽으면 null", () => {
    expect(visibleFriendsFrom(null)).toBeNull();
    expect(visibleFriendsFrom("")).toBeNull();
    expect(visibleFriendsFrom("{")).toBeNull();
    expect(visibleFriendsFrom(JSON.stringify({ friends: "no" }))).toBeNull();
    expect(visibleFriendsFrom(JSON.stringify([]))).toBeNull();
  });
});

describe("CF-U5 companion_ack_adult()", () => {
  test("ok · adultAck 둘 다 참이면 true, 성인이 아니면(거짓 · 거짓) false", () => {
    expect(adultAckFrom(JSON.stringify({ ok: true, adultAck: true }))).toBe(true);
    expect(adultAckFrom(JSON.stringify({ ok: false, adultAck: false }))).toBe(false);
  });

  test("모양이 틀리면 null", () => {
    expect(adultAckFrom(null)).toBeNull();
    expect(adultAckFrom("nope")).toBeNull();
    expect(adultAckFrom(JSON.stringify({ ok: "yes" }))).toBeNull();
  });
});

describe("CF-U6 프로필의 adultAck", () => {
  test("adultAck가 참이면 참", () => {
    const body = JSON.stringify({ birthYear: 1990, replySuggestions: true, adultAck: true });
    expect(profileFrom(body)?.adultAck).toBe(true);
  });

  test("칸이 없거나(옛 서버) 불리언이 아니면 false · 행이 없으면 false", () => {
    expect(profileFrom(JSON.stringify({ birthYear: 1990 }))?.adultAck).toBe(false);
    expect(profileFrom(JSON.stringify({ birthYear: 1990, adultAck: "y" }))?.adultAck).toBe(false);
    expect(profileFrom("null")?.adultAck).toBe(false);
  });
});
