import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { removeItem } from "../lib/storage";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type {
  ChatRemote,
  RemoteGreeting,
  RemoteHistory,
} from "../screens/messenger-chat/chat-remote.contract";
import {
  messengerGuideSeenStorageKey,
  messengerKeyboardGuideSeenStorageKey,
} from "../screens/messenger-chat/messenger-guide";
import { App } from "./App";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { openTab, present, renderTesterApp } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(GL-I1 · I2, ADR-0139 개정 2026-11-27): 실제 App — 목록에서 덕수쌤 방에 처음 들어온 직후(기록을 읽는 중 ·
// 첫 인사를 받는 중) 입력을 시도해도 막히고 서버 턴이 열리지 않는다. 첫 인사가 서면 안내가 키보드 단계부터 순서대로 서고, 첫 인사가
// 로그 맨 앞이다. 대역은 경계뿐 — `ChatRemote` 포트(기록 · 첫 인사를 테스트가 늦게 흘린다).

const KEYS = [
  `${messengerGuideSeenStorageKey}.tester-1`,
  `${messengerKeyboardGuideSeenStorageKey}.tester-1`,
];
const COACH = "messenger-chat-guide-coach";
const GREETING: RemoteGreeting = {
  messages: [{ id: "g#0", at: 1, kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" } }],
  ideas: [{ ko: "안녕하세요", roman: "annyeonghaseyo", en: "Hello" }],
};
const EMPTY: RemoteHistory = { messages: [], corrections: {}, ideas: null };

const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

let history: (value: RemoteHistory) => void = () => undefined;
let greeting: (value: RemoteGreeting | null) => void = () => undefined;
const greet = vi.fn<ChatRemote["greet"]>();
const openTurn = vi.fn<ChatRemote["openTurn"]>();

function remote(): ChatRemote {
  return {
    loadHistory: () =>
      new Promise<RemoteHistory>((resolve) => {
        history = resolve;
      }),
    greet,
    openTurn,
  };
}

const attr = (id: string, name: string) => screen.getByTestId(id).getAttribute(name);

/** 입력을 시도합니다 — 입력 칸을 누르고 보내기를 누릅니다. */
function tryToType(): void {
  act(() => {
    fireEvent.tap(screen.getByTestId("messenger-chat-field"), {});
  });
  act(() => {
    fireEvent.tap(screen.getByTestId("messenger-chat-send"), {});
  });
}

beforeEach(async () => {
  for (const key of KEYS) removeItem(key);
  greet.mockReset();
  greet.mockImplementation(
    () =>
      new Promise<RemoteGreeting | null>((resolve) => {
        greeting = resolve;
      }),
  );
  openTurn.mockReset();
  openTurn.mockImplementation(() => ({ cancel: () => undefined }));
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore([]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => remote());
  await renderTesterApp(<App progressSeed={legacyPassedSeedWithCoins(40)} />);
  openTab("messenger");
  messengerChatSource((path) => path).setBirthYear(2000);
  await flush();
});

afterEach(() => {
  cleanup();
  setMessengerChatRemote(null);
  resetMessengerChatSourceForTests();
  for (const key of KEYS) removeItem(key);
});

async function openDuksu(): Promise<void> {
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-duksu"),
      {},
    );
  });
  await flush();
}

test("GL-I1. 목록 → 덕수쌤 방 직후 입력은 막히고(기록 읽는 중 · 첫 인사 받는 중), 첫 인사가 서면 안내가 순서대로 선다", async () => {
  await openDuksu();
  // 기록을 읽는 중 — 예전에는 여기서 보낸 글이 첫 인사를 건너뛰게 했다(운영 6건).
  tryToType();
  expect(attr("messenger-chat-slot", "data-content")).toBe("closed");
  expect(attr("messenger-chat-send", "data-enabled")).toBe("false");
  expect(attr("messenger-chat-field", "data-locked")).toBe("true");

  act(() => history(EMPTY));
  await flush();
  expect(greet).toHaveBeenCalledTimes(1);
  expect(present("messenger-chat-typing")).toBe(true);
  expect(attr("messenger-chat-field", "data-locked")).toBe("true");
  tryToType();
  expect(attr("messenger-chat-slot", "data-content")).toBe("closed");
  expect(present(COACH)).toBe(false);

  act(() => greeting(GREETING));
  await flush();
  expect(openTurn).not.toHaveBeenCalled();
  expect(attr("messenger-chat-field", "data-locked")).toBe("false");
  const log = messengerChatSource((path) => path).thread("duksu")?.messages ?? [];
  expect(log.map((message) => message.id)).toEqual(["g#0"]);
  expect(attr(COACH, "data-step")).toBe("keyboard");
});

test("GL-I2. 첫 인사를 못 받으면(실패) 잠금이 풀려 방에 갇히지 않는다", async () => {
  await openDuksu();
  act(() => history(EMPTY));
  await flush();
  act(() => greeting(null));
  await flush();
  expect(attr("messenger-chat-field", "data-locked")).toBe("false");
  expect(present("messenger-chat-history-failed")).toBe(true);
});
