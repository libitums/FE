import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { chatLineElementId } from "../../components/chat/chat-log-scroll";
import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatMediaRemote, MediaRequestResult, RemoteMedia } from "./chat-media.contract";
import type { ChatRemote, RemoteHistory, RemoteTurnHandlers } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { resetSampleOfferMemoryForTests } from "./use-room-guide";

// `integration` 계층(GS-I1 ~ I4, ADR-0146 개정 ⟨예시 대상⟩ · 이슈 #648): 가이드 → 학습자가 답함 → 덕수쌤 응답 → 예시 받기. 무료 예시는
// 첫 인사에 맞춘 고정 파일이라 받기 대상은 첫 인사이고(가장 최근 응답이 아님), 사진 · 음성 줄은 첫 인사 바로 아래에 서며 화면은 그
// 줄을 보인다. 출처(서버 흉내) + 화면을 함께 묶는다.

const G = "11111111-1111-4111-8111-111111111111"; // 첫 인사
const R = "22222222-2222-4222-8222-222222222222"; // 답에 대한 응답
const U = "55555555-5555-4555-8555-555555555555"; // 학습자 답
const PHOTO = "33333333-3333-4333-8333-333333333333";
const VOICE = "44444444-4444-4444-8444-444444444444";

const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 6; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
const flush = async () => {
  for (let round = 0; round < 4; round += 1) await settle();
};

function memoryStore(seen: readonly GuidePart[]): GuideStore {
  const parts = new Set<GuidePart>(seen);
  return { unseen: (part) => !parts.has(part), markSeen: (part) => void parts.add(part) };
}

const greetingBubbles: ChatMessage[] = [
  { id: `${G}#0`, at: 1, kind: "text", from: "them", text: { ko: "안녕하세요!", en: "Hi!" } },
  { id: `${G}#1`, at: 1, kind: "text", from: "them", text: { ko: "저는 덕수예요.", en: "" } },
];

const sampleRow = (id: string, kind: "snapshot" | "voice", messageId: string): RemoteMedia => ({
  id,
  messageId,
  kind,
  status: "complete",
  path: kind === "snapshot" ? "samples/duksu-guide-01.png" : "samples/duksu-guide-voice-01.mp3",
  aspect: kind === "snapshot" ? "3:2" : null,
  failure: null,
  createdAt: 1,
  stage: null,
});

let invoked: { readonly selector: string; readonly method: string }[] = [];

function serverRoom(history: RemoteHistory, offer = { snapshot: true, voice: true }) {
  const timers = fakeTimers();
  const turns: RemoteTurnHandlers[] = [];
  const claim = vi.fn(async (messageId: string, kind: string): Promise<MediaRequestResult> => ({
    kind: "accepted",
    media:
      kind === "voice"
        ? sampleRow(VOICE, "voice", messageId)
        : sampleRow(PHOTO, "snapshot", messageId),
    cached: false,
  }));
  const request = vi.fn(async (..._args: unknown[]): Promise<MediaRequestResult> => ({
    kind: "failed",
  }));
  const media: ChatMediaRemote = {
    request,
    load: async () => [],
    sign: async (path) => `https://signed/${path}`,
    balance: async () => 100,
    sample: { offer: vi.fn(async () => offer), claim },
  };
  const remote: ChatRemote = {
    loadHistory: async () => history,
    greet: () => new Promise(() => undefined),
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
    media,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers,
    remote,
  });
  return { source, claim, request, timers, turns };
}

/** 학습자가 가이드 도중 답하고 덕수쌤 응답이 스트림으로 온다. */
async function answer(env: ReturnType<typeof serverRoom>) {
  act(() => {
    env.source.sendText("duksu", "안녕하세요");
  });
  await flush();
  const turn = env.turns.at(-1);
  const send = (name: string, data: unknown) => turn?.onEvent(name, JSON.stringify(data));
  act(() => {
    send("start", { userMessageId: U, assistantMessageId: R });
    send("delta", { segment: 0, kind: "speech", text: "반가워요!" });
    send("done", { assistantMessageId: R });
    turn?.onEnd("complete", null);
  });
  await flush();
}

const ids_ = () => env_messages().map((m) => m.id);
let env_messages: () => readonly ChatMessage[] = () => [];

beforeEach(() => {
  vi.useRealTimers();
  invoked = [];
  const realQuery = lynx.createSelectorQuery.bind(lynx);
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(() => {
    const query = realQuery();
    return {
      ...query,
      select: (selector: string) => ({
        ...query.select(selector),
        invoke: (args: { readonly method: string }) => {
          invoked.push({ selector, method: args.method });
          return { exec: () => undefined };
        },
      }),
    } as unknown as ReturnType<typeof lynx.createSelectorQuery>;
  });
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  resetSampleOfferMemoryForTests();
  vi.restoreAllMocks();
});

