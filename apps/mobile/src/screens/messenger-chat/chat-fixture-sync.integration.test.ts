import { describe, expect, test } from "vitest";

import { chatRowPreview, orderChatRooms } from "./chat-list";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import type { ChatStoryQuote } from "./friend-stories.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(LS-I1 ~ I7): 목록 맞추기(`server.syncRooms`) — 서버 크론이 만든 스토리 반응 · 선톡은 푸시가 없거나(꺼짐 · 권한 없음 ·
// 게이트) 앱이 뒤에 있을 때 오면 목록에 서지 않았다. 앱이 앞으로 올 때 · 목록에 들어올 때 목록 요약(`companion_list_characters`의
// 방별 `lastMessageAt`)을 한 번 읽어, 마지막으로 맞춘 값과 다른 닫힌 방만 기록을 다시 읽는다(서버 흉내 탐침).

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const T0 = "2026-11-27T10:00:00.000Z";
const T1 = "2026-11-27T10:31:08.260Z";
const myStory: ChatStoryQuote = {
  storyId: "ms-1",
  characterId: "me",
  line: "서울에 도착했어!",
  imagePath: null,
  postedAt: 500,
};
const them = (id: string, ko: string, at = 1, story?: ChatStoryQuote): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
  ...(story === undefined ? {} : { story }),
});
const page = (messages: ChatMessage[]): RemoteHistory => ({
  messages,
  corrections: {},
  ideas: null,
});

/** 서버 흉내 — 인물별 기록과 목록 요약을 바꿔 가며 돌려줍니다. */
function probeServer(start: Record<string, ChatMessage[]>, summary: Record<string, string | null>) {
  const histories = new Map(Object.entries(start));
  let lastAt = new Map(Object.entries(summary));
  const loads: string[] = [];
  let summaries = 0;
  let summaryDown = false;
  const remote: ChatRemote = {
    loadHistory: async (characterId) => {
      loads.push(characterId);
      return page(histories.get(characterId) ?? []);
    },
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    lastMessages: async () => {
      summaries += 1;
      return summaryDown ? null : new Map(lastAt);
    },
  };
  return {
    remote,
    loads,
    summaries: () => summaries,
    setDown: (down: boolean) => {
      summaryDown = down;
    },
    /** 크론이 그 인물의 방에 메시지를 넣는다(대화의 last_message_at이 바뀐다). */
    arrive: (characterId: string, message: ChatMessage, at: string) => {
      histories.set(characterId, [...(histories.get(characterId) ?? []), message]);
      lastAt = new Map(lastAt).set(characterId, at);
    },
  };
}

function setup(server: ReturnType<typeof probeServer>, withRemote: Partial<ChatRemote> = {}) {
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    timers: fakeTimers(),
    remote: { ...server.remote, ...withRemote },
    unlocked: ["mina"],
    previewOnStart: true,
  });
  const row = (roomId: string) => source.snapshot().rooms.find((room) => room.roomId === roomId);
  return { source, row };
}

