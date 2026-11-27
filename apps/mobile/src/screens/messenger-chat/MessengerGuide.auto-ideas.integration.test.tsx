import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatMediaRemote, MediaRequestResult, SampleOffer } from "./chat-media.contract";
import type { ChatRemote, RemoteGreeting, RemoteHistory } from "./chat-remote.contract";
import { clearBackHandlers, mountChat, slotContent } from "./chat-ui.test-support";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { resetSampleOfferMemoryForTests } from "./use-room-guide";

// `integration` 계층(GA-I1 ~ I2, ADR-0137 · 0190 개정 2026-11-28): 덕수쌤 방 첫 입장 — 서버 흉내(첫 인사 + 답장 보기, 예시 제안
// 묻기)와 화면을 함께 묶는다. 첫 인사가 온 뒤 예시 제안 답을 기다리는 사이(안내가 아직 서지 않은 때)에도 보기 판이 열리지 않고,
// 키보드 단계 두 화면을 지나 안내가 끝나야 열린다.

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

const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 6; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

function memoryStore(seen: readonly GuidePart[]): GuideStore {
  const parts = new Set<GuidePart>(seen);
  return { unseen: (part) => !parts.has(part), markSeen: (part) => void parts.add(part) };
}

/** 첫 입장 서버 흉내 — 첫 인사 · 예시 제안 답을 테스트가 정한 때에 돌려줍니다. */
function firstEntry() {
  let greet: (greeting: RemoteGreeting | null) => void = () => undefined;
  let offer: (answer: SampleOffer) => void = () => undefined;
  const media: ChatMediaRemote = {
    request: async (): Promise<MediaRequestResult> => ({ kind: "failed" }),
    load: async () => [],
    sign: async (path) => `https://signed/${path}`,
    balance: async () => 100,
    sample: {
      offer: () =>
        new Promise<SampleOffer>((resolve) => {
          offer = resolve;
        }),
      claim: async (): Promise<MediaRequestResult> => ({ kind: "failed" }),
    },
  };
  const remote: ChatRemote = {
    loadHistory: async () => EMPTY,
    greet: () =>
      new Promise((resolve) => {
        greet = resolve;
      }),
    openTurn: () => ({ cancel: () => undefined }),
    media,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  return {
    source,
    greet: (greeting: RemoteGreeting) => greet(greeting),
    offer: (answer: SampleOffer) => offer(answer),
  };
}

const coach = () => screen.queryByTestId(ids.guideCoach);
const panelOpen = () => screen.queryByTestId(ids.ideasPanel) !== null;
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

describe("덕수쌤 방 첫 입장 — 첫 인사 + 답장 보기", () => {
  test("GA-I1 예시 제안 답을 기다리는 사이에도 판은 닫혀 있고, 키보드 단계 phone → hangul을 지나 안내가 끝나면 판이 열린다", async () => {
    const env = firstEntry();
    mountChat({ source: env.source, roomId: "duksu", guideStore: memoryStore([]) });
    await settle();
    act(() => env.greet(GREETING));
    await settle();
    // 첫 인사는 섰고 안내는 예시 제안 답을 기다린다 — 이 사이에 판이 먼저 열리지 않는다.
    expect(coach() !== null).toBe(false);
    expect(panelOpen()).toBe(false);
    act(() => env.offer({ snapshot: false, voice: false }));
    await settle();
    expect(coach()?.getAttribute("data-stage")).toBe("phone");
    expect(panelOpen()).toBe(false);
    next();
    expect(coach()?.getAttribute("data-stage")).toBe("hangul");
    expect(slotContent()).toBe("learning-keyboard");
    next();
    expect(coach()?.getAttribute("data-step")).toBe("ideas");
    expect(panelOpen()).toBe(false);
    next();
    await settle();
    expect(coach() !== null).toBe(false);
    expect(screen.getByTestId(ids.ideasPanel).textContent).toContain("안녕하세요");
  });

  test("GA-I2 안내를 이미 본 사람 — 첫 인사 + 보기와 함께 판이 바로 열린다", async () => {
    const env = firstEntry();
    mountChat({
      source: env.source,
      roomId: "duksu",
      guideStore: memoryStore(["list", "room", "keyboard", "snapshot", "voice"]),
    });
    await settle();
    act(() => env.greet(GREETING));
    await settle();
    expect(coach() !== null).toBe(false);
    expect(screen.getByTestId(ids.ideasPanel).textContent).toContain("안녕하세요");
  });
});
