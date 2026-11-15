import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import * as audio from "../../lib/audio";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import {
  chatMediaTestIds as media,
  type ChatMediaRemote,
  type MediaRequestResult,
  type RemoteMedia,
} from "./chat-media.contract";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { clearBackHandlers, mountChat, tapId } from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(CM-UI1 ~ UI7): 서버 모드 방의 사진 · 음성 — 알약 상태 · 자리표시자 · 결과 · 회색 줄 · 재생(ADR-0146 「앱 연결」).

vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));
const announced = () => vi.mocked(accessibility.announce).mock.calls.map((call) => call[0]);

vi.mock("../../lib/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof audio>()),
  playAudio: vi.fn(() => "started" as const),
  stopAudio: vi.fn(),
}));

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

const reply: ChatMessage = {
  id: `${A1}#0`,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "반가워요", en: "Nice to meet you" },
};

const row = (over: Partial<RemoteMedia> = {}): RemoteMedia => ({
  id: M1,
  messageId: A1,
  kind: "snapshot",
  status: "pending",
  path: null,
  aspect: null,
  failure: null,
  createdAt: 1_000,
  ...over,
});

function serverRoom(
  over: {
    history?: RemoteHistory;
    request?: MediaRequestResult;
    loads?: (readonly RemoteMedia[])[];
  } = {},
) {
  const timers = fakeTimers();
  const loads = [...(over.loads ?? [])];
  const port: ChatMediaRemote = {
    request: vi.fn(
      async (): Promise<MediaRequestResult> =>
        over.request ?? { kind: "accepted", media: row(), cached: false },
    ),
    load: vi.fn(async () => loads.shift() ?? []),
    sign: vi.fn(async (path: string) => `https://signed/${path}`),
    balance: vi.fn(async () => 65),
  };
  const remote: ChatRemote = {
    loadHistory: async () => over.history ?? { messages: [reply], corrections: {}, ideas: null },
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    media: port,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers,
    remote,
  });
  return { source, port, timers };
}

async function openRoom(over: Parameters<typeof serverRoom>[0] = {}) {
  const server = serverRoom(over);
  const mounted = mountChat({ source: server.source, roomId: "duksu", coinBalance: 100 });
  await flush();
  return { ...server, ...mounted };
}

const advance = async (env: { timers: ReturnType<typeof fakeTimers> }, ms: number) => {
  act(() => env.timers.advance(ms));
  await flush();
};
const ask = async (pill: string) => {
  tapId(pill);
  tapId(ids.askConfirm);
  await flush();
};
/** 재생 단추는 catchtap입니다. */
const tapPlay = () => fireEvent.tap(screen.getByTestId(ids.voicePlay), { eventType: "catchEvent" });
const label = (testId: string) => screen.getByTestId(testId).getAttribute("accessibility-label");

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("알약 상태", () => {
  test("CM-UI1 대상 메시지가 없으면 알약 둘이 꺼지고, 눌러도 모달이 없으며, 낭독에 까닭이 있다", async () => {
    await openRoom({ history: { messages: [], corrections: {}, ideas: null } });
    expect(screen.getByTestId(ids.snapshot).getAttribute("data-state")).toBe("off");
    expect(screen.getByTestId(ids.snapVoice).getAttribute("data-state")).toBe("off");
    expect(label(ids.snapshot)).toContain("Available after");
    tapId(ids.snapshot);
    expect(screen.queryByTestId(ids.askDialog)).toBeNull();
  });

  test("CM-UI6 만드는 중엔 사진 알약이 꺼지고(pending), 결과가 서면 done", async () => {
    const env = await openRoom({ loads: [[], [row({ status: "complete", path: "u/a.png" })]] });
    expect(screen.getByTestId(ids.snapshot).getAttribute("data-state")).toBe("on");
    await ask(ids.snapshot);
    expect(screen.getByTestId(ids.snapshot).getAttribute("data-state")).toBe("off");
    expect(label(ids.snapshot)).toContain("still working");
    await advance(env, 2_000);
    expect(label(ids.snapshot)).toContain("Already sent");
  });
});

