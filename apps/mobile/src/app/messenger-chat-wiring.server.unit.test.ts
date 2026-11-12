import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { setTesterAccessActive } from "../lib/tester-access";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
} from "./messenger-chat-wiring";

// `unit` 계층(SW-U1 ~ U4): 서버 모드 결선 — 로그인한 시험 계정만 서버 모드, 사용자가 바뀌면 출처를 새로(ADR-0137, 리뷰 C1).

let token: string | undefined;
vi.mock("../lib/auth-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/auth-session")>()),
  loadAuthSession: () =>
    token === undefined ? null : { accessToken: token, refreshToken: "r", expiresAt: 9e12 },
}));

const jwt = (sub: string) =>
  `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(JSON.stringify({ sub })).replace(/=+$/, "")}.sig`;

let turns = 0;
const remote = (): ChatRemote => ({
  loadHistory: async () => null,
  greet: async () => null,
  openTurn: () => {
    turns += 1;
    return { cancel: () => undefined };
  },
});
const imageUrlOf = () => null;
const isServer = () =>
  messengerChatSource(imageUrlOf)
    .snapshot()
    .rooms.map((room) => room.roomId)
    .includes("duksu");

beforeEach(() => {
  resetMessengerChatSourceForTests();
  turns = 0;
  token = jwt("user-a");
  setTesterAccessActive(true);
  setMessengerChatRemote(remote);
});
afterEach(() => {
  setMessengerChatRemote(null);
  setTesterAccessActive(false);
  resetMessengerChatSourceForTests();
});

describe("서버 모드 결선", () => {
  test("SW-U1 로그인한 시험 계정 + 진입점 포트 → 서버 인물 방", () => {
    expect(isServer()).toBe(true);
  });

  test("SW-U2 포트가 없거나(테스트 · 진입점 밖) 시험 계정이 아니거나 로그아웃이면 가짜 출처", () => {
    setMessengerChatRemote(null);
    expect(isServer()).toBe(false);
    setMessengerChatRemote(remote);
    setTesterAccessActive(false);
    expect(isServer()).toBe(false);
    setTesterAccessActive(true);
    token = undefined;
    expect(isServer()).toBe(false);
  });

  test("SW-U3 사용자가 바뀌면 출처를 새로 만들고 앞 출처는 버린다", () => {
    const first = messengerChatSource(imageUrlOf);
    expect(messengerChatSource(imageUrlOf)).toBe(first);
    token = jwt("user-b");
    const second = messengerChatSource(imageUrlOf);
    expect(second).not.toBe(first);
    // 버린 출처로는 서버에 보내지 않는다(dispose) — 새 출처는 보낸다.
    first.sendText("duksu", "안녕");
    expect(turns).toBe(0);
    second.sendText("duksu", "안녕");
    expect(turns).toBe(1);
  });

  test("SW-U4 시험 표시가 꺼지면 가짜로, 다시 켜지면 서버로 바뀐다", () => {
    const server = messengerChatSource(imageUrlOf);
    setTesterAccessActive(false);
    const local = messengerChatSource(imageUrlOf);
    expect(local).not.toBe(server);
    expect(isServer()).toBe(false);
    setTesterAccessActive(true);
    expect(isServer()).toBe(true);
  });
});
