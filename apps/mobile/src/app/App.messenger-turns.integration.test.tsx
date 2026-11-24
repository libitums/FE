import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";

import { setTesterAccessActive } from "../lib/tester-access";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type {
  ChatRemote,
  RemoteTurnHandlers,
  RemoteWallet,
} from "../screens/messenger-chat/chat-remote.contract";
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
  resetMessengerChatSource,
  tapId,
  tapKeys,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(CP-I1 ~ I5): 대화 요금은 서버 규칙을 따른다(ADR-0155). 실제 App · 메신저 두 화면 · 출처 · 싱글턴 지갑 · 체험 저장이
// 한 트리에서 맞물린다. 앱 안 방(가짜 출처)은 첫 통부터 엽전을 앱 지갑에서 빼고, 서버 방은 앱 지갑에서 빼지 않고 서버 지갑
// (`ChatRemote.wallet` · 턴의 `done` 잔액)을 머리 칩 · 체험 수로 따른다. 대역은 경계뿐 — 저장소 · `ChatRemote` 포트.

const LINE = "messenger-chat-turn-line";
const OUTGOING = "messenger-chat-outgoing";
const COIN_SEND = "messenger-chat-coin-send";
const U1 = "11111111-1111-4111-8111-111111111111";
const A1 = "22222222-2222-4222-8222-222222222222";

let events: EpisodeIntroEvent[] = [];
const named = (name: string) => events.filter((event) => event.name === name);
const row = (id: string) => `messenger-list-row-${id}`;
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
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

async function boot(coins: number): Promise<void> {
  events = [];
  await renderTesterApp(
    <App
      progressSeed={legacyPassedSeedWithCoins(coins)}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
}

function openRoom(id: string): void {
  act(() => {
    fireEvent.tap(within(screen.getByTestId("messenger-list-list")).getByTestId(row(id)), {});
  });
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
}

/** 학습 키보드로 「안」을 입력 칸에 씁니다(키보드가 닫혀 있으면 먼저 엽니다). */
/** 덕수쌤 방 첫 입장 안내를 끝까지 넘깁니다 — 키보드 단계(ADR-0190)가 입력 줄 키보드를 쥐고 있는 동안은 글을 칠 수 없습니다. */
function finishGuide(): void {
  while (present("messenger-chat-guide-coach")) {
    act(() => {
      fireEvent.tap(screen.getByTestId("messenger-chat-guide-coach-next"), {
        eventType: "catchEvent",
      });
    });
  }
}

function typeAn(): void {
  if (!present("messenger-keyboard-rows")) tapId("messenger-chat-field");
  tapKeys("ㅇ", "ㅏ", "ㄴ");
}

// ------------------------------------------------------------------ 앱 안 방(가짜 출처)

test("CP-I1. 합산 체험을 다 쓴 앱 안 방은 첫 통부터 엽전(ADR-0164 D3) — 머리 「3 coins per message」 · 엽전 보내기 · 지갑 100 → 97 · 낸 값 3 이벤트", async () => {
  await resetMessengerChatSource({ tier: "free", trial: 0 });
  await boot(100);
  openRoom("owner");

  expect(textOf(LINE)).toBe("3 coins per message");
  expect(present(COIN_SEND)).toBe(true);
  expect(present("messenger-chat-out-panel")).toBe(false);
  typeAn();
  tapRound(COIN_SEND);

  expect(screen.getAllByTestId(OUTGOING)).toHaveLength(1);
  expect(named("chat_message_sent")).toEqual([
    expect.objectContaining({ characterId: "owner", paid: true, cost: "3" }),
  ]);
  tapRound("messenger-chat-back");
  expect(textOf("messenger-list-coins")).toContain("97");
});

test("CP-I2. 잔액이 모자라면 보내지 않고 엽전 상점이 서며 글은 입력 칸에 남는다", async () => {
  await resetMessengerChatSource({ tier: "free", trial: 0 });
  await boot(2);
  openRoom("owner");
  typeAn();

  tapRound(COIN_SEND);

  expect(present("coin-shop-screen")).toBe(true);
  expect(present(OUTGOING)).toBe(false);
  expect(named("chat_coins_short")).toHaveLength(1);
});

test("CP-I3. 시험 계정(무제한)은 턴 줄 · 띠 · 판 · 엽전 단추가 없고 열 번 보내도 지갑이 그대로다", async () => {
  await resetMessengerChatSource();
  setTesterAccessActive(true);
  await boot(120);
  openRoom("owner");

  for (let count = 1; count <= 10; count += 1) {
    typeAn();
    tapRound("messenger-chat-send");
    expect(screen.getAllByTestId(OUTGOING)).toHaveLength(count);
  }

  expect(present(LINE)).toBe(false);
  expect(present(COIN_SEND)).toBe(false);
  tapRound("messenger-chat-back");
  expect(textOf("messenger-list-coins")).toContain("120");
});

// ------------------------------------------------------------------ 서버 방

/** 서버 방 대역 — 지갑은 차례로 내주고, 턴은 받은 순서대로 `done`(낸 값 · 잔액)으로 끝낼 수 있습니다. */
function serverRemote(wallets: RemoteWallet[]) {
  const turns: RemoteTurnHandlers[] = [];
  const queue = [...wallets];
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: `${A1}#0`, at: 1, kind: "text", from: "them", text: { ko: "안녕", en: "Hi" } },
      ],
      corrections: {},
      ideas: null,
    }),
    greet: async () => null,
    openTurn: (_request, handlers) => {
      turns.push(handlers);
      return { cancel: () => undefined };
    },
    wallet: async () => (queue.length > 1 ? (queue.shift() ?? null) : (queue[0] ?? null)),
  };
  const finish = (creditsSpent: number, balance: number) =>
    act(() => {
      const handlers = turns.at(-1);
      if (handlers === undefined) throw new Error("no turn");
      handlers.onOpen(200);
      handlers.onEvent("start", JSON.stringify({ userMessageId: U1, assistantMessageId: A1 }));
      handlers.onEvent("delta", JSON.stringify({ segment: 0, kind: "speech", text: "네" }));
      handlers.onEvent("done", JSON.stringify({ assistantMessageId: A1, creditsSpent, balance }));
      handlers.onEnd("complete", null);
    });
  return { remote, turns, finish };
}

