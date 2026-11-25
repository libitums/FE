import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { CHAT_PLACEHOLDERS } from "../screens/messenger-chat/chat-placeholders";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { App } from "./App";
import { CHAT_PUSH_ASK_GAP_MS } from "./chat-push-ask";
import { resetPushWiringForTests } from "./push-wiring";
import { contentNotFoundResponse, isContentRequest } from "./test-helpers/content-requests";
import {
  advance,
  openTab,
  present,
  renderTesterApp,
  resetMessengerChatSource,
  tapId,
  tapKeys,
  tapRound,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(CPA-I1 ~ I4): 채팅 첫 답장 뒤 알림 권한 카드(ADR-0197). 실제 App · 메신저 목록 · 방 · 가짜 출처 · 결선 포트 ·
// `syncPushDevice`가 한 트리에서 맞물린다. 대역은 경계뿐 — 호스트 `PushNotificationModule` · `fetch`(기기 등록 RPC) · 가짜 타이머.

const timing = CHAT_PLACEHOLDERS.timing;
const token = "e5".repeat(32);
const CARD = "messenger-chat-push-ask";
const REGISTER = "https://test.supabase.co/rest/v1/rpc/register_push_device";

let events: EpisodeIntroEvent[] = [];
const named = (name: string) => events.filter((event) => event.name === name);

type PushHost = { permission: string; register: ReturnType<typeof vi.fn> };

function stubPushHost(permission: string, grant: boolean): PushHost {
  const host: PushHost = {
    permission,
    register: vi.fn((callback: (payload: unknown) => void) => {
      if (host.permission === "not-determined") host.permission = grant ? "authorized" : "denied";
      callback(
        host.permission === "authorized"
          ? { permission: "authorized", token, environment: "sandbox" }
          : { permission: host.permission },
      );
    }),
  };
  vi.stubGlobal("NativeModules", {
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) =>
        callback({ permission: host.permission }),
      register: host.register,
      takeOpened: (callback: (payload: unknown) => void) => callback({ target: null }),
      openSettings: () => undefined,
    },
  });
  return host;
}

function recordFetch(): string[] {
  const calls: string[] = [];
  vi.stubGlobal("fetch", (url: string) => {
    if (isContentRequest(url)) return Promise.resolve(contentNotFoundResponse());
    calls.push(url);
    return Promise.resolve({ status: 204, text: async () => "" });
  });
  return calls;
}

const settle = () =>
  act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });

beforeEach(async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  await resetMessengerChatSource();
});

