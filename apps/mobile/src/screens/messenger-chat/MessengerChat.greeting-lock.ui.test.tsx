import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteGreeting, RemoteHistory } from "./chat-remote.contract";
import { clearBackHandlers, mountChat, tapKeys } from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { GREETING_LOCK_MAX_MS } from "./greeting-lock";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { resetSampleOfferMemoryForTests } from "./use-room-guide";

// `ui` 계층(GL-UI1 ~ UI4, ADR-0139 개정 2026-11-27): 안내를 안 본 사람이 덕수쌤 방에 들어와 첫 인사를 기다리는 동안 입력 줄은
// 보이되 잠긴다 — 보내기 · 전구가 꺼지고, 입력 칸은 키보드를 열지 않고 「덕수쌤 is saying hi…」를 보이고 읽는다. 인사가 서면 풀린다.

const EMPTY: RemoteHistory = { messages: [], corrections: {}, ideas: null };
const GREETING: RemoteGreeting = {
  messages: [{ id: "g#0", at: 1, kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" } }],
  ideas: [{ ko: "안녕하세요", roman: "annyeonghaseyo", en: "Hello" }],
};
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });

function memoryStore(seen: readonly GuidePart[]): GuideStore {
  const parts = new Set<GuidePart>(seen);
  return { unseen: (part) => !parts.has(part), markSeen: (part) => void parts.add(part) };
}

function serverRoom() {
  let greet: (greeting: RemoteGreeting | null) => void = () => undefined;
  const openTurn = vi.fn(() => ({ cancel: () => undefined }));
  const remote: ChatRemote = {
    loadHistory: async () => EMPTY,
    greet: () =>
      new Promise((resolve) => {
        greet = resolve;
      }),
    openTurn,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  return { source, openTurn, greet: (greeting: RemoteGreeting | null) => greet(greeting) };
}

const attr = (id: string, name: string) => screen.getByTestId(id).getAttribute(name);

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  cleanup();
  clearBackHandlers();
  resetSampleOfferMemoryForTests();
  vi.useRealTimers();
});

describe("첫 인사 잠금 — 입력 줄", () => {
  test("GL-UI1 첫 인사를 기다리는 동안 보내기 · 전구가 꺼지고 입력 칸은 키보드를 열지 않으며 잠긴 까닭을 읽는다", async () => {
    const env = serverRoom();
    mountChat({ source: env.source, roomId: "duksu", guideStore: memoryStore([]) });
    await flush();
    expect(screen.getByTestId(ids.typing)).toBeTruthy();
    expect(attr(ids.field, "data-locked")).toBe("true");
    expect(attr(ids.send, "data-enabled")).toBe("false");
    expect(attr(ids.ideasButton, "data-disabled")).toBe("true");
    expect(attr(ids.display, "accessibility-label")).toBe("덕수쌤 is saying hi…");
    expect(screen.getByTestId(ids.display).textContent).toContain("덕수쌤 is saying hi…");
    // Android는 꺼진 칸도 누르면 초점을 받았다(기기 확인) — 입력 자체가 꺼져 있다.
    expect(attr(ids.input, "disabled")).toBe("true");
    act(() => {
      fireEvent.tap(screen.getByTestId(ids.field), {});
    });
    expect(attr(ids.slot, "data-content")).not.toBe("learning-keyboard");
    expect(env.openTurn).not.toHaveBeenCalled();
  });

  test("GL-UI2 첫 인사가 서면 풀린다 — 입력 칸 · 전구가 다시 켜진다", async () => {
    const env = serverRoom();
    mountChat({ source: env.source, roomId: "duksu", guideStore: memoryStore([]) });
    await flush();
    act(() => env.greet(GREETING));
    await flush();
    expect(attr(ids.field, "data-locked")).toBe("false");
    expect(attr(ids.input, "disabled")).not.toBe("true");
    expect(attr(ids.ideasButton, "data-disabled")).toBe("false");
    expect(attr(ids.display, "accessibility-label")).not.toBe("덕수쌤 is saying hi…");
  });

  test("GL-UI3 안내를 본 사람 · 다른 방은 첫 인사를 기다려도 잠그지 않는다", async () => {
    const env = serverRoom();
    mountChat({
      source: env.source,
      roomId: "duksu",
      guideStore: memoryStore(["list", "room", "keyboard", "snapshot", "voice"]),
    });
    await flush();
    expect(screen.getByTestId(ids.typing)).toBeTruthy();
    expect(attr(ids.field, "data-locked")).toBe("false");
    act(() => {
      fireEvent.tap(screen.getByTestId(ids.field), {});
    });
    tapKeys("ㅇ", "ㅏ", "ㄴ");
    expect(attr(ids.send, "data-enabled")).toBe("true");
  });

  test("GL-UI4 첫 인사가 상한 시간 안에 오지 않으면 풀린다 — 방에 갇히지 않는다", async () => {
    vi.useFakeTimers();
    const env = serverRoom();
    mountChat({ source: env.source, roomId: "duksu", guideStore: memoryStore([]) });
    await flush();
    act(() => {
      fireEvent.tap(screen.getByTestId(ids.field), {}); // 잠긴 동안 누른 것은 아무 일도 없다
    });
    act(() => {
      vi.advanceTimersByTime(GREETING_LOCK_MAX_MS - 1);
    });
    expect(attr(ids.field, "data-locked")).toBe("true");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(attr(ids.field, "data-locked")).toBe("false");
  });
});
