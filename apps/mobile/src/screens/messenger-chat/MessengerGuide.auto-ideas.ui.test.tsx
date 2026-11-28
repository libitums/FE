import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote, RemoteGreeting, RemoteHistory } from "./chat-remote.contract";
import { clearBackHandlers, mountChat, slotContent } from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { resetSampleOfferMemoryForTests } from "./use-room-guide";

// `ui` 계층(GA-UI1 ~ UI3, ADR-0137 · 0190 개정 2026-11-28): 덕수쌤 첫 인사가 답장 보기와 함께 와도 방 안내가 서 있는 동안은 보기 판이
// 저절로 열리지 않는다 — 키보드 단계(휴대폰 키보드 → Hangul keys)가 제 화면을 그대로 보이고, 안내가 끝나면 그때 판이 열린다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

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

/** 첫 인사를 서버가 보내는 방 — `greet`로 첫 인사(+ 보기)를 도착시킵니다. */
async function greetedRoom(seen: readonly GuidePart[] = []) {
  let resolve: (greeting: RemoteGreeting | null) => void = () => undefined;
  const remote: ChatRemote = {
    loadHistory: async () => EMPTY,
    greet: () =>
      new Promise((done) => {
        resolve = done;
      }),
    openTurn: () => ({ cancel: () => undefined }),
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  mountChat({ source, roomId: "duksu", guideStore: memoryStore(seen) });
  await flush();
  act(() => resolve(GREETING));
  await flush();
}

const coach = () => screen.queryByTestId(ids.guideCoach);
const panel = () => screen.queryByTestId(ids.ideasPanel);
const next = () =>
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
  });

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  cleanup();
  clearBackHandlers();
  resetSampleOfferMemoryForTests();
});

describe("안내 중 도착한 답장 보기", () => {
  test("GA-UI1 첫 인사 + 보기가 와도 키보드 단계(phone) 동안 판은 닫혀 있고 입력 줄은 휴대폰 키보드다", async () => {
    await greetedRoom();
    expect(coach()?.getAttribute("data-step")).toBe("keyboard");
    expect(coach()?.getAttribute("data-stage")).toBe("phone");
    expect(panel() !== null).toBe(false);
    expect(screen.getByTestId(ids.field).getAttribute("data-keyboard")).toBe("phone");
    expect(slotContent()).not.toBe("ideas");
  });

  test("GA-UI2 Next → Hangul keys 화면에 학습 키보드가 선다(보기 판이 아님) → 전구 단계에도 판은 닫혀 있다 → Done 뒤에 판이 열린다", async () => {
    await greetedRoom();
    next();
    expect(coach()?.getAttribute("data-stage")).toBe("hangul");
    expect(slotContent()).toBe("learning-keyboard");
    expect(panel() !== null).toBe(false);
    next();
    expect(coach()?.getAttribute("data-step")).toBe("ideas");
    expect(panel() !== null).toBe(false);
    next();
    await flush();
    expect(coach() !== null).toBe(false);
    expect(panel()?.textContent).toContain("안녕하세요");
  });

  test("GA-UI3 안내를 이미 본 방은 지금처럼 첫 인사 + 보기와 함께 판이 바로 열린다", async () => {
    await greetedRoom(["list", "room", "keyboard", "snapshot", "voice"]);
    expect(coach() !== null).toBe(false);
    expect(panel()?.textContent).toContain("안녕하세요");
  });
});