afterEach(() => {
  cleanup();
  resetPushWiringForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function boot(
  permission: string,
  grant = true,
): Promise<{ host: PushHost; calls: string[] }> {
  events = [];
  const host = stubPushHost(permission, grant);
  await renderTesterApp(
    <App
      progressSeed={legacyPassedSeedWithCoins(0)}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
    { keepFakeTimers: true },
  );
  const calls = recordFetch();
  await settle();
  openTab("messenger");
  return { host, calls };
}

function openOwner(): void {
  tapId("messenger-list-row-owner");
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
}

/** 「안」을 보내고 정해 둔 답이 다 올 때까지 시간을 보냅니다. */
async function sendAndReply(): Promise<void> {
  if (!present("messenger-keyboard-rows")) tapId("messenger-chat-field");
  tapKeys("ㅇ", "ㅏ", "ㄴ");
  tapRound("messenger-chat-send");
  await settle();
  advance(timing.typingDelayMs + timing.replyDelayMs);
  await settle();
}

const tapIn = (testId: string) =>
  act(() => {
    fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
  });

test("CPA-I1. 미결정 회원: 방을 열 때는 없고, 첫 답이 오면 카드 → Turn on → 시스템 창 · 기기 등록 RPC → 한 줄로 접힌다", async () => {
  const { host, calls } = await boot("not-determined");
  openOwner();
  await settle();
  expect(present(CARD)).toBe(false);

  await sendAndReply();
  expect(screen.getAllByTestId("messenger-chat-incoming").length).toBeGreaterThanOrEqual(2);
  expect(present(CARD)).toBe(true);
  expect(host.register).not.toHaveBeenCalled();
  expect(named("chat_push_ask_shown")).toEqual([
    expect.objectContaining({ characterId: "owner", count: "1", surface: "chat" }),
  ]);

  tapIn("messenger-chat-push-ask-turn-on");
  await settle();
  expect(host.register).toHaveBeenCalledTimes(1);
  expect(calls.filter((url) => url === REGISTER)).toHaveLength(1);
  expect(present(CARD)).toBe(false);
  expect(screen.getByTestId("messenger-chat-push-ask-on").textContent).toContain("will ping you.");
  expect(named("chat_push_ask_answered")).toEqual([
    expect.objectContaining({ characterId: "owner", result: "allowed" }),
  ]);
});

test("CPA-I2. Not now → 사라지고, 다시 들어와 답을 받아도 3일 안에는 없다 · 3일 뒤 두 번째 · 그 뒤로는 없다", async () => {
  const { host } = await boot("not-determined");
  // 부팅 도우미가 가짜 타이머를 다시 세우므로 시계는 부팅 뒤에 고정합니다.
  const start = new Date("2026-11-25T10:00:00Z").getTime();
  vi.setSystemTime(start);
  openOwner();
  await sendAndReply();
  tapIn("messenger-chat-push-ask-not-now");
  expect(present(CARD)).toBe(false);
  expect(named("chat_push_ask_tapped")).toEqual([expect.objectContaining({ choice: "not_now" })]);

  tapRound("messenger-chat-back");
  openOwner();
  await sendAndReply();
  expect(present(CARD)).toBe(false);

  tapRound("messenger-chat-back");
  vi.setSystemTime(start + CHAT_PUSH_ASK_GAP_MS + 60_000);
  openOwner();
  await sendAndReply();
  expect(present(CARD)).toBe(true);
  expect(named("chat_push_ask_shown").map((event) => (event as { count: string }).count)).toEqual([
    "1",
    "2",
  ]);
  tapIn("messenger-chat-push-ask-not-now");

  tapRound("messenger-chat-back");
  vi.setSystemTime(start + 10 * CHAT_PUSH_ASK_GAP_MS);
  openOwner();
  await sendAndReply();
  expect(present(CARD)).toBe(false);
  expect(host.register).not.toHaveBeenCalled();
});

test("CPA-I3. 이미 허용한 회원: 카드 없이 첫 답 뒤 조용히 기기를 등록한다", async () => {
  const { host, calls } = await boot("authorized");
  const before = host.register.mock.calls.length;
  const rpcBefore = calls.filter((url) => url === REGISTER).length;
  openOwner();
  await sendAndReply();
  expect(present(CARD)).toBe(false);
  expect(host.register.mock.calls.length).toBe(before + 1);
  expect(calls.filter((url) => url === REGISTER).length).toBe(rpcBefore + 1);
  expect(named("chat_push_ask_shown")).toEqual([]);
});

test("CPA-I4. 이미 거절한 회원 · Turn on에서 거절: 카드가 없거나 사라지고 다시 묻지 않는다", async () => {
  const denied = await boot("denied");
  openOwner();
  await sendAndReply();
  expect(present(CARD)).toBe(false);
  expect(denied.host.register).not.toHaveBeenCalled();
  cleanup();
  vi.unstubAllGlobals();
  resetPushWiringForTests();
  await resetMessengerChatSource();

  const refused = await boot("not-determined", false);
  openOwner();
  await sendAndReply();
  tapIn("messenger-chat-push-ask-turn-on");
  await settle();
  expect(present(CARD)).toBe(false);
  expect(present("messenger-chat-push-ask-on")).toBe(false);
  expect(named("chat_push_ask_answered")).toEqual([expect.objectContaining({ result: "denied" })]);
  expect(refused.calls.filter((url) => url === REGISTER)).toHaveLength(0);
});
