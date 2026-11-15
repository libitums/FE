import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { companionRemote } from "../lib/companion-api";
import { setTesterAccessActive } from "../lib/tester-access";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { memoryTurnRecordStore } from "../screens/messenger-chat/turn-ledger";
import { App } from "./App";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import {
  openTab,
  present,
  renderTesterApp,
  tapId,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(CM-I1 · I2): 서버 모드 사진 · 음성(ADR-0146 「앱 연결」) — 실제 App · 메신저 결선 · `companionRemote`(실제 전송)가
// 한 트리에서 맞물립니다. 대역은 네트워크 경계(`fetch`)뿐 — 기록 RPC · 스냅샷/음성 Edge Function · get_media · Storage 서명 · 지갑.

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const BASE = "https://test.supabase.co";

const mediaRow = (over: Record<string, unknown> = {}) => ({
  id: M1,
  characterId: "duksu",
  messageId: A1,
  kind: "snapshot",
  status: "pending",
  charge: "photo",
  cost: 35,
  path: null,
  mime: null,
  aspect: null,
  failure: null,
  aiGenerated: true,
  engine: null,
  model: null,
  createdAt: "2026-11-15T10:19:00.000Z",
  finishedAt: null,
  ...over,
});

type Reply = { readonly status: number; readonly body: unknown };
let replies: Record<string, Reply[]> = {};
let calls: string[] = [];
const route = (url: string): string | null => {
  if (url.includes("/rpc/companion_list_messages")) return "history";
  if (url.includes("/functions/v1/companion-snapshot")) return "snapshot";
  if (url.includes("/functions/v1/companion-voice")) return "voice";
  if (url.includes("/rpc/companion_get_media")) return "media";
  if (url.includes("/storage/v1/object/sign/companion-media/")) return "sign";
  if (url.includes("/rpc/companion_get_wallet")) return "wallet";
  return null;
};
const fetchDouble = async (url: string) => {
  const key = route(url);
  if (key === null) return { status: 404, text: async () => "{}" };
  calls.push(key);
  const queue = replies[key] ?? [];
  const reply = (queue.length > 1 ? queue.shift() : queue[0]) ?? { status: 500, body: {} };
  return { status: reply.status, text: async () => JSON.stringify(reply.body) };
};

const history = {
  messages: [
    {
      id: A1,
      role: "assistant",
      origin: "turn",
      status: "complete",
      createdAt: "2026-11-15T10:18:00.000Z",
      segments: [{ kind: "speech", text: "반가워요", translation: "Nice to meet you" }],
    },
  ],
  hasMore: false,
};

let events: EpisodeIntroEvent[] = [];
const named = (name: string) => events.filter((event) => event.name === name);
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

beforeEach(() => {
  replies = {};
  calls = [];
  events = [];
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore([]),
    turns: memoryTurnRecordStore(null),
    now: () => Date.now(),
  });
  setMessengerChatRemote(companionRemote);
  setTesterAccessActive(true);
});
afterEach(() => {
  cleanup();
  setMessengerChatRemote(null);
  setTesterAccessActive(false);
  resetMessengerChatSourceForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function bootToRoom(coins: number) {
  await renderTesterApp(
    <App
      progressSeed={legacyPassedSeedWithCoins(coins)}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
  vi.stubGlobal("fetch", fetchDouble);
  // 생년은 이미 답한 것으로 — 방을 열 때 생년 시트가 요청 대화상자를 가리지 않게.
  messengerChatSource((path) => path).setBirthYear(2000);
  openTab("messenger");
  expect(textOf("messenger-list-coins")).toContain(String(coins));
  // 첫 입장 안내(목록 카드)가 같은 줄을 한 장 더 띄웁니다 — 목록 안의 줄을 누릅니다.
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-duksu"),
      {},
    );
  });
  await flush();
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
}

test("CM-I1 사진: 요청(202) → 자리표시자 → 2초 뒤 다시 읽기 → 서명 URL 사진, 서버 잔액이 방에 · 이벤트 둘", async () => {
  replies = {
    history: [{ status: 200, body: history }],
    snapshot: [{ status: 202, body: { media: mediaRow(), cached: false } }],
    media: [
      { status: 200, body: [] }, // 방을 열 때
      {
        status: 200,
        body: [mediaRow({ status: "complete", path: `tester-1/${M1}.png`, aspect: "3:2" })],
      },
    ],
    sign: [
      {
        status: 200,
        body: { signedURL: `/object/sign/companion-media/tester-1/${M1}.png?token=t` },
      },
    ],
    wallet: [
      { status: 200, body: { tier: "free", sub: 0, grant: 15, paid: 70, trialRemaining: 0 } },
    ],
  };
  await bootToRoom(120);
  tapId("messenger-chat-feature-snapshot");
  expect(textOf("messenger-chat-ask-balance")).toBe("You have 120 coins");
  tapRound("messenger-chat-ask-confirm");
  expect(present("messenger-chat-photo-pending")).toBe(true);
  await flush();
  expect(calls).toContain("snapshot");
  await wait(2_200);
  await flush();
  expect(present("messenger-chat-photo-pending")).toBe(false);
  expect(screen.getByTestId("messenger-chat-photo").getAttribute("src")).toBe(
    `${BASE}/storage/v1/object/sign/companion-media/tester-1/${M1}.png?token=t`,
  );
  // 예약 · 확정 뒤 서버 지갑(85)이 메신저 지갑으로 — 앱 지갑에서 따로 빼지 않습니다.
  expect(calls.filter((call) => call === "wallet").length).toBeGreaterThanOrEqual(2);
  tapRound("messenger-chat-back");
  expect(textOf("messenger-list-coins")).toContain("85");
  expect(named("chat_media_requested")).toHaveLength(1);
  expect(named("chat_media_completed")).toEqual([
    expect.objectContaining({
      name: "chat_media_completed",
      surface: "chat",
      characterId: "duksu",
      media: "photo",
      outcome: "complete",
    }),
  ]);
}, 15_000);

test("CM-I2 음성 429 시도 상한 → 회색 줄, 이벤트 refused, 지갑은 그대로", async () => {
  replies = {
    history: [{ status: 200, body: history }],
    media: [{ status: 200, body: [] }],
    voice: [
      {
        status: 429,
        body: {
          error: "attempt_limit",
          detail: {
            kind: "voice",
            reason: "attempts",
            limit: 60,
            resetsAt: "2026-11-16T00:00:00.000Z",
          },
        },
      },
    ],
  };
  await bootToRoom(120);
  tapId("messenger-chat-feature-voice");
  tapRound("messenger-chat-ask-confirm");
  await flush();
  expect(screen.getByTestId("messenger-chat-media-notice").getAttribute("data-notice")).toBe(
    "limit",
  );
  expect(present("messenger-chat-voice-pending")).toBe(false);
  expect(named("chat_media_completed")).toEqual([
    expect.objectContaining({ media: "voice", outcome: "refused" }),
  ]);
  tapRound("messenger-chat-back");
  expect(textOf("messenger-list-coins")).toContain("120");
});
