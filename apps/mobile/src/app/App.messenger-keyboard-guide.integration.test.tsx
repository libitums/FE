import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test } from "vitest";

import { getItem, removeItem } from "../lib/storage";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import {
  KEYBOARD_HEIGHT_KEY,
  memoryUnlockStore,
} from "../screens/messenger-chat/chat-local-stores";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
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
import { openTab, present, renderTesterApp, tapRound } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(KG-I1 ~ I3): 덕수쌤 방 안내의 키보드 단계(ADR-0190)가 실제 App 트리에서 기기 저장소 · 키보드 높이 저장 ·
// 이벤트 결선과 맞물린다. 휴대폰 키보드 화면에서 입력 칸이 알린 높이가 기기에 남고, 끝내면 키보드 단계 기록이 기존 안내 기록과
// 다른 키에 남으며, 다시 들어오면 안내가 서지 않는다. 대역은 경계뿐 — `ChatRemote` 포트.

// 안내 기록은 계정별 칸(2026-11-27) — 시험 계정(`tester-1`)의 칸입니다.
const GUIDE_KEY = `${messengerGuideSeenStorageKey}.tester-1`;
const KEYBOARD_GUIDE_KEY = `${messengerKeyboardGuideSeenStorageKey}.tester-1`;
const KEYS = [GUIDE_KEY, KEYBOARD_GUIDE_KEY, KEYBOARD_HEIGHT_KEY];
const COACH = "messenger-chat-guide-coach";
let events: EpisodeIntroEvent[] = [];
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

function remote(): ChatRemote {
  return {
    loadHistory: async () => ({
      messages: [{ id: "a#0", at: 1, kind: "text", from: "them", text: { ko: "안녕", en: "Hi" } }],
      corrections: {},
      ideas: null,
    }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
  };
}

async function openDuksu(): Promise<void> {
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-duksu"),
      {},
    );
  });
  await flush();
}

/** 입력 칸이 키보드 높이를 알립니다(Lynx `keyboardheightchange`, iOS pt). */
function keyboardHeight(height: number): void {
  const input = screen.getByTestId("messenger-chat-input");
  const EventConstructor = input.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="messenger-chat-input"]');
  act(() => {
    fireEvent(
      ref as unknown as Element,
      new EventConstructor("bindEvent:keyboardheightchange", { detail: { height } }),
    );
  });
}

const next = () =>
  act(() => {
    fireEvent.tap(screen.getByTestId("messenger-chat-guide-coach-next"), {
      eventType: "catchEvent",
    });
  });

beforeEach(async () => {
  for (const key of KEYS) removeItem(key);
  events = [];
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({
    unlock: memoryUnlockStore([]),
    now: () => Date.now(),
    tier: "free",
  });
  setMessengerChatRemote(() => remote());
  await renderTesterApp(
    <App
      progressSeed={legacyPassedSeedWithCoins(40)}
      episodeIntroEventSink={(event) => events.push(event)}
    />,
  );
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

test("KG-I1. 휴대폰 키보드 화면에서 잰 높이가 기기에 남고, 끝내면 키보드 기록은 새 키에 · 방 기록은 기존 키에 남는다", async () => {
  await openDuksu();
  const coach = () => screen.getByTestId(COACH);
  expect(coach().getAttribute("data-step")).toBe("keyboard");
  expect(coach().getAttribute("data-stage")).toBe("phone");
  keyboardHeight(336);
  expect(getItem(KEYBOARD_HEIGHT_KEY)).toBe("336");
  next();
  expect(coach().getAttribute("data-stage")).toBe("hangul");
  expect(screen.getByTestId("messenger-chat-slot").getAttribute("data-height")).toBe("336");
  next();
  expect(coach().getAttribute("data-step")).toBe("ideas");
  next();
  expect(present(COACH)).toBe(false);
  expect(getItem(KEYBOARD_GUIDE_KEY)).toBe("1");
  expect(JSON.parse(getItem(GUIDE_KEY) ?? "[]")).toEqual(expect.arrayContaining(["room", "list"]));
  const keyboard = events.flatMap((event) =>
    event.name === "messenger_guide_keyboard" ? [`${event.stage}:${event.action}`] : [],
  );
  expect(keyboard).toEqual(["phone:shown", "phone:next", "hangul:shown", "hangul:next"]);
});

test("KG-I3. 휴대폰 키보드 화면에서 키보드가 내려가면(높이 0) Hangul keys 화면으로 — 기기에는 잰 높이만 남고 자리는 그 높이", async () => {
  await openDuksu();
  const coach = () => screen.getByTestId(COACH);
  // KG-I1의 336과 다른 값 — 기기 높이 저장소는 모듈 캐시라 같은 값을 다시 적지 않습니다.
  keyboardHeight(344);
  keyboardHeight(0);
  expect(coach().getAttribute("data-step")).toBe("keyboard");
  expect(coach().getAttribute("data-stage")).toBe("hangul");
  expect(getItem(KEYBOARD_HEIGHT_KEY)).toBe("344");
  expect(screen.getByTestId("messenger-chat-slot").getAttribute("data-height")).toBe("344");
  expect(screen.getByTestId("messenger-chat-field").getAttribute("data-keyboard")).toBe("learning");
  next();
  expect(coach().getAttribute("data-step")).toBe("ideas");
  const keyboard = events.flatMap((event) =>
    event.name === "messenger_guide_keyboard" ? [`${event.stage}:${event.action}`] : [],
  );
  expect(keyboard).toEqual(["phone:shown", "phone:hidden", "hangul:shown", "hangul:next"]);
});

test("KG-I2. 끝낸 뒤 다시 들어오면 안내가 서지 않고 키보드는 닫힌 채 Hangul keys다", async () => {
  await openDuksu();
  while (present(COACH)) next();
  tapRound("messenger-chat-back");
  await openDuksu();
  expect(present(COACH)).toBe(false);
  expect(screen.getByTestId("messenger-chat-slot").getAttribute("data-content")).toBe("closed");
  expect(screen.getByTestId("messenger-chat-field").getAttribute("data-keyboard")).toBe("learning");
});
