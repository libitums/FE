import { describe, expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatMediaRemote, MediaRequestResult, RemoteMedia } from "./chat-media.contract";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";

// `unit` 계층(GD-U7 ~ U9, 가이드 예시 두 장 · #648 뒤): 서버 흉내 출처로 방 흐름을 돈다. 앱이 놓은 예시 줄의 대상과 서버 행의
// `messageId`가 다르면(운영 정리로 첫 인사로 옮긴 행 · 받기 응답이 첫 인사를 돌려줌) 방을 다시 열 때 같은 사진이 두 장 섰다.

const P = "77777777-7777-4777-8777-777777777777"; // 첫 인사보다 먼저 선 선톡
const G = "11111111-1111-4111-8111-111111111111"; // 첫 인사
const U = "55555555-5555-4555-8555-555555555555"; // 학습자 답
const R = "22222222-2222-4222-8222-222222222222"; // 가이드 도중 응답
const M = "33333333-3333-4333-8333-333333333333"; // 예시 사진

const flush = async () => {
  for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const say = (owner: string, at: number, ko: string): ChatMessage => ({
  id: `${owner}#0`,
  at,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});
const log: ChatMessage[] = [
  say(G, 1, "안녕하세요!"),
  { id: U, at: 2, kind: "text", from: "me", text: { ko: "안녕하세요", en: "" } },
  say(R, 3, "반가워요!"),
];
const row = (messageId: string, kind: "snapshot" | "voice" = "snapshot"): RemoteMedia => ({
  id: M,
  messageId,
  kind,
  status: "complete",
  path: "samples/duksu-guide-01.png",
  aspect: "3:2",
  failure: null,
  createdAt: 10,
  stage: null,
});

function room(history: RemoteHistory, loads: (readonly RemoteMedia[])[], claimed?: RemoteMedia) {
  const timers = fakeTimers();
  let clock = 1_000;
  const queue = [...loads];
  const claim = vi.fn(async (): Promise<MediaRequestResult> =>
    claimed === undefined
      ? { kind: "failed" }
      : { kind: "accepted", media: claimed, cached: false },
  );
  const media: ChatMediaRemote = {
    request: vi.fn(async (): Promise<MediaRequestResult> => ({ kind: "failed" })),
    load: vi.fn(async () => queue.shift() ?? []),
    sign: async (path) => `https://signed/${path}`,
    balance: async () => 100,
    sample: { offer: async () => ({ snapshot: true, voice: true }), claim },
  };
  const remote: ChatRemote = {
    loadHistory: async () => history,
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    media,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => clock,
    timers,
    remote,
  });
  const lines = () => source.thread("duksu")?.messages ?? [];
  const photos = () =>
    lines()
      .filter((m) => m.kind === "photo")
      .map((m) => m.id);
  const reopen = async () => {
    source.closeRoom("duksu");
    source.openRoom("duksu");
    await flush();
  };
  const advance = async (ms: number) => {
    clock += ms;
    timers.advance(ms);
    await flush();
  };
  return { source, claim, lines, photos, reopen, advance };
}

