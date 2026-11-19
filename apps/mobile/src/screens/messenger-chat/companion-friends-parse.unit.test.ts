import { describe, expect, test } from "vitest";

import { adultAckFrom, visibleFriendsFrom } from "./companion-friends-parse";
import { profileFrom } from "./companion-parse";

// `unit` 계층(FR-P1 ~ P4): 추천 친구 RPC 답 풀기(ADR-0163 D2 · D4). 틀린 답은 null — 앱은 일반 인물을 보이지 않습니다.

describe("companion_friends", () => {
  test("FR-P1 서버 순서 그대로 · 틀린 줄과 같은 id는 버린다", () => {
    const body = JSON.stringify({
      friends: [
        { id: "seoyeon", romanceTier: "open" },
        { id: "daeun", romanceTier: "standard" },
        { id: "seoyeon", romanceTier: "standard" },
        { id: "", romanceTier: "open" },
        { id: "haejun", romanceTier: "spicy" },
        "geonwoo",
      ],
    });
    expect(visibleFriendsFrom(body)).toEqual([
      { id: "seoyeon", romanceTier: "open" },
      { id: "daeun", romanceTier: "standard" },
    ]);
  });

  test("FR-P2 빈 목록은 빈 배열, RPC 없음(404 → null) · 틀린 모양 · JSON 아님은 null", () => {
    expect(visibleFriendsFrom('{"friends":[]}')).toEqual([]);
    expect(visibleFriendsFrom(null)).toBeNull();
    expect(visibleFriendsFrom("")).toBeNull();
    expect(visibleFriendsFrom("<html>")).toBeNull();
    expect(visibleFriendsFrom('{"friends":{}}')).toBeNull();
    expect(visibleFriendsFrom("[]")).toBeNull();
  });
});

describe("companion_ack_adult · 프로필 adultAck", () => {
  test("FR-P3 { ok: true, adultAck } → 그 값, ok 거짓(나이 모름 · 미성년자) · 틀림 → null", () => {
    expect(adultAckFrom('{"ok":true,"adultAck":true}')).toBe(true);
    expect(adultAckFrom('{"ok":true,"adultAck":false}')).toBe(false);
    expect(adultAckFrom('{"ok":false,"adultAck":false}')).toBeNull();
    expect(adultAckFrom('{"ok":true}')).toBeNull();
    expect(adultAckFrom(null)).toBeNull();
  });

  test("FR-P4 프로필의 adultAck는 칸이 있을 때만 싣는다(옛 서버는 칸 없음)", () => {
    expect(profileFrom('{"birthYear":1995,"adultAck":true}')).toEqual({
      birthYear: 1995,
      replySuggestions: null,
      adultAck: true,
    });
    expect(profileFrom('{"birthYear":1995}')).toEqual({ birthYear: 1995, replySuggestions: null });
  });
});
