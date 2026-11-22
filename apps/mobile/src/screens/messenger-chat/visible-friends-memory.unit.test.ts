import { expect, test } from "vitest";

import type { VisibleFriend } from "./friend-catalog.contract";
import { createVisibleFriendsMemory } from "./visible-friends-memory";

// `unit` 계층(VFM-U1 ~ VFM-U3): 보이는 추천 친구의 실행 중 기억 — 탭에 다시 들어올 때 첫 프레임부터 같은 줄을 그리게.

const SEOYEON: readonly VisibleFriend[] = [{ id: "seoyeon", romanceTier: "open" }];
const DAEUN: readonly VisibleFriend[] = [{ id: "daeun", romanceTier: "standard" }];

test("VFM-U1 읽기 전에는 null, 기억한 뒤에는 그 계정의 목록(빈 목록도 기억)", () => {
  const memory = createVisibleFriendsMemory();
  expect(memory.recall("server:a")).toBeNull();
  memory.remember("server:a", SEOYEON);
  expect(memory.recall("server:a")).toEqual(SEOYEON);
  memory.remember("server:a", []);
  expect(memory.recall("server:a")).toEqual([]);
});

test("VFM-U2 다른 계정 열쇠에는 앞 계정의 목록을 돌려주지 않는다", () => {
  const memory = createVisibleFriendsMemory();
  memory.remember("server:a", SEOYEON);
  expect(memory.recall("server:b")).toBeNull();
  memory.remember("server:b", DAEUN);
  expect(memory.recall("server:a")).toEqual(SEOYEON);
  expect(memory.recall("server:b")).toEqual(DAEUN);
});

test("VFM-U3 못 읽음(null)은 기억을 지우지 않는다 — 잠깐의 실패로 줄이 비지 않게", () => {
  const memory = createVisibleFriendsMemory();
  memory.remember("server:a", SEOYEON);
  memory.remember("server:a", null);
  expect(memory.recall("server:a")).toEqual(SEOYEON);
});