describe("GD 가이드 예시가 두 장으로 서지 않는다", () => {
  test("GD-U7 응답 아래에 섰던 예시 행을 서버가 첫 인사로 옮긴 뒤 다시 열면 첫 인사 아래 한 장만", async () => {
    const history: RemoteHistory = { messages: log, corrections: {}, ideas: null, greetingId: G };
    const env = room(history, [[row(R)], [row(G)]]);
    env.source.openRoom("duksu");
    await flush();
    expect(env.photos()).toEqual([`${R}~snapshot~${M}`]);
    await env.reopen();
    expect(env.photos()).toEqual([`${G}~snapshot~${M}`]);
    expect(env.lines().map((m) => m.id)).toEqual([`${G}#0`, `${G}~snapshot~${M}`, U, `${R}#0`]);
  });

  test("GD-U8 받기 응답의 messageId(첫 인사)가 앱이 고른 대상과 다르면 곧바로 그 아래에 서고, 다시 열어도 한 장", async () => {
    // 기록이 첫 인사를 표시하지 않은 방 — 앱은 첫 캐릭터 메시지(선톡)를 고르지만 서버는 첫 인사에 붙인다.
    const history: RemoteHistory = {
      messages: [say(P, 0, "선톡"), ...log],
      corrections: {},
      ideas: null,
    };
    const env = room(history, [[], [row(G)]], row(G));
    env.source.openRoom("duksu");
    await flush();
    const done = env.source.sampleSnapshot?.claim("duksu");
    await flush();
    expect(env.claim).toHaveBeenCalledWith(P, "snapshot");
    await env.advance(1_500);
    expect(await done).toBe("received");
    expect(env.photos()).toEqual([`${G}~snapshot~${M}`]);
    const ids = env.lines().map((m) => m.id);
    expect(ids.indexOf(`${G}~snapshot~${M}`)).toBe(ids.indexOf(`${G}#0`) + 1);
    expect(env.lines().some((m) => m.kind === "photo-pending")).toBe(false);
    await env.reopen();
    expect(env.photos()).toEqual([`${G}~snapshot~${M}`]);
  });

  test("GD-U9 사진 예시 뒤 음성 예시 — 같은 첫 인사 아래 사진 한 장 · 음성 한 줄, 다시 열어도 그대로", async () => {
    const history: RemoteHistory = { messages: log, corrections: {}, ideas: null, greetingId: G };
    const voice: RemoteMedia = { ...row(G, "voice"), id: "88888888-8888-4888-8888-888888888888" };
    const env = room(history, [[], [row(G), voice]], row(G));
    env.source.openRoom("duksu");
    await flush();
    const photo = env.source.sampleSnapshot?.claim("duksu");
    await env.advance(1_500);
    await photo;
    env.claim.mockResolvedValueOnce({ kind: "accepted", media: voice, cached: false });
    const spoken = env.source.sampleSnapshot?.claim("duksu", "voice");
    await env.advance(1_500);
    await spoken;
    await env.reopen();
    const kinds = env
      .lines()
      .filter((m) => m.id.startsWith(`${G}~`) && m.kind !== "media-notice")
      .map((m) => m.kind);
    expect(kinds).toEqual(["photo", "voice"]);
    expect(env.photos()).toEqual([`${G}~snapshot~${M}`]);
  });
});

describe("GA 첫 인사가 첫 쪽 밖인 방(점검 3)", () => {
  // 대화 30개가 넘으면 첫 쪽에 첫 인사가 없다. 예전에는 불러온 범위의 첫 캐릭터 말에 놓았고, 서버는 첫 인사에 붙여 다시 열면 사라졌다.
  const cut: RemoteHistory = {
    messages: [
      say(R, 3, "반가워요!"),
      { id: U, at: 4, kind: "text", from: "me", text: { ko: "네", en: "" } },
    ],
    corrections: {},
    ideas: null,
    hasMore: true,
  };

  test("GA-U4 서버가 제안해도 앱은 사진 · 음성 예시를 세우지 않고, 받기도 부르지 않는다", async () => {
    const env = room(cut, [[]], row(G));
    env.source.openRoom("duksu");
    await flush();
    expect(await env.source.sampleSnapshot?.offered("duksu")).toEqual({
      snapshot: false,
      voice: false,
    });
    expect(await env.source.sampleSnapshot?.claim("duksu")).toBe("failed");
    expect(env.claim).not.toHaveBeenCalled();
  });

  test("GA-U5 앞부분까지 다 읽은 방(hasMore 없음)은 지금처럼 첫 캐릭터 메시지로 제안한다", async () => {
    const env = room({ ...cut, hasMore: false }, [[]], row(G));
    env.source.openRoom("duksu");
    await flush();
    expect(await env.source.sampleSnapshot?.offered("duksu")).toEqual({
      snapshot: true,
      voice: true,
    });
  });
});
