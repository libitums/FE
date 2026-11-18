import { describe, expect, test, vi } from "vitest";

import type { ChatFriend } from "./chat-friends.contract";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { newBadgeShown, orderChatRooms } from "./chat-list";
import type { ChatRemote, RemoteGreeting } from "./chat-remote.contract";
import type { ChatRoomSummary, ChatSource } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";
import { memoryFriendStore } from "./friend-store";

// `integration` 계층(RF-I1 ~ I9): 서버 모드 출처의 추천 친구 — 서버 목록(`companion_friends`) ∩ 인물 표만 보이고, 목록을 못 받으면
// (RPC 없음 · null · 던짐) 아무도 보이지 않는다. 추가하면 방이 열리고(목록에 생김) 기기 기록(계정마다)에 적히고, 해금 선톡과 같은
// `greet(id, "unlock")`을 청해 마지막 말 · 안 읽음 1 · NEW로 선다. 다시 켜면 열린 채, 서버가 빼도 방은 남는다. 성인 확인은 프로필 ·
// `companion_ack_adult`가 알린다.

const NOW = 1_800_000_000_000;
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const hello = (id: string): RemoteGreeting => ({
  messages: [
    { id: `${id}-g#0`, at: NOW, kind: "text", from: "them", text: { ko: "안녕하세요", en: "Hi" } },
  ],
  ideas: null,
});

type Over = {
  friends?: ChatRemote["friends"] | null;
  ackAdult?: ChatRemote["ackAdult"];
  adultAck?: boolean;
};

function setup(
  over: Over = {},
  options: { unlocked?: string[]; store?: ReturnType<typeof memoryFriendStore> } = {},
) {
  const listed: ChatFriend[] = [
    { id: "seoyeon", romanceTier: "open" },
    { id: "daeun", romanceTier: "standard" },
  ];
  const greet = vi.fn(async (characterId: string, _trigger?: "unlock") => hello(characterId));
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet,
    openTurn: () => ({ cancel: () => undefined }),
    profile: {
      load: async () => ({
        birthYear: 1995,
        ...(over.adultAck === undefined ? {} : { adultAck: over.adultAck }),
      }),
      saveBirthYear: async () => true,
    },
    ...(over.friends === null ? {} : { friends: over.friends ?? (async () => listed) }),
    ...(over.ackAdult === undefined ? {} : { ackAdult: over.ackAdult }),
  };
  const store = options.store ?? memoryFriendStore();
  const source = createFixtureChatSource({
    imageUrlOf: (path) => `url:${path}`,
    seed: companionSeed(),
    now: () => NOW,
    timers: fakeTimers(),
    remote,
    friendStore: store,
    ...(options.unlocked === undefined ? {} : { unlocked: options.unlocked }),
  });
  return { source, greet, store };
}

const summaryOf = (source: ChatSource, roomId: string): ChatRoomSummary | undefined =>
  source.snapshot().rooms.find((room) => room.roomId === roomId);
const listed = (source: ChatSource) => orderChatRooms(source.snapshot().rooms).map((r) => r.roomId);

describe("보이는 친구 (RF-I1 · I2)", () => {
  test("RF-I1 서버 목록을 받으면 그 친구만 보이고, 추가 전 친구는 목록에 없다", async () => {
    const { source } = setup();
    expect(source.friends?.state().status).toBe("loading");
    expect(source.friends?.state().visible).toEqual([]);
    await flush();
    const state = source.friends?.state();
    expect(state?.status).toBe("ready");
    expect(state?.visible.map((f) => f.id)).toEqual(["seoyeon", "daeun"]);
    expect(state?.added).toEqual([]);
    expect(summaryOf(source, "seoyeon")?.access).toEqual({ kind: "addable" });
    expect(listed(source)).not.toContain("seoyeon");
    expect(source.friends?.state()).toBe(state); // 같은 상태면 같은 참조
  });

  test.each([
    ["RPC 없음", null],
    ["null(404 · 오프라인)", async () => null],
    ["던짐", async () => Promise.reject(new Error("offline"))],
  ] as const)("RF-I2 목록을 못 받으면(%s) 친구가 보이지 않는다", async (_label, friends) => {
    const { source } = setup({ friends: friends as Over["friends"] });
    await flush();
    expect(source.friends?.state().status).toBe("unavailable");
    expect(source.friends?.state().visible).toEqual([]);
    expect(source.friends?.add("seoyeon")).toEqual({ kind: "unavailable" });
  });

  test("RF-I2 가짜 출처(서버 없음)도 친구가 없다", () => {
    const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed() });
    expect(source.friends?.state()).toMatchObject({ status: "unavailable", visible: [] });
  });
});

