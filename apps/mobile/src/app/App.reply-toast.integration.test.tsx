import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import type { ChatSource } from "../screens/messenger-chat/chat-source.contract";
import { App } from "./App";
import { replyToastTestIds as ids, REPLY_TOAST_MS } from "./reply-toast.contract";
import {
  advance,
  appChatSource,
  openTab,
  present,
  renderTesterApp,
  resetMessengerChatSource,
  tapId,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { contentSyncEventName } from "./use-episode-content-refresh";

// `integration` 계층(RT-I1 ~ I6): 답장 도착 토스트(ADR-0200) — 실제 App 트리에서 대화 출처(앱 안 가짜 출처의 답) → 결선 → 카드 →
// 누름 → 메신저 탭의 그 방. 대역은 경계뿐(출처 씨앗 · 시계). 기본 씨앗: 미나(해금된 설치).

let events: EpisodeIntroEvent[] = [];
const named = (name: string) =>
  events.filter((event) => event.name === name) as unknown as Record<string, unknown>[];

beforeEach(async () => {
  await resetMessengerChatSource({ unlocked: ["mina"] });
  events = [];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function boot(): Promise<ChatSource> {
  await renderTesterApp(
    <App progressSeed={legacyPassedSeed} episodeIntroEventSink={(event) => events.push(event)} />,
    { keepFakeTimers: true },
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  const source = await appChatSource();
  if (source === null) throw new Error("출처 없음");
  return source;
}

const minaRoom = (source: ChatSource): string => {
  const room = source.snapshot().rooms.find((each) => each.counterpart.id === "mina");
  if (room === undefined) throw new Error("미나 방 없음");
  return room.roomId;
};

/** 방을 열지 않고 보냄(스토리 보기 답장과 같은 길) → 가짜 출처의 답이 설 때까지. */
function sendAndWait(source: ChatSource): void {
  act(() => {
    source.sendText(minaRoom(source), "안녕");
  });
  advance(10_000);
}

test("RT-I1 다른 탭(여정)에서 답이 오면 카드가 서고 4초 뒤 사라진다 — shown 이벤트 kind reply", async () => {
  vi.useFakeTimers();
  const source = await boot();
  expect(present("journey-map-screen")).toBe(true);
  sendAndWait(source);

  expect(present(ids.card)).toBe(true);
  expect(textOf(ids.open)).toContain("미나");
  expect(named("chat_reply_toast_shown")).toEqual([
    expect.objectContaining({
      characterId: "mina",
      kind: "reply",
      more: "0",
      deferred: "false",
      screen: "journey-map",
    }),
  ]);
  advance(REPLY_TOAST_MS + 500);
  expect(present(ids.card)).toBe(false);
});

test("RT-I2 카드를 누르면 메신저 탭의 그 방이 열리고 opened 이벤트, 방에서는 다음 답이 카드를 띄우지 않는다", async () => {
  vi.useFakeTimers();
  const source = await boot();
  sendAndWait(source);
  fireEvent.tap(screen.getByTestId(ids.open), {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(present("messenger-chat-screen")).toBe(true);
  expect(textOf("messenger-chat-header")).toContain("미나");
  expect(present(ids.card)).toBe(false);
  expect(named("chat_reply_toast_opened")).toEqual([
    expect.objectContaining({ characterId: "mina", kind: "reply" }),
  ]);
  sendAndWait(source);
  expect(present(ids.card)).toBe(false);
});

test("RT-I3 채팅 목록에서는 띄우지 않는다", async () => {
  vi.useFakeTimers();
  const source = await boot();
  openTab("messenger");
  expect(present("messenger-list-screen")).toBe(true);
  sendAndWait(source);
  expect(present(ids.card)).toBe(false);
  expect(named("chat_reply_toast_shown")).toEqual([]);
});

test("RT-I4 닫기 단추는 방으로 가지 않고 카드만 닫는다", async () => {
  vi.useFakeTimers();
  const source = await boot();
  sendAndWait(source);
  tapId(ids.close);
  expect(present(ids.card)).toBe(false);
  expect(present("journey-map-screen")).toBe(true);
  expect(named("chat_reply_toast_opened")).toEqual([]);
});

test("RT-I5 앱이 앞으로 막 돌아온 3초 안의 도착은 띄우지 않는다(뒤에 있는 동안 온 것)", async () => {
  vi.useFakeTimers();
  const source = await boot();
  act(() => {
    source.sendText(minaRoom(source), "안녕");
  });
  advance(1_000);
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(contentSyncEventName, []);
  });
  advance(9_000);
  expect(present(ids.card)).toBe(false);
});

test("RT-I6 두 인물의 답은 카드 두 장으로 쌓이고(새 것이 위, shown의 stack 1 → 2), 아래 카드를 누르면 그 방이 열리고 모두 닫힌다", async () => {
  vi.useFakeTimers();
  const source = await boot();
  const owner = source.snapshot().rooms.find((each) => each.counterpart.id === "owner");
  if (owner === undefined || owner.access.kind !== "open") throw new Error("사장님 방 없음");
  act(() => {
    source.sendText(minaRoom(source), "안녕");
  });
  advance(1_000);
  act(() => {
    source.sendText(owner.roomId, "안녕하세요");
  });
  advance(9_000);

  const cards = screen.getAllByTestId(ids.open);
  expect(cards).toHaveLength(2);
  expect(cards[0]?.textContent).toContain("사장님");
  expect(cards[1]?.textContent).toContain("미나");
  expect(named("chat_reply_toast_shown").map((event) => event["stack"])).toEqual(["1", "2"]);

  if (cards[1] === undefined) throw new Error("카드 없음");
  fireEvent.tap(cards[1], {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(textOf("messenger-chat-header")).toContain("미나");
  expect(present(ids.card)).toBe(false);
});