describe("목록 맞추기 — 앞으로 옴 · 목록에 들어옴", () => {
  test("LS-I1 목록에 있는 동안 스토리 반응이 오고(푸시 없음) 앞으로 오면 그 방만 다시 읽어 미리보기 · 안 읽음 · 순서가 맞는다", async () => {
    const server = probeServer(
      { duksu: [them("d-1", "안녕하세요", 100)], mina: [them("m-1", "하이", 50)] },
      { duksu: T0, mina: T0 },
    );
    const { source, row } = setup(server);
    await flush();
    server.loads.length = 0;
    server.arrive("mina", them("m-2", "와, 서울 도착 축하해!", 900, myStory), T1);
    source.server?.syncRooms();
    await flush();
    expect(server.loads).toEqual(["mina"]);
    const mina = row("mina");
    expect(mina?.unread).toBe(1);
    expect(mina === undefined ? null : chatRowPreview(mina)).toEqual({
      kind: "text",
      from: "them",
      text: { ko: "와, 서울 도착 축하해!", en: "" },
    });
    expect(orderChatRooms(source.snapshot().rooms)[0]?.roomId).toBe("mina");
  });

  test("LS-I2 바뀐 방이 없으면 요약 한 번만 읽고 기록은 읽지 않는다", async () => {
    const server = probeServer({ duksu: [them("d-1", "안녕하세요")] }, { duksu: T0, mina: null });
    const { source } = setup(server);
    await flush();
    server.loads.length = 0;
    const before = server.summaries();
    source.server?.syncRooms();
    await flush();
    expect(server.summaries()).toBe(before + 1);
    expect(server.loads).toEqual([]);
  });

  test("LS-I3 같은 반응을 두 번 맞춰도 안 읽음은 하나 · 두 번째는 기록을 읽지 않는다", async () => {
    const server = probeServer({ duksu: [] }, { duksu: null, mina: null });
    const { source, row } = setup(server);
    await flush();
    server.arrive("duksu", them("d-9", "선톡!", 900), T1);
    source.server?.syncRooms();
    await flush();
    server.loads.length = 0;
    source.server?.syncRooms();
    await flush();
    expect(server.loads).toEqual([]);
    expect(row("duksu")?.unread).toBe(1);
  });

  test("LS-I4 처음 켤 때 요약에 대화가 없는 방은 미리 읽지 않는다(요약을 못 읽으면 전부 미리 읽는다)", async () => {
    const server = probeServer({ duksu: [them("d-1", "안녕하세요")] }, { duksu: T0, mina: null });
    setup(server);
    await flush();
    expect(server.loads).toEqual(["duksu"]);
    const down = probeServer({ duksu: [them("d-1", "안녕하세요")] }, { duksu: T0, mina: null });
    down.setDown(true);
    setup(down);
    await flush();
    expect([...down.loads].sort()).toEqual(["duksu", "mina"]);
  });

  test("LS-I5 요약을 못 읽으면 닫힌 방은 그대로 두고, 다음 맞추기에서 채운다", async () => {
    const server = probeServer({ duksu: [] }, { duksu: null, mina: null });
    const { source, row } = setup(server);
    await flush();
    server.arrive("duksu", them("d-9", "선톡!", 900), T1);
    server.setDown(true);
    source.server?.syncRooms();
    await flush();
    expect(row("duksu")?.unread).toBe(0);
    server.setDown(false);
    source.server?.syncRooms();
    await flush();
    expect(row("duksu")?.unread).toBe(1);
  });

  test("LS-I6 열린 방은 요약을 기다리지 않고 다시 읽고(안 읽음 0), 닫힌 방만 요약으로 고른다", async () => {
    const server = probeServer(
      { duksu: [them("d-1", "안녕하세요")], mina: [] },
      { duksu: null, mina: null },
    );
    const { source, row } = setup(server);
    await flush();
    source.openRoom("duksu");
    await flush();
    server.arrive("duksu", them("d-9", "선톡!", 900), T1);
    server.loads.length = 0;
    source.server?.syncRooms();
    expect(server.loads).toEqual(["duksu"]);
    await flush();
    expect(server.loads).toEqual(["duksu"]);
    expect(row("duksu")?.unread).toBe(0);
  });

  test("LS-I8 알림을 눌러 앞으로 옴 — 요약을 읽는 사이 그 방이 열리면(이미 읽은 방) 그 방도 다시 읽는다", async () => {
    const server = probeServer(
      { duksu: [them("d-1", "안녕하세요")], mina: [them("m-1", "하이")] },
      { duksu: T0, mina: T0 },
    );
    const { source } = setup(server);
    await flush();
    source.openRoom("mina");
    await flush();
    source.closeRoom("mina");
    server.arrive("mina", them("m-2", "와, 서울 도착 축하해!", 900, myStory), T1);
    server.loads.length = 0;
    source.server?.syncRooms(); // 앞으로 옴 — 아직 열린 방 없음
    source.openRoom("mina"); // 누른 알림이 그 방을 엶(이미 읽은 방이라 기록을 다시 읽지 않음)
    await flush();
    expect(server.loads).toEqual(["mina"]);
    expect(source.thread("mina")?.messages.map((m) => m.id)).toContain("m-2");
  });

  test("LS-I7 요약 포트가 없는 원격(옛 테스트 원격)이면 열린 방만 다시 읽는다 — 지금과 같다", async () => {
    const server = probeServer({ duksu: [] }, { duksu: null, mina: null });
    const { source } = setup(server, { lastMessages: undefined });
    await flush();
    server.loads.length = 0;
    source.server?.syncRooms();
    await flush();
    expect(server.loads).toEqual([]);
  });
});
