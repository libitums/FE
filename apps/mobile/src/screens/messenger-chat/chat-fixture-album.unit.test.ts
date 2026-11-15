import { describe, expect, test, vi } from "vitest";

import type { ChatAlbumItem, ChatSnapshotSelf } from "./chat-album.contract";
import type { SnapshotSelfStore } from "./chat-fixture-album";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatMediaRemote, RemoteAlbumMedia, RemoteMedia } from "./chat-media.contract";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";

// `unit` 계층(AL-U9 ~ U11): 출처의 앨범 · 다시 만들기 · 내 모습 저장 — 가짜 원격 · 가짜 타이머(ADR-0150).

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const M2 = "44444444-4444-4444-8444-444444444444";
const flush = async () => {
  for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

const bubble: ChatMessage = {
  id: `${A1}#0`,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "반가워요", en: "Nice to meet you" },
};
const media = (over: Partial<RemoteMedia> = {}): RemoteMedia => ({
  id: M1,
  messageId: A1,
  kind: "snapshot",
  status: "complete",
  path: `u/${M1}.png`,
  aspect: "3:2",
  failure: null,
  createdAt: 1_000,
  ...over,
});
const albumRow = (over: Partial<RemoteAlbumMedia> = {}): RemoteAlbumMedia => ({
  ...media(),
  characterId: "duksu",
  line: { ko: "반가워요", en: "Nice to meet you" },
  fromPastChat: false,
  ...over,
});

function memoryStore(
  initial: ChatSnapshotSelf | null,
): SnapshotSelfStore & { value: () => ChatSnapshotSelf | null } {
  let value = initial;
  return { read: () => value, write: (self) => (value = self), value: () => value };
}

function server(over: { loads?: (readonly RemoteMedia[])[]; store?: SnapshotSelfStore } = {}) {
  const timers = fakeTimers();
  let clock = 2_000;
  const loads = [...(over.loads ?? [])];
  const port: ChatMediaRemote = {
    request: vi.fn<ChatMediaRemote["request"]>(async () => ({
      kind: "accepted" as const,
      media: media({ id: M2, status: "pending", path: null, createdAt: 2_000 }),
      cached: false,
    })),
    load: vi.fn<ChatMediaRemote["load"]>(async () => loads.shift() ?? []),
    sign: vi.fn<ChatMediaRemote["sign"]>(async (path: string) => `https://signed/${path}`),
    balance: vi.fn<ChatMediaRemote["balance"]>(async () => 100),
    list: vi.fn<NonNullable<ChatMediaRemote["list"]>>(async () => ({
      items: [albumRow(), albumRow({ id: M2, status: "pending", path: null })],
      hasMore: true,
    })),
    saveSelf: vi.fn<NonNullable<ChatMediaRemote["saveSelf"]>>(async () => true),
  };
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [bubble], corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    media: port,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => clock,
    timers,
    remote,
    ...(over.store === undefined ? {} : { selfStore: over.store }),
  });
  const advance = async (ms: number) => {
    clock += ms;
    timers.advance(ms);
    await flush();
  };
  const lines = () => source.thread("duksu")?.messages ?? [];
  return { source, port, advance, lines };
}