describe("결과", () => {
  test("CM-UI2 사진: 확인 → 자리표시자 → 다시 읽기 → 3:2 사진 + AI-generated, 앱 지갑은 그대로", async () => {
    const env = await openRoom({
      loads: [[], [row({ status: "complete", path: "u/a.png", aspect: "3:2" })]],
    });
    await ask(ids.snapshot);
    expect(env.port.request).toHaveBeenCalledWith("snapshot", A1);
    expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
    expect(env.wallet.balance()).toBe(100);
    await advance(env, 2_000);
    expect(screen.queryByTestId(ids.photoPending)).toBeNull();
    const photo = screen.getByTestId(ids.photo);
    expect(photo.getAttribute("src")).toBe("https://signed/u/a.png");
    expect(photo.getAttribute("data-aspect")).toBe("3:2");
    expect(screen.getByTestId(media.ai).textContent).toBe("AI-generated");
  });

  test("CM-UI3 음성: 결과는 대상의 한국어 · 번역, 길이 글자 없음, 재생은 0.85배 실제 재생 · 다시 누르면 멈춤", async () => {
    const voice = row({ kind: "voice" });
    const env = await openRoom({
      request: { kind: "accepted", media: voice, cached: false },
      loads: [[], [{ ...voice, status: "complete", path: "u/a.mp3" }]],
    });
    await ask(ids.snapVoice);
    expect(screen.getByTestId(ids.voicePending)).toBeTruthy();
    await advance(env, 2_000);
    const bubble = screen.getByTestId(ids.voice);
    expect(bubble.textContent).toContain("반가워요");
    expect(bubble.textContent).toContain("Nice to meet you");
    expect(bubble.textContent).not.toContain("0:00");
    tapPlay();
    expect(vi.mocked(audio.playAudio)).toHaveBeenCalledWith(
      "https://signed/u/a.mp3",
      expect.any(Function),
      0.85,
    );
    expect(screen.getByTestId(ids.voicePlay).getAttribute("data-playback")).toBe("playing");
    tapPlay();
    expect(vi.mocked(audio.stopAudio)).toHaveBeenCalled();
    expect(screen.getByTestId(ids.voicePlay).getAttribute("data-playback")).toBe("idle");
  });

  test("CM-UI5 blocked면 자리표시자 대신 회색 줄", async () => {
    const env = await openRoom({
      loads: [[], [row({ status: "blocked", failure: "check_failed" })]],
    });
    await ask(ids.snapshot);
    await advance(env, 2_000);
    expect(screen.queryByTestId(ids.photoPending)).toBeNull();
    const notice = screen.getByTestId(media.notice);
    expect(notice.getAttribute("data-notice")).toBe("blocked");
    expect(notice.textContent).toContain("Your Yeopjeon were returned.");
  });
});

describe("낭독", () => {
  test("CM-UI8 결과 · 회색 줄이 서면 한 번 낭독한다(답을 기다리지 않아도)", async () => {
    const voice = row({ kind: "voice" });
    const env = await openRoom({
      request: { kind: "accepted", media: voice, cached: false },
      loads: [[], [{ ...voice, status: "complete", path: "u/a.mp3" }]],
    });
    await ask(ids.snapVoice);
    await advance(env, 2_000);
    expect(announced()).toContain("덕수쌤: voice message, 반가워요, Nice to meet you");
    cleanup();
    vi.clearAllMocks();
    await openRoom({ request: { kind: "refused", notice: "unavailable", until: null } });
    await ask(ids.snapshot);
    expect(announced()).toContain("Pictures and voice messages aren't available right now.");
  });
});

describe("거절 줄", () => {
  test("CM-UI4a 429 상한 → 풀리는 시각(기기 시각)이 든 회색 줄", async () => {
    const until = Date.parse("2026-11-16T00:00:00.000Z");
    await openRoom({ request: { kind: "refused", notice: "limit", until } });
    await ask(ids.snapshot);
    const at = new Date(until);
    const clock = `${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")}`;
    expect(screen.getByTestId(media.notice).textContent).toBe(
      `You've reached today's limit. Try again after ${clock}.`,
    );
    expect(screen.queryByTestId(ids.photoPending)).toBeNull();
  });

  test("CM-UI4b 409 만드는 중 · 402 엽전 부족도 회색 줄", async () => {
    await openRoom({ request: { kind: "refused", notice: "busy", until: null } });
    await ask(ids.snapshot);
    expect(screen.getByTestId(media.notice).getAttribute("data-notice")).toBe("busy");
    cleanup();
    await openRoom({ request: { kind: "refused", notice: "no-coins", until: null } });
    await ask(ids.snapVoice);
    expect(screen.getByTestId(media.notice).textContent).toContain("enough Yeopjeon");
  });
});

describe("가짜 출처 회귀", () => {
  test("CM-UI7 가짜 출처는 알약이 늘 켜져 있고, 확인하면 앱 지갑에서 빼고 픽스처 사진이 온다", () => {
    const { wallet } = mountChat({ coinBalance: 100 });
    expect(screen.getByTestId(ids.snapshot).getAttribute("data-state")).toBe("on");
    tapId(ids.snapshot);
    tapId(ids.askConfirm);
    expect(wallet.balance()).toBe(65);
    expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
  });
});
