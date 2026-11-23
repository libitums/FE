import { describe, expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type {
  ChatMediaRemote,
  ChatMediaSettled,
  MediaRequestResult,
  RemoteMedia,
} from "./chat-media.contract";
import { mediaLineId } from "./chat-media-rules";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { companionSeed } from "./companion-roster";

// `unit` 계층(CM-U9 ~ U11): 서버 모드 출처의 사진 · 음성 흐름 — 가짜 원격 · 가짜 타이머(ADR-0146 「앱 연결」).

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

const history = {
  messages: [
    {
      id: `${A1}#0`,
      at: 1,
      kind: "text",
      from: "them",
      text: { ko: "반가워요", en: "Nice to meet you" },
    } as ChatMessage,
  ],
  corrections: {},
  ideas: null,
};

const media = (over: Partial<RemoteMedia> = {}): RemoteMedia => ({
  id: M1,
  messageId: A1,
  kind: "snapshot",
  status: "pending",
  path: null,
  aspect: null,
  failure: null,
  createdAt: 1_000,
  stage: null,
  ...over,
});

function setup(
  over: {
    request?: MediaRequestResult;
    loads?: (readonly RemoteMedia[] | null)[];
    noMedia?: boolean;
    history?: typeof history;
    sign?: ChatMediaRemote["sign"];
  } = {},
) {
  const timers = fakeTimers();
  let clock = 1_000;
  const loads = [...(over.loads ?? [])];
  const port: ChatMediaRemote = {
    request: vi.fn(
      async (): Promise<MediaRequestResult> =>
        over.request ?? { kind: "accepted", media: media(), cached: false },
    ),
    load: vi.fn(async () => (loads.length > 0 ? (loads.shift() ?? null) : [])),
    sign: vi.fn(over.sign ?? (async (path: string) => `https://signed/${path}`)),
    balance: vi.fn(async () => 465),
  };
  const remote: ChatRemote = {
    loadHistory: async () => over.history ?? history,
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    ...(over.noMedia === true ? {} : { media: port }),
  };
  const balances: number[] = [];
  const settled: ChatMediaSettled[] = [];
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => clock,
    timers,
    remote,
    mediaHooks: { onBalance: (b) => balances.push(b), onSettled: (s) => settled.push(s) },
  });
  const lines = () => source.thread("duksu")?.messages ?? [];
  const advance = async (ms: number) => {
    clock += ms;
    timers.advance(ms);
    await flush();
  };
  return { source, port, lines, advance, balances, settled, timers };
}

async function opened(over: Parameters<typeof setup>[0] = {}) {
  const env = setup(over);
  env.source.openRoom("duksu");
  await flush();
  return env;
}

describe("요청 → 다시 읽기 → 결과", () => {
  test("CM-U9a 누르면 곧바로 대상 뒤 pending, 202면 서버 줄 · 잔액, 2초 뒤 다시 읽어 사진", async () => {
    const env = await opened({
      loads: [
        [], // 방을 열 때 resume
        [media()], // 2초
        [media({ status: "complete", path: `u/${M1}.png`, aspect: "3:2" })], // 3초 뒤
      ],
    });
    env.source.requestMedia("duksu", "photo");
    // 자리표시자는 요청한 때의 기기 시계를 싣는다(대기 문구 단계의 출발, 리뷰 #541).
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo-pending", startedAt: 1_000 });
    expect(env.source.snapshot().rooms.find((r) => r.roomId === "duksu")?.activity).toBe(
      "sending-photo",
    );
    await flush();
    expect(env.port.request).toHaveBeenCalledWith("snapshot", A1);
    expect(env.lines().at(-1)?.id).toBe(mediaLineId(A1, "photo", M1));
    // 서버 줄로 바뀌어도(id · at이 서버 것) 시작 시각은 요청한 때 그대로 — 단계가 처음으로 돌아가지 않는다.
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo-pending", startedAt: 1_000 });
    expect(env.balances).toEqual([465]);
    await env.advance(2_000);
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo-pending", startedAt: 1_000 });
    await env.advance(3_000);
    expect(env.lines().at(-1)).toEqual({
      id: mediaLineId(A1, "photo", M1),
      at: 1_000,
      kind: "photo",
      imageUrl: `https://signed/u/${M1}.png`,
      aspect: "3:2",
      aiGenerated: true,
    });
    expect(env.settled).toEqual([{ characterId: "duksu", media: "photo", outcome: "complete" }]);
    expect(env.balances).toEqual([465, 465]);
    expect(env.timers.pending()).toBe(0);
  });

  test("CM-U9b 음성 결과는 대상의 말 · 서명 URL, 길이 0(모름)", async () => {
    const voice = media({ kind: "voice" });
    const env = await opened({
      request: { kind: "accepted", media: voice, cached: false },
      loads: [[], [{ ...voice, status: "complete", path: `u/${M1}.mp3` }]],
    });
    env.source.requestMedia("duksu", "voice");
    await flush(); // 요청 응답이 와야 다시 읽기가 걸립니다
    await env.advance(2_000);
    expect(env.lines().at(-1)).toMatchObject({
      kind: "voice",
      durationMs: 0,
      text: { ko: "반가워요", en: "Nice to meet you" },
      audioUrl: `https://signed/u/${M1}.mp3`,
    });
  });

  test("CM-U9c blocked는 회색 줄(pending 사라짐)과 outcome blocked", async () => {
    const env = await opened({
      loads: [[], [media({ status: "blocked", failure: "check_failed" })]],
    });
    env.source.requestMedia("duksu", "photo");
    await flush();
    await env.advance(2_000);
    expect(env.lines().at(-1)).toMatchObject({ kind: "media-notice", notice: "blocked" });
    expect(env.lines().some((m) => m.kind === "photo-pending")).toBe(false);
    expect(env.settled.at(-1)?.outcome).toBe("blocked");
  });
});