async function bootServer(remote: ChatRemote, coins: number): Promise<void> {
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore(["mina"]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => remote);
  await boot(coins);
  // 생년은 이미 답한 것으로 — 방을 열 때 생년 시트가 턴 흐름을 가리지 않게.
  messengerChatSource((path) => path).setBirthYear(2000);
  await flush();
}

test("CP-I4. 서버 방의 체험 인물: 서버 지갑의 체험 수(2)를 보이고, 보내면 하나 줄며 턴 뒤 서버 값으로 맞춘다", async () => {
  const server = serverRemote([
    { balance: 40, trialRemaining: 2 },
    { balance: 40, trialRemaining: 1 },
  ]);
  await bootServer(server.remote, 40);
  openRoom("duksu");
  await flush();
  finishGuide();

  expect(textOf(LINE)).toBe("2 of 20 free messages left");
  typeAn();
  tapRound("messenger-chat-send");
  expect(textOf(LINE)).toBe("Last free message");
  server.finish(0, 40);
  await flush();

  expect(textOf(LINE)).toBe("Last free message");
  expect(present("messenger-chat-turn-strip")).toBe(true);
});

test("CP-I5. 서버 방에서 합산 체험을 다 쓰면: 엽전 보내기는 앱 지갑에서 빼지 않고, 턴 done 잔액(37)이 머리 칩으로 간다", async () => {
  const server = serverRemote([{ balance: 40, trialRemaining: 0 }]);
  await bootServer(server.remote, 40);
  openRoom("mina");
  await flush();

  expect(textOf(LINE)).toBe("3 coins per message");
  typeAn();
  tapRound(COIN_SEND);
  expect(server.turns).toHaveLength(1);
  tapRound("messenger-chat-back");
  // 서버가 답하기 전 — 앱 지갑은 그대로(서버 지갑 40)입니다.
  expect(textOf("messenger-list-coins")).toContain("40");

  server.finish(3, 37);
  await flush();

  expect(textOf("messenger-list-coins")).toContain("37");
});