const intoViews = () =>
  invoked.filter((call) => call.method === "scrollIntoView").map((call) => call.selector);

describe("가이드 → 답 → 예시 받기", () => {
  test("GS-I1 답한 뒤 사진 · 음성 예시를 받으면 받기 대상은 첫 인사, 줄은 첫 인사 바로 아래 — 화면은 그 줄을 보인다", async () => {
    const env = serverRoom({
      messages: greetingBubbles,
      corrections: {},
      ideas: null,
      greetingId: G,
    });
    env_messages = () => env.source.thread("duksu")?.messages ?? [];
    mountChat({
      source: env.source,
      roomId: "duksu",
      guideStore: memoryStore(["list", "room", "keyboard"]),
    });
    await flush();
    expect(screen.queryByTestId(ids.guideCoach)?.getAttribute("data-step")).toBe("sample");
    // 가이드 중 입력 줄은 열려 있다 — 학습자가 답한다.
    await answer(env);
    expect(ids_()).toEqual([`${G}#0`, `${G}#1`, U, `${R}#0`]);

    fireEvent.tap(screen.getByTestId(ids.snapshot), {});
    await flush();
    expect(env.claim).toHaveBeenLastCalledWith(G, "snapshot");
    expect(ids_().slice(0, 3)).toEqual([`${G}#0`, `${G}#1`, `${G}~snapshot~req`]);
    act(() => env.timers.advance(1500));
    await flush();
    expect(ids_().slice(0, 4)).toEqual([
      `${G}#0`,
      `${G}#1`,
      `${G}~snapshot~${PHOTO}`,
      expect.stringMatching(new RegExp(`^${G}~snapshot~x`)),
    ]);
    expect(ids_().slice(-2)).toEqual([U, `${R}#0`]);
    expect(intoViews()).toContain(`#${chatLineElementId(`${G}~snapshot~${PHOTO}`)}`);

    // 이어지는 음성 예시도 첫 인사 — 자막은 첫 인사 글이다.
    fireEvent.tap(screen.getByTestId(ids.snapVoice), {});
    await flush();
    expect(env.claim).toHaveBeenLastCalledWith(G, "voice");
    act(() => env.timers.advance(1500));
    await flush();
    const voice = env_messages().find((m) => m.id === `${G}~voice~${VOICE}`);
    expect(voice).toMatchObject({
      kind: "voice",
      text: { ko: "안녕하세요! 저는 덕수예요.", en: "Hi!" },
    });
    expect(ids_().indexOf(`${G}~voice~${VOICE}`)).toBeLessThan(ids_().indexOf(U));
    expect(intoViews()).toContain(`#${chatLineElementId(`${G}~voice~${VOICE}`)}`);
  });

  test("GS-I2 서버가 첫 인사를 알려 주지 않으면 그 방의 첫 캐릭터 메시지가 대상이다", async () => {
    const history: RemoteHistory = {
      messages: [
        ...greetingBubbles,
        { id: U, at: 2, kind: "text", from: "me", text: { ko: "네", en: "" } },
        { id: `${R}#0`, at: 3, kind: "text", from: "them", text: { ko: "응답", en: "" } },
      ],
      corrections: {},
      ideas: null,
    };
    const env = serverRoom(history);
    mountChat({
      source: env.source,
      roomId: "duksu",
      guideStore: memoryStore(["list", "room", "keyboard"]),
    });
    await flush();
    fireEvent.tap(screen.getByTestId(ids.snapshot), {});
    await flush();
    expect(env.claim).toHaveBeenLastCalledWith(G, "snapshot");
  });

  test("GS-I3 첫 인사에 말 조각이 없으면 음성 예시는 제안되지 않는다(사진만)", async () => {
    const actionOnly: RemoteHistory = {
      messages: [{ id: `${G}#0`, at: 1, kind: "action", text: { ko: "*손을 흔든다*", en: "" } }],
      corrections: {},
      ideas: null,
      greetingId: G,
    };
    const env = serverRoom(actionOnly);
    env.source.openRoom("duksu");
    await flush();
    expect(await env.source.sampleSnapshot?.offered("duksu")).toEqual({
      snapshot: true,
      voice: false,
    });
  });

  test("GS-I4 유료 사진은 지금처럼 가장 최근 메시지(응답)가 대상이다", async () => {
    const env = serverRoom({
      messages: greetingBubbles,
      corrections: {},
      ideas: null,
      greetingId: G,
    });
    env.source.openRoom("duksu");
    await flush();
    await answer(env);
    env.source.requestMedia("duksu", "photo");
    await flush();
    expect(env.request.mock.calls.at(-1)?.slice(0, 2)).toEqual(["snapshot", R]);
  });
});