describe("저장본 · 거절 · 연결 실패", () => {
  test("CM-U10a 200 cached complete는 곧바로 결과, 잔액을 읽지 않는다", async () => {
    const env = await opened({
      request: {
        kind: "accepted",
        media: media({ status: "complete", path: "u/a.png" }),
        cached: true,
      },
    });
    env.source.requestMedia("duksu", "photo");
    await flush();
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo", imageUrl: "https://signed/u/a.png" });
    expect(env.balances).toEqual([]);
    expect(env.timers.pending()).toBe(0);
  });

  test("CM-U10b 거절(429)은 limit 줄 · until · outcome refused", async () => {
    const until = Date.parse("2026-11-16T00:00:00.000Z");
    const env = await opened({ request: { kind: "refused", notice: "limit", until } });
    env.source.requestMedia("duksu", "photo");
    await flush();
    expect(env.lines().at(-1)).toMatchObject({
      kind: "media-notice",
      media: "photo",
      notice: "limit",
      until,
    });
    expect(env.lines().some((m) => m.kind === "photo-pending")).toBe(false);
    expect(env.settled).toEqual([{ characterId: "duksu", media: "photo", outcome: "refused" }]);
  });

  test("CM-U10c 연결 실패면 메시지 id로 한 번 확인 — 서버가 받았으면 이어 가고, 아니면 request-failed 줄", async () => {
    const took = await opened({ request: { kind: "failed" }, loads: [[], [media()]] });
    took.source.requestMedia("duksu", "photo");
    await flush();
    expect(took.port.load).toHaveBeenLastCalledWith({ messageIds: [A1] });
    expect(took.lines().at(-1)).toMatchObject({
      id: mediaLineId(A1, "photo", M1),
      kind: "photo-pending",
    });
    const lost = await opened({ request: { kind: "failed" }, loads: [[], []] });
    lost.source.requestMedia("duksu", "photo");
    await flush();
    expect(lost.lines().at(-1)).toMatchObject({ kind: "media-notice", notice: "request-failed" });
  });

  test("CM-U10d 원격에 사진 · 음성 포트가 없으면 unavailable 줄", async () => {
    const env = await opened({ noMedia: true });
    env.source.requestMedia("duksu", "voice");
    await flush();
    expect(env.lines().at(-1)).toMatchObject({ kind: "media-notice", notice: "unavailable" });
  });
});

describe("서버 진행 단계", () => {
  test("CM-U9d 다시 읽을 때 단계가 drawing으로 바뀌면 대기 줄에 단계 · 비율이 실리고, 시작 시각은 그대로다", async () => {
    const env = await opened({
      request: { kind: "accepted", media: media({ stage: "preparing" }), cached: false },
      loads: [
        [], // 방을 열 때 resume
        [media({ stage: "drawing", aspect: "3:2" })], // 2초
        [media({ stage: "drawing", aspect: "3:2" })], // 3초 뒤
      ],
    });
    env.source.requestMedia("duksu", "photo"); // 기기 시계 1,000
    await flush();
    expect(env.lines().at(-1)).toMatchObject({
      kind: "photo-pending",
      startedAt: 1_000,
      serverStage: "preparing",
    });
    await env.advance(2_000);
    expect(env.lines().at(-1)).toMatchObject({
      kind: "photo-pending",
      startedAt: 1_000,
      serverStage: "drawing",
      aspect: "3:2",
    });
    await env.advance(3_000);
    expect(env.lines().at(-1)).toMatchObject({ startedAt: 1_000, serverStage: "drawing" });
  });
});

