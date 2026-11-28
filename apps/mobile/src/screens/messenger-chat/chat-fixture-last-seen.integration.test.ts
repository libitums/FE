import { describe, expect, test } from "vitest";

import { chatRowPreview, orderChatRooms } from "./chat-list";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { memoryLastSeenStore, type LastSeenStore } from "./chat-last-seen-store";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(LSN-I1 ~ I7): 앱이 꺼진 사이 온 선톡 · 스토리 반응의 안 읽음(ADR-0213 개정). 기기에 방마다 본 마지막 인물
// 메시지를 두고, 다시 켜 기록을 읽을 때 그 뒤 인물 메시지 수를 안 읽음으로 센다(서버 흉내 탐침 — 「앱 종료 → 도착 → 실행」).

const flush = async () => {
  for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const T0 = "2026-11-27T10:00:00.000Z";
const T1 = "2026-11-27T10:31:08.260Z";
const them = (id: string, ko: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});
const page = (messages: ChatMessage[]): RemoteHistory => ({
  messages,
  corrections: {},
  ideas: null,
});

/** 서버 흉내 — 인물별 기록과 목록 요약. 앱을 다시 켜도(출처를 새로 만들어도) 같은 서버입니다. */
function probeServer(start: Record<string, ChatMessage[]>, summary: Record<string, string | null>) {
  const histories = new Map(Object.entries(start));
  let lastAt = new Map(Object.entries(summary));
  const remote: ChatRemote = {
    loadHistory: async (characterId) => page(histories.get(characterId) ?? []),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    lastMessages: async () => new Map(lastAt),
    clearChat: async (characterId) => {
      histories.set(characterId, []);
      lastAt = new Map(lastAt).set(characterId, null);
      return "cleared";
    },
  };
  return {
    remote,
    /** 크론이 그 인물의 방에 메시지를 넣는다(앱이 꺼져 있든 아니든). */
    arrive: (characterId: string, message: ChatMessage, at: string) => {
      histories.set(characterId, [...(histories.get(characterId) ?? []), message]);
      lastAt = new Map(lastAt).set(characterId, at);
    },
  };
}

/** 앱 실행 한 번 — 같은 기기 저장(`seen`)으로 출처를 새로 만듭니다. */
async function launch(server: ReturnType<typeof probeServer>, seen: LastSeenStore) {
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    timers: fakeTimers(),
    remote: server.remote,
    unlocked: ["mina"],
    previewOnStart: true,
    lastSeen: seen,
  });
  await flush();
  const row = (roomId: string) => source.snapshot().rooms.find((room) => room.roomId === roomId);
  return { source, row };
}

async function visit(source: Awaited<ReturnType<typeof launch>>["source"], roomId: string) {
  source.openRoom(roomId);
  await flush();
  source.closeRoom(roomId);
}

