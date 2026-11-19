import { afterEach, expect, test, vi } from "vitest";

import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import type { RemoteEarlyUnlock } from "../screens/messenger-chat/early-access-parse";
import { setMessengerMediaHooks } from "./messenger-chat-wiring";
import { setEarlyAccessRemote, suggestedFriendsPort } from "./suggested-friends-wiring";

// `unit` 계층(SW-U1 ~ SW-U3, ADR-0162 D5): 먼저 만나기 결선 — 서버 포트가 없으면 꺼짐, 있으면 제안 목록을 읽고, 열기 결과를
// 화면 결과로 옮기며 돌려받은 지갑 잔액을 머리 엽전 칩 알림으로 보낸다. 서버 포트는 처음 쓸 때 한 번만 만든다(배경 스레드).

afterEach(() => {
  setEarlyAccessRemote(null);
  setMessengerMediaHooks(null);
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

test("SW-U4 포트는 같은 설정이면 같은 객체 · 같은 함수다 — 렌더마다 새로 지어 제안을 다시 읽지 않게(리뷰 #503)", () => {
  remoteWith(null);
  const first = suggestedFriendsPort();
  expect(suggestedFriendsPort()).toBe(first);
  expect(suggestedFriendsPort().offers).toBe(first.offers);
  setEarlyAccessRemote(null);
  expect(suggestedFriendsPort()).not.toBe(first);
});
