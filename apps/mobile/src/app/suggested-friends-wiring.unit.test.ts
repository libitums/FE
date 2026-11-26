import { afterEach, expect, test, vi } from "vitest";

import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import type { RemoteEarlyUnlock } from "../screens/messenger-chat/early-access-parse";
import type { VisibleFriend } from "../screens/messenger-chat/friend-catalog.contract";
import { setPlanAccess } from "../lib/plan-access";
import { setMessengerMediaHooks } from "./messenger-chat-wiring";
import {
  chatProfilePort,
  guestSuggestedFriendsPort,
  setEarlyAccessRemote,
  suggestedFriendsPort,
} from "./suggested-friends-wiring";

// `unit` 계층(SW-U1 ~ SW-U6, ADR-0162 D5 · ADR-0164 D2): 먼저 만나기 결선 — 서버 포트가 없으면 꺼짐, 있으면 제안 목록을 읽고, 열기 결과를
// 화면 결과로 옮기며 돌려받은 지갑 잔액을 머리 엽전 칩 알림으로 보낸다. 서버 포트는 처음 쓸 때 한 번만 만든다(배경 스레드).

afterEach(() => {
  setEarlyAccessRemote(null);
  setMessengerMediaHooks(null);
  setPlanAccess(null);
});

function remoteWith(unlock: RemoteEarlyUnlock | null) {
  const remote = {
    earlyAccess: {
      offers: vi.fn(async () => [{ characterId: "mina", price: 100, endsAt: null }]),
      unlock: vi.fn(async () => unlock),
    },
  } as unknown as ChatRemote;
  const factory = vi.fn(() => remote);
  setEarlyAccessRemote(factory);
  return { remote, factory };
}

test("SW-U1 서버 포트가 없으면(테스트 · 가짜 출처) 먼저 만나기 · 제안이 꺼져 있다", () => {
  const port = suggestedFriendsPort();
  expect(port.earlyAccess).toBeNull();
  expect(port.offers ?? null).toBeNull();
});

test("SW-U2 제안 목록을 읽고, 서버 포트는 처음 쓸 때 한 번만 만든다", async () => {
  const { factory } = remoteWith(null);
  expect(factory).not.toHaveBeenCalled();
  const port = suggestedFriendsPort();
  expect(await port.offers?.()).toEqual([{ characterId: "mina", price: 100, endsAt: null }]);
  await suggestedFriendsPort().offers?.();
  expect(factory).toHaveBeenCalledTimes(1);
});

test("SW-U3 열기 결과 — unlocked · already는 열림, short는 모자란 양, no_offer · 실패는 failed. 잔액은 칩으로", async () => {
  const onBalance = vi.fn<(balance: number) => void>();
  setMessengerMediaHooks({ onBalance });
  const run = async (unlock: RemoteEarlyUnlock | null) => {
    remoteWith(unlock);
    return suggestedFriendsPort().earlyAccess?.("mina");
  };
  expect(await run({ result: "unlocked", shortBy: null, balance: 220 })).toEqual({
    kind: "unlocked",
  });
  expect(onBalance).toHaveBeenLastCalledWith(220);
  expect(await run({ result: "already", shortBy: null, balance: 220 })).toEqual({
    kind: "unlocked",
  });
  expect(await run({ result: "short", shortBy: 40, balance: 60 })).toEqual({
    kind: "short",
    shortBy: 40,
  });
  expect(onBalance).toHaveBeenLastCalledWith(60);
  expect(await run({ result: "no_offer", shortBy: null, balance: null })).toEqual({
    kind: "failed",
  });
  expect(await run(null)).toEqual({ kind: "failed" });
});

function friendsRemote(visible: () => Promise<readonly VisibleFriend[] | null>) {
  setEarlyAccessRemote(
    () => ({ friends: { visible, ackAdult: async () => true } }) as unknown as ChatRemote,
  );
}

test("SW-U5 보이는 친구를 읽으면 이 계정 값으로 기억해, 다음 입장의 lastVisibleFriends가 같은 목록을 바로 준다", async () => {
  friendsRemote(async () => [{ id: "seoyeon", romanceTier: "open" }]);
  const port = suggestedFriendsPort();
  expect(port.lastVisibleFriends?.() ?? null).toBeNull();
  await port.visibleFriends?.();
  expect(suggestedFriendsPort().lastVisibleFriends?.()).toEqual([
    { id: "seoyeon", romanceTier: "open" },
  ]);
});

test("SW-U6 새로 읽기가 실패(null · 던짐)해도 기억은 남고, 서버 포트를 새로 끼우면 앞 값이 남지 않는다", async () => {
  const daeun = [{ id: "daeun", romanceTier: "standard" }] as const;
  const visible = vi
    .fn<() => Promise<readonly VisibleFriend[] | null>>()
    .mockResolvedValueOnce(daeun)
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error("offline"));
  friendsRemote(visible);
  const port = suggestedFriendsPort();
  expect(await port.visibleFriends?.()).toEqual(daeun);
  expect(await port.visibleFriends?.()).toBeNull();
  expect(await port.visibleFriends?.()).toBeNull();
  expect(port.lastVisibleFriends?.()).toEqual(daeun);
  friendsRemote(async () => null);
  expect(suggestedFriendsPort().lastVisibleFriends?.() ?? null).toBeNull();
});

test("SW-U4 포트는 같은 설정이면 같은 객체 · 같은 함수다 — 렌더마다 새로 지어 제안을 다시 읽지 않게(리뷰 #503)", () => {
  remoteWith(null);
  const first = suggestedFriendsPort();
  expect(suggestedFriendsPort()).toBe(first);
  expect(suggestedFriendsPort().offers).toBe(first.offers);
  setEarlyAccessRemote(null);
  expect(suggestedFriendsPort()).not.toBe(first);
});

test("SW-U7 모든 인물 — 회원 포트는 지금 요금제를 부를 때마다 읽고, 손님 포트에는 없다", () => {
  const port = suggestedFriendsPort();
  expect(port.allStory?.()).toBe(false);
  setPlanAccess({ tier: "chat_plus", unlimitedTickets: false, entitlements: [] });
  expect(port.allStory?.()).toBe(true);
  expect(guestSuggestedFriendsPort().allStory).toBeUndefined();
});

test("SW-U8 대화방 프로필 포트(ADR-0178 개정 ⟨대화방⟩) — 앱 인물 표에서 상대를 찾고, 견본 주소 · 로마자는 렌더마다 받은 값을 쓴다", () => {
  const port = chatProfilePort({
    contentUrlOf: (path) => `https://cdn/${path}`,
    romanization: () => true,
  });
  expect(port.profileOf("duksu")?.id).toBe("duksu");
  expect(port.profileOf("nobody")).toBeNull();
  expect(port.voiceSampleUrl?.("v/a.mp3")).toBe("https://cdn/v/a.mp3");
  expect(port.romanization?.()).toBe(true);
  // 렌더마다 같은 객체 — 문맥 값이 바뀌어 시트가 다시 그려지지 않게.
  expect(chatProfilePort({ contentUrlOf: () => null, romanization: () => false })).toBe(port);
  expect(port.romanization?.()).toBe(false);
});
