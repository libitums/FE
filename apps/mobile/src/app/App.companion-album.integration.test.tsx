import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { companionRemote } from "../lib/companion-api";
import { setTesterAccessActive } from "../lib/tester-access";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
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
  pressSystemBack,
  renderTesterApp,
  stubBackHost,
  tapId,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(AL-I1 ~ I3): 앨범 · 다시 그리기 · 사진 속 내 모습(ADR-0150) — 실제 App · 메신저 결선 · `companionRemote`가
// 한 트리에서 맞물립니다. 대역은 네트워크 경계(`fetch`)뿐 — 기록 · 앨범 RPC · 스냅샷 Edge Function · 상태 · 서명 · 지갑 · 프로필.

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const M2 = "44444444-4444-4444-8444-444444444444";

const mediaRow = (over: Record<string, unknown> = {}) => ({
  id: M1,
  characterId: "duksu",
  messageId: A1,
  kind: "snapshot",
  status: "complete",
  charge: "photo",
  cost: 35,
  path: `tester-1/${M1}.png`,
  mime: "image/png",
  aspect: "3:2",
  failure: null,
  aiGenerated: true,
  engine: null,
  model: null,
  createdAt: "2026-11-15T10:19:00.000Z",
  finishedAt: "2026-11-15T10:19:30.000Z",
  line: { ko: "반가워요", en: "Nice to meet you" },
  fromPastChat: false,
  ...over,
});

type Reply = { readonly status: number; readonly body: unknown };
let replies: Record<string, Reply[]> = {};
let calls: { key: string; body: unknown }[] = [];
const route = (url: string): string | null => {
  if (url.includes("/rpc/companion_list_messages")) return "history";
  if (url.includes("/rpc/companion_list_media")) return "album";
  if (url.includes("/rpc/companion_save_profile")) return "profile";
  if (url.includes("/functions/v1/companion-snapshot")) return "snapshot";
  if (url.includes("/rpc/companion_get_media")) return "media";
  if (url.includes("/storage/v1/object/sign/companion-media/")) return "sign";
  if (url.includes("/rpc/companion_get_wallet")) return "wallet";
  return null;
};
const fetchDouble = async (url: string, init?: { body?: string }) => {
  const key = route(url);
  if (key === null) return { status: 404, text: async () => "{}" };
  calls.push({ key, body: init?.body === undefined ? null : JSON.parse(init.body) });
  const queue = replies[key] ?? [];
  const reply = (queue.length > 1 ? queue.shift() : queue[0]) ?? { status: 500, body: {} };
  return { status: reply.status, text: async () => JSON.stringify(reply.body) };
};
const bodiesOf = (key: string) => calls.filter((call) => call.key === key).map((call) => call.body);
/** 프로필 저장 중 내 모습 몫 — 방에 들어갈 때 고른 생년도 같은 RPC로 간다(ADR-0125). */
const selfSaves = () =>
  bodiesOf("profile").filter((body) => (body as { p_snapshot_self?: unknown }).p_snapshot_self);
const selfSaveIndex = () =>
  calls.findIndex(
    (call) =>
      call.key === "profile" && (call.body as { p_snapshot_self?: unknown }).p_snapshot_self,
  );

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
const baseReplies = (): Record<string, Reply[]> => ({
  history: [{ status: 200, body: history }],
  album: [{ status: 200, body: { items: [mediaRow()], hasMore: false } }],
  profile: [{ status: 204, body: "" }],
  snapshot: [
    {
      status: 202,
      body: { media: mediaRow({ id: M2, status: "pending", path: null }), cached: false },
    },
  ],
  media: [{ status: 200, body: [] }],
  sign: [
    { status: 200, body: { signedURL: `/object/sign/companion-media/tester-1/${M1}.png?token=t` } },
  ],
  wallet: [{ status: 200, body: { tier: "free", sub: 0, grant: 15, paid: 70, trialRemaining: 0 } }],
});

const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  replies = baseReplies();
  calls = [];
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore([]),
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
});

async function bootToRoom() {
  await renderTesterApp(<App progressSeed={legacyPassedSeedWithCoins(120)} />);
  vi.stubGlobal("fetch", fetchDouble);
  messengerChatSource((path) => path).setBirthYear(2000);
  openTab("messenger");
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-duksu"),
      {},
    );
  });
  await flush();
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
}

test("AL-I1 방 사이드바 Album → 덕수쌤 앨범(서버 앨범 · 서명 그림) → Redraw 확인이 again 요청을 보내고, 뒤로면 방(다시 그리는 자리표시자)", async () => {
  await bootToRoom();
  stubBackHost();
  tapId("messenger-chat-settings");
  tapId("messenger-chat-sidebar-album");
  await flush();
  expect(present("chat-album-screen")).toBe(true);
  expect(textOf("chat-album-screen")).toContain("덕수쌤's album");
  expect(bodiesOf("album")[0]).toMatchObject({ p_character_id: "duksu", p_before: null });
  expect(present(`chat-album-tile-${M1}`)).toBe(true);

  tapId(`chat-album-tile-${M1}`);
  expect(textOf("chat-album-viewer")).toContain("Nice to meet you");
  tapId("chat-album-redraw");
  tapId("chat-album-remake-go");
  await flush();
  expect(bodiesOf("snapshot")).toEqual([{ message_id: A1, again: true }]);
  expect(textOf(`chat-album-tile-${M1}`)).toContain("Drawing…");

  pressSystemBack();
  expect(present("messenger-chat-screen")).toBe(true);
  expect(present("messenger-chat-photo-pending")).toBe(true);
}, 15_000);

test("AL-I2 첫 Snapshot은 내 모습을 묻고, 고른 값을 서버 프로필에 먼저 적은 뒤 요청한다 — 다음 요청은 묻지 않는다", async () => {
  await bootToRoom();
  tapId("messenger-chat-feature-snapshot");
  expect(present("messenger-chat-ask-self")).toBe(true);
  tapId("chat-snapshot-self-hidden");
  tapRound("messenger-chat-ask-confirm");
  await flush();
  expect(selfSaves()).toEqual([
    expect.objectContaining({ p_snapshot_self: "hidden", p_birth_year: null }),
  ]);
  expect(selfSaveIndex()).toBeLessThan(calls.findIndex((c) => c.key === "snapshot"));
  // 방에 들어갈 때 고른 생년도 서버 프로필에 갔다(ADR-0125).
  expect(bodiesOf("profile")).toContainEqual(
    expect.objectContaining({ p_birth_year: 2000, p_age_source: "self" }),
  );
  expect(messengerChatSource((path) => path).snapshot().preferences.snapshotSelf).toBe("hidden");
}, 15_000);

test("AL-I3 설정 탭 Chats → You in snapshots → Man → Save면 서버 프로필에 적는다", async () => {
  await bootToRoom();
  tapRound("messenger-chat-back");
  openTab("settings");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-settings-group-item-chats")).getByTestId(
      "ui-lynx-settings-cell",
    ),
    {},
  );
  expect(present("chat-settings-screen")).toBe(true);
  tapId("chat-settings-snapshot-self");
  tapId("chat-snapshot-self-male");
  tapId("ui-lynx-bottom-sheet-action-save");
  await flush();
  expect(selfSaves()).toEqual([expect.objectContaining({ p_snapshot_self: "male" })]);
  expect(textOf("chat-settings-snapshot-self")).toContain("Man");
}, 15_000);