describe("AL-U9 서버 앨범 · 다시 만들기", () => {
  test("AL-U9a 앨범은 그 인물의 다 만든 것만, 서명 URL · 말 · hasMore 그대로", async () => {
    const env = server();
    const page = await env.source.album.load("duksu", null);
    expect(env.port.list).toHaveBeenCalledWith({ characterId: "duksu", before: null, limit: 30 });
    expect(page).toEqual({
      items: [
        {
          id: M1,
          messageId: A1,
          kind: "photo",
          url: `https://signed/u/${M1}.png`,
          aspect: "3:2",
          line: { ko: "반가워요", en: "Nice to meet you" },
          createdAt: 1_000,
          fromPastChat: false,
        },
      ],
      hasMore: true,
    });
  });

  test("AL-U9b 다시 그리기는 again 요청 · 자리표시자, 끝나면 새 사진이 옛 사진 자리를 대신한다", async () => {
    const env = server({
      loads: [[media()], [media({ id: M2, createdAt: 2_000, path: `u/${M2}.png` })]],
    });
    env.source.openRoom("duksu");
    await env.advance(0);
    expect(
      env
        .lines()
        .filter((m) => m.kind === "photo")
        .map((m) => m.id),
    ).toEqual([`${A1}~snapshot~${M1}`]);
    const item = (await env.source.album.load("duksu", null))?.items[0] as ChatAlbumItem;
    const result = await env.source.album.remake("duksu", item);
    expect(result).toEqual({ kind: "started" });
    expect(env.port.request).toHaveBeenCalledWith("snapshot", A1, true);
    expect(env.lines().some((m) => m.kind === "photo-pending")).toBe(true);
    await env.advance(2_000);
    const photos = env.lines().filter((m) => m.kind === "photo" || m.kind === "photo-pending");
    expect(photos.map((m) => m.id)).toEqual([`${A1}~snapshot~${M2}`]);
  });

  test("AL-U9c 지난 대화의 칸은 요청하지 않고 failed", async () => {
    const env = server();
    env.source.openRoom("duksu");
    await env.advance(0);
    const item = {
      ...((await env.source.album.load("duksu", null))?.items[0] as ChatAlbumItem),
      fromPastChat: true,
    };
    expect(await env.source.album.remake("duksu", item)).toEqual({ kind: "failed" });
    expect(env.port.request).not.toHaveBeenCalled();
  });
});

describe("AL-U10 가짜 앨범 · 다시 만들기", () => {
  test("방 로그의 결과 줄이 앨범이 되고, 다시 그리면 정한 시간 뒤 새 줄이 옛 줄 자리에 선다", async () => {
    const timers = fakeTimers();
    let clock = 1_000;
    const source = createFixtureChatSource({
      imageUrlOf: (p) => `img/${p}`,
      now: () => clock,
      timers,
    });
    const roomId = "owner"; // 열린 방(가짜 씨앗)
    source.requestMedia(roomId, "photo");
    clock += CHAT_PLACEHOLDERS.timing.photoArrivalMs;
    timers.advance(CHAT_PLACEHOLDERS.timing.photoArrivalMs);
    const page = await source.album.load(roomId, null);
    const photo = page?.items.find((item) => item.kind === "photo");
    expect(photo).toBeDefined();
    const before = source.thread(roomId)?.messages.map((m) => m.id) ?? [];
    expect(await source.album.remake(roomId, photo as ChatAlbumItem)).toEqual({ kind: "started" });
    expect(source.thread(roomId)?.messages.some((m) => m.kind === "photo-pending")).toBe(true);
    clock += CHAT_PLACEHOLDERS.timing.photoArrivalMs;
    timers.advance(CHAT_PLACEHOLDERS.timing.photoArrivalMs);
    const after = source.thread(roomId)?.messages ?? [];
    const at = before.indexOf((photo as ChatAlbumItem).id);
    expect(after[at]?.kind).toBe("photo");
    expect(after[at]?.id).not.toBe((photo as ChatAlbumItem).id);
    expect(after).toHaveLength(before.length);
  });
});

describe("AL-U11 사진 속 내 모습 저장", () => {
  test("AL-U11a 고르면 기기에 적고 서버에 보낸다 · 같은 값이면 다시 보내지 않는다", async () => {
    const store = memoryStore(null);
    const env = server({ store });
    expect(env.source.snapshot().preferences.snapshotSelf).toBeNull();
    env.source.setPreferences({ snapshotSelf: "male" });
    expect(env.source.snapshot().preferences.snapshotSelf).toBe("male");
    expect(store.value()).toBe("male");
    expect(env.port.saveSelf).toHaveBeenCalledWith("male");
    env.source.setPreferences({ snapshotSelf: "male" });
    expect(env.port.saveSelf).toHaveBeenCalledTimes(1);
  });

  test("AL-U11b 기기에 적힌 값으로 시작하고, null로 되돌릴 수 없다 · 모르는 값은 버린다", () => {
    const env = server({ store: memoryStore("hidden") });
    expect(env.source.snapshot().preferences.snapshotSelf).toBe("hidden");
    env.source.setPreferences({ snapshotSelf: null });
    env.source.setPreferences({ snapshotSelf: "robot" as ChatSnapshotSelf });
    expect(env.source.snapshot().preferences.snapshotSelf).toBe("hidden");
    expect(env.port.saveSelf).not.toHaveBeenCalled();
  });
});
