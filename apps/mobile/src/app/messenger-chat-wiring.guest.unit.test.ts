import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { orderChatRooms } from "../screens/messenger-chat/chat-list";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
} from "./messenger-chat-wiring";
import { guestSuggestedFriendsPort, setEarlyAccessRemote } from "./suggested-friends-wiring";

// `unit` 계층(GW-U1 ~ GW-U4): 비회원 출처 · 추천 친구 포트 결선(ADR-0166) — 비회원은 회원과 같은 인물 방을 앱 안에서만 봅니다.

let guest = false;
vi.mock("../lib/guest-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/guest-session")>()),
  loadGuestSession: () => guest,
}));

let greets = 0;
const remote = (): ChatRemote => ({
  loadHistory: async () => null,
  greet: async () => {
    greets += 1;
    return null;
  },
  openTurn: () => ({ cancel: () => undefined }),
});
const openRooms = () =>
  orderChatRooms(messengerChatSource(() => null).snapshot().rooms).map((room) => room.roomId);

beforeEach(() => {
  resetMessengerChatSourceForTests();
  greets = 0;
});
afterEach(() => {
  guest = false;
  setMessengerChatRemote(null);
  setEarlyAccessRemote(null);
  resetMessengerChatSourceForTests();
});

test("GW-U1 비회원(세션 없음 + 표식)은 데모 방 대신 덕수쌤 방 하나로 시작한다", () => {
  guest = true;
  expect(openRooms()).toEqual(["duksu"]);
});

test("GW-U2 비회원 출처는 진입점 서버 포트가 있어도 서버를 부르지 않고, 열면 첫 인사를 앱 안에서 놓는다", () => {
  guest = true;
  setMessengerChatRemote(remote);
  const source = messengerChatSource(() => null);
  source.openRoom("duksu");
  expect(greets).toBe(0);
  expect(source.server).toBeNull();
  expect(source.thread("duksu")?.messages).toHaveLength(1);
});

test("GW-U3 표식이 없으면(테스트의 회원 · 데모) 기존 가짜 씨앗 그대로", () => {
  expect(openRooms()).not.toEqual(["duksu"]);
});

test("GW-U4 비회원 추천 친구 포트 — 카탈로그만, 제안 · 먼저 만나기 · 보이는 친구 RPC · 성인 확인 없음", () => {
  setEarlyAccessRemote(remote);
  const port = guestSuggestedFriendsPort();
  expect(port.catalog().characters.filter((c) => c.kind === "general")).toHaveLength(4);
  expect(port.earlyAccess).toBeNull();
  expect(port.offers ?? null).toBeNull();
  expect(port.visibleFriends).toBeUndefined();
  expect(port.adultAck).toBeUndefined();
});