describe("앱이 꺼진 사이 온 메시지의 안 읽음", () => {
  test("LSN-I1 방을 본 뒤 앱을 끄고 반응 2개가 오면, 켰을 때 그 방은 안 읽음 2 · 맨 위 · 최신 미리보기", async () => {
    const server = probeServer(
      { duksu: [them("d-1", "안녕하세요", 800)], mina: [them("m-1#0", "하이", 50)] },
      { duksu: T0, mina: T0 },
    );
    const seen = memoryLastSeenStore();
    const first = await launch(server, seen);
    await visit(first.source, "mina");
    first.source.dispose(); // 앱 종료
    server.arrive("mina", them("m-2#0", "와, 서울 도착 축하해!", 900), T1);
    server.arrive("mina", them("m-3#0", "사진 예쁘다!", 910), T1);
    const { source, row } = await launch(server, seen);
    expect(row("mina")?.unread).toBe(2);
    expect(row("duksu")?.unread).toBe(0);
    expect(orderChatRooms(source.snapshot().rooms)[0]?.roomId).toBe("mina");
    const mina = row("mina");
    expect(mina === undefined ? null : chatRowPreview(mina)).toMatchObject({
      text: { ko: "사진 예쁘다!" },
    });
  });

  test("LSN-I2 처음 설치 · 업데이트 직후 첫 실행(저장값 없음)은 지금 끝을 본 것으로 두고 0에서 시작한다", async () => {
    const server = probeServer(
      {
        duksu: [them("d-1", "안녕하세요", 800)],
        mina: [them("m-1", "하이", 50), them("m-2", "또", 60)],
      },
      { duksu: T0, mina: T0 },
    );
    const seen = memoryLastSeenStore();
    const { row } = await launch(server, seen);
    expect(row("mina")?.unread).toBe(0);
    expect(row("duksu")?.unread).toBe(0);
    expect(seen.read("mina")).toEqual({ id: "m-2", at: 60 });
    expect(seen.read("duksu")).toEqual({ id: "d-1", at: 800 });
  });

  test("LSN-I3 처음 켤 때 대화가 없던 방에 앱이 꺼진 사이 선톡이 오면, 켰을 때 안 읽음 1", async () => {
    const server = probeServer(
      { duksu: [them("d-1", "안녕하세요", 800)] },
      { duksu: T0, mina: null },
    );
    const seen = memoryLastSeenStore();
    (await launch(server, seen)).source.dispose();
    server.arrive("mina", them("m-1", "선톡!", 900), T1);
    const { row } = await launch(server, seen);
    expect(row("mina")?.unread).toBe(1);
  });

  test("LSN-I4 켜 둔 채 닫힌 방에 메시지 2개가 오면 맞추기는 안 읽음 2(메시지 수)", async () => {
    const server = probeServer({ mina: [them("m-1", "하이", 50)] }, { duksu: null, mina: T0 });
    const { source, row } = await launch(server, memoryLastSeenStore());
    server.arrive("mina", them("m-2", "하나", 900), T1);
    server.arrive("mina", them("m-3", "둘", 910), T1);
    source.server?.syncRooms();
    await flush();
    expect(row("mina")?.unread).toBe(2);
  });

  test("LSN-I5 열린 방에서 받은 메시지는 본 것 — 다시 켜도 안 읽음 0", async () => {
    const server = probeServer({ mina: [them("m-1", "하이", 50)] }, { duksu: null, mina: T0 });
    const seen = memoryLastSeenStore();
    const first = await launch(server, seen);
    first.source.openRoom("mina");
    await flush();
    server.arrive("mina", them("m-2", "선톡!", 900), T1);
    first.source.server?.syncRooms(); // 앞으로 옴 — 열린 방 다시 읽기
    await flush();
    expect(seen.read("mina")).toEqual({ id: "m-2", at: 900 });
    first.source.dispose();
    const { row } = await launch(server, seen);
    expect(row("mina")?.unread).toBe(0);
  });

  test("LSN-I6 대화 비우기 뒤에는 빈 대화를 본 것으로 — 그 뒤 온 메시지는 다시 켜면 안 읽음", async () => {
    const server = probeServer({ mina: [them("m-1", "하이", 50)] }, { duksu: null, mina: T0 });
    const seen = memoryLastSeenStore();
    const first = await launch(server, seen);
    await expect(first.source.clearRoom("mina")).resolves.toBe("cleared");
    expect(seen.read("mina")).toEqual({ id: null, at: 0 });
    first.source.dispose();
    server.arrive("mina", them("m-9", "다시 안녕", 950), T1);
    const { row } = await launch(server, seen);
    expect(row("mina")?.unread).toBe(1);
  });

  test("LSN-I7 저장이 없는 출처(비회원 · 옛 테스트)는 지금과 같다 — 다시 켠 뒤 안 읽음 0", async () => {
    const server = probeServer({ mina: [them("m-1", "하이", 50)] }, { duksu: null, mina: T0 });
    const source = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: companionSeed(),
      timers: fakeTimers(),
      remote: server.remote,
      unlocked: ["mina"],
      previewOnStart: true,
    });
    server.arrive("mina", them("m-2", "선톡!", 900), T1);
    await flush();
    expect(source.snapshot().rooms.find((room) => room.roomId === "mina")?.unread).toBe(0);
  });
});