describe("친구 추가 (RF-I3 ~ I6)", () => {
  test("RF-I3 추가하면 방이 열려 목록에 생기고, 기기 기록에 적히고, 해금 선톡과 같은 첫 말을 청한다", async () => {
    const { source, greet, store } = setup();
    await flush();
    expect(source.friends?.add("seoyeon")).toEqual({ kind: "added", roomId: "seoyeon" });
    expect(summaryOf(source, "seoyeon")?.access).toEqual({ kind: "open" });
    expect(listed(source)).toContain("seoyeon");
    expect(store.read().get("seoyeon")).toEqual({ addedAt: NOW, messaged: false });
    expect(greet).toHaveBeenCalledWith("seoyeon", "unlock");
    expect(source.friends?.state().added).toEqual(["seoyeon"]);
  });

  test("RF-I4 첫 말이 오면 마지막 말 · 안 읽음 1 · NEW로 서고 목록 맨 위다", async () => {
    const { source } = setup();
    await flush();
    source.friends?.add("daeun");
    await flush();
    const room = summaryOf(source, "daeun");
    expect(room?.lastMessage).toMatchObject({ kind: "text", text: { ko: "안녕하세요" } });
    expect(room?.unread).toBe(1);
    expect(room?.isNew).toBe(true);
    expect(room === undefined ? false : newBadgeShown(room)).toBe(true);
    expect(listed(source)[0]).toBe("daeun");
  });

  test("RF-I5 이미 추가한 친구는 already-added · 보이지 않는 친구 · 이야기 인물 · 모르는 id는 unavailable", async () => {
    const { source, greet } = setup();
    await flush();
    source.friends?.add("seoyeon");
    expect(source.friends?.add("seoyeon")).toEqual({ kind: "already-added", roomId: "seoyeon" });
    expect(source.friends?.add("haejun")).toEqual({ kind: "unavailable" });
    expect(source.friends?.add("mina")).toEqual({ kind: "unavailable" });
    expect(source.friends?.add("nobody")).toEqual({ kind: "unavailable" });
    expect(greet).toHaveBeenCalledTimes(1);
  });

  test("RF-I6 기록은 계정의 저장 하나에 남고 처음 추가 시각을 지킨다", () => {
    const store = memoryFriendStore();
    store.add("seoyeon", 1);
    store.add("seoyeon", 2);
    store.markMessaged("seoyeon");
    store.markMessaged("nobody");
    expect([...store.read()]).toEqual([["seoyeon", { addedAt: 1, messaged: true }]]);
  });
});

describe("다시 켬 · 서버가 뺌 (RF-I7 · I8)", () => {
  test("RF-I7 다시 켜면 추가한 친구는 처음부터 열려 있다(NEW · 안 읽음 없음) — 기록이 없는 새 기기는 줄에 다시 선다", async () => {
    const { source } = setup({}, { unlocked: ["seoyeon"] });
    await flush();
    expect(summaryOf(source, "seoyeon")).toMatchObject({
      access: { kind: "open" },
      unread: 0,
      isNew: false,
    });
    expect(source.friends?.state().added).toEqual(["seoyeon"]);
    const fresh = setup();
    await flush();
    expect(fresh.source.friends?.state().added).toEqual([]);
    expect(fresh.source.friends?.add("seoyeon")).toEqual({ kind: "added", roomId: "seoyeon" });
  });

  test("RF-I8 서버가 목록에서 뺀 추가한 친구도 방은 남는다(대화는 서버의 not_available)", async () => {
    const { source } = setup(
      { friends: async () => [{ id: "daeun", romanceTier: "standard" }] },
      { unlocked: ["haejun"] },
    );
    await flush();
    expect(summaryOf(source, "haejun")?.access).toEqual({ kind: "open" });
    expect(listed(source)).toContain("haejun");
    expect(source.friends?.state().added).toEqual(["haejun"]);
    expect(source.friends?.state().visible.map((f) => f.id)).toEqual(["daeun"]);
  });
});

describe("성인 확인 (RF-I9)", () => {
  test("RF-I9 프로필의 adultAck를 받고, ackAdult가 서버 답으로 바꾼다 — 포트가 없으면 false", async () => {
    const ackAdult = vi.fn(async () => true);
    const { source } = setup({ adultAck: false, ackAdult });
    await flush();
    expect(source.friends?.state().adultAck).toBe(false);
    expect(await source.friends?.ackAdult()).toBe(true);
    expect(ackAdult).toHaveBeenCalledTimes(1);
    expect(source.friends?.state().adultAck).toBe(true);

    const none = setup();
    await flush();
    expect(none.source.friends?.state().adultAck).toBeNull();
    expect(await none.source.friends?.ackAdult()).toBe(false);
  });
});