describe("방을 나가고 다시 열기 · 상한", () => {
  test("CM-U11a 나가면 다시 읽기가 멈추고, 다시 열면 메시지 id로 물어 결과를 놓는다", async () => {
    const env = await opened({
      loads: [[], [media({ status: "complete", path: "u/a.png" })]],
    });
    env.source.requestMedia("duksu", "photo");
    await flush();
    env.source.closeRoom("duksu");
    await env.advance(2_000); // 틱이 와도 방이 닫혀 읽지 않는다
    expect(env.port.load).toHaveBeenCalledTimes(1);
    expect(env.timers.pending()).toBe(0);
    env.source.openRoom("duksu");
    await flush();
    expect(env.port.load).toHaveBeenLastCalledWith({ messageIds: [A1] });
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo", imageUrl: "https://signed/u/a.png" });
  });

  test("CM-U11c 다시 열어도 아직 만드는 중이면 대기 줄의 시작 시각(기기 시계)은 요청한 때 그대로다(리뷰 #541)", async () => {
    const env = await opened({ loads: [[], [media()], [media()]] });
    env.source.requestMedia("duksu", "photo"); // 기기 시계 1,000
    await flush();
    env.source.closeRoom("duksu");
    await env.advance(8_000);
    env.source.openRoom("duksu");
    await flush();
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo-pending", startedAt: 1_000 });
    env.source.closeRoom("duksu");
    await env.advance(4_000);
    env.source.openRoom("duksu");
    await flush();
    expect(env.lines().at(-1)).toMatchObject({ kind: "photo-pending", startedAt: 1_000 });
  });

  test("CM-U11b 서버가 끝내 pending이면 앱 상한(11분) 뒤 failed 줄, 더 읽지 않는다", async () => {
    const env = await opened({ loads: [[], ...Array.from({ length: 40 }, () => [media()])] });
    env.source.requestMedia("duksu", "photo");
    await flush();
    for (let i = 0; i < 40 && env.timers.pending() > 0; i += 1) await env.advance(30_000);
    expect(env.lines().at(-1)).toMatchObject({ kind: "media-notice", notice: "failed" });
    expect(env.timers.pending()).toBe(0);
    expect(env.settled.at(-1)?.outcome).toBe("failed");
  });

  test("CM-U11c 답을 기다리는 중이거나 대상이 없으면 요청하지 않는다", async () => {
    const env = setup();
    env.source.requestMedia("duksu", "photo"); // 아직 기록 없음 — 대상 없음
    await flush();
    expect(env.port.request).not.toHaveBeenCalled();
  });
});

describe("늦게 끝난 옛 다시 읽기(리뷰 #442)", () => {
  test("CM-U12 다시 열기로 새 세대가 결과를 놓은 뒤, 옛 세대가 늦게 끝나도 결과를 「준비 중」으로 되돌리지 않는다", async () => {
    const A2 = "44444444-4444-4444-8444-444444444444";
    const M2 = "55555555-5555-4555-8555-555555555555";
    const twoMessages = {
      ...history,
      messages: [
        ...history.messages,
        {
          id: `${A2}#0`,
          at: 2,
          kind: "text",
          from: "them",
          text: { ko: "또 봐요", en: "See you" },
        } as ChatMessage,
      ],
    };
    let release: (url: string) => void = () => undefined;
    let first = true;
    const sign = async (path: string) => {
      if (!first) return `https://signed/${path}`;
      first = false;
      return new Promise<string>((resolve) => (release = resolve));
    };
    const p1 = media({ status: "complete", path: "u/1.png", createdAt: 1_000 });
    const p2Pending = media({ id: M2, messageId: A2, status: "pending", createdAt: 2_000 });
    const p2Done = media({
      id: M2,
      messageId: A2,
      status: "complete",
      path: "u/2.png",
      createdAt: 2_000,
    });
    const env = setup({
      history: twoMessages,
      sign,
      loads: [
        [p1, p2Pending],
        [p1, p2Done],
      ],
    });
    env.source.openRoom("duksu"); // 옛 세대: p1 서명을 기다리는 중
    await flush();
    env.source.closeRoom("duksu");
    env.source.openRoom("duksu"); // 새 세대: 둘 다 끝난 결과를 놓는다
    await flush();
    const photoOf = (messageId: string) =>
      env
        .lines()
        .filter((m) => m.id.startsWith(`${messageId}~`))
        .map((m) => m.kind);
    expect(photoOf(A2)).toEqual(["photo"]);
    release("https://signed/u/1.png"); // 옛 세대가 늦게 끝남
    await flush();
    expect(photoOf(A2)).toEqual(["photo"]);
  });
});
