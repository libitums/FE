import { afterEach, describe, expect, test } from "vitest";

import { forgetNewFriend, rememberNewFriend, takeNewFriend } from "./new-friend-pending";

// `unit` 계층: 아직 시트를 보이지 않은 새 친구의 기억 — 적고, 한 번 꺼내면 비고, 지울 수 있다.

afterEach(() => {
  forgetNewFriend();
});

describe("new-friend-pending", () => {
  test("NP1. 처음은 null이고, 기억한 뒤 한 번 꺼내면 그 id이며 둘째 꺼냄은 null", () => {
    expect(takeNewFriend()).toBeNull();
    rememberNewFriend("mina");
    expect(takeNewFriend()).toBe("mina");
    expect(takeNewFriend()).toBeNull();
  });

  test("NP1. 나중 기억이 앞 기억을 덮고, forget은 비운다", () => {
    rememberNewFriend("mina");
    rememberNewFriend("jun");
    expect(takeNewFriend()).toBe("jun");
    rememberNewFriend("mina");
    forgetNewFriend();
    expect(takeNewFriend()).toBeNull();
  });
});
