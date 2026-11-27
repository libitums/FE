import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatMediaRemote, MediaRequestResult, RemoteMedia } from "./chat-media.contract";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatSource, ChatThread } from "./chat-source.contract";
import { clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { resetSampleOfferMemoryForTests } from "./use-room-guide";

// `ui` 계층(GA-UI1 ~ UI3, 메신저 가이드 점검 1 · 2): 예시 단계에서 입력이 막히면(나이 · 일시 차단 · 이용 시간) 안내가 숨고 뒤로가기가
// 방을 나간다. 서버가 예시를 주지 않기로 하면(거절) 본 것으로 적어, 방에 올 때마다 같은 단계 · 회색 줄이 다시 서지 않는다.

const A1 = "22222222-2222-4222-8222-222222222222";
const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 6; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
const flush = async () => {
  for (let round = 0; round < 4; round += 1) await settle();
};

function memoryStore(seen: readonly GuidePart[]) {
  const parts = new Set<GuidePart>(seen);
  const store: GuideStore = {
    unseen: (part) => !parts.has(part),
    markSeen: (part) => void parts.add(part),
  };
  return { store, seen: () => [...parts] };
}

const sampleMedia: RemoteMedia = {
  id: "33333333-3333-4333-8333-333333333333",
  messageId: A1,
  kind: "snapshot",
  status: "complete",
  path: "samples/duksu-guide-01.png",
  aspect: "3:2",
  failure: null,
  createdAt: 1,
  stage: null,
};

/** 서버 흉내 — 첫 인사 하나, 예시 제안, 받기 결과. `blocked()`로 입력 막힘을 켜고 끕니다(서버가 보내기를 막은 것과 같은 방 상태). */
function serverRoom(result?: MediaRequestResult, voiceOffered = false) {
  const timers = fakeTimers();
  const claim = vi.fn(
    async (): Promise<MediaRequestResult> =>
      result ?? { kind: "accepted", media: sampleMedia, cached: false },
  );
  const offer = vi.fn(async () => ({ snapshot: true, voice: voiceOffered }));
  const media: ChatMediaRemote = {
    request: vi.fn(async (): Promise<MediaRequestResult> => ({ kind: "failed" })),
    load: async () => [],
    sign: async (path) => `https://signed/${path}`,
    balance: async () => 100,
    sample: { offer, claim },
  };
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        {
          id: `${A1}#0`,
          at: 1,
          kind: "text",
          from: "them",
          text: { ko: "안녕하세요!", en: "Hi!" },
        },
      ],
      corrections: {},
      ideas: null,
      greetingId: A1,
    }),
    greet: () => new Promise(() => undefined),
    openTurn: () => ({ cancel: () => undefined }),
    media,
  };
  const inner = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers,
    remote,
  });
  let block = false;
  const listeners = new Set<() => void>();
  let cached: { base: ChatThread | null; out: ChatThread | null; block: boolean } | null = null;
  const source: ChatSource = {
    ...inner,
    thread: (roomId) => {
      const base = inner.thread(roomId);
      if (cached === null || cached.base !== base || cached.block !== block) {
        const out =
          base === null || !block
            ? base
            : {
                ...base,
                inputBlock: { kind: "temporarily-blocked" as const, until: Date.now() + 1_800_000 },
              };
        cached = { base, out, block };
      }
      return cached.out;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      const off = inner.subscribe(listener);
      return () => {
        listeners.delete(listener);
        off();
      };
    },
  };
  const blocked = (on: boolean) =>
    act(() => {
      block = on;
      for (const listener of listeners) listener();
    });
  return { source, claim, offer, timers, blocked };
}

const coach = () => screen.queryByTestId(ids.guideCoach);
// 안내가 없으면 null — 요소를 그대로 비교하면 실패 메시지를 만들다 던집니다.
const step = () => coach()?.getAttribute("data-step") ?? null;

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  resetSampleOfferMemoryForTests();
});

describe("예시 단계에서 입력이 막힘(점검 1)", () => {
  test("GA-UI1 막히면 안내가 숨고, 뒤로가기는 방을 나간다", async () => {
    const env = serverRoom();
    const { onExit } = mountChat({
      source: env.source,
      roomId: "duksu",
      guideStore: memoryStore(["list", "room", "keyboard"]).store,
    });
    await flush();
    expect(coach()?.getAttribute("data-step")).toBe("sample");
    env.blocked(true);
    expect(screen.getByTestId(ids.blocked)).toBeTruthy();
    // 사진 알약이 사라졌는데 「Snapshot을 누르세요」 막이 남아 있으면 갇힌다.
    expect(step()).toBeNull();
    expect(document.querySelector(".messenger-guide-target-sample") === null).toBe(true);
    act(() => {
      backHandlers.runTop();
    });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("GA-UI2 막힘이 풀리면 같은 예시 단계로 돌아온다 — 본 것으로 적지 않았다", async () => {
    const env = serverRoom();
    const { store, seen } = memoryStore(["list", "room", "keyboard"]);
    mountChat({ source: env.source, roomId: "duksu", guideStore: store });
    await flush();
    env.blocked(true);
    expect(step()).toBeNull();
    env.blocked(false);
    expect(coach()?.getAttribute("data-step")).toBe("sample");
    expect(seen()).not.toContain("snapshot");
  });
});

describe("서버가 예시를 주지 않기로 함(점검 2)", () => {
  test("GA-UI3 거절(not_eligible)도 본 것으로 적는다 — 다시 들어와도 예시 단계가 서지 않고 받기를 다시 부르지 않는다", async () => {
    // 재현(PROBE-2): 거절은 「봤음」으로 적히지 않아 방에 들어올 때마다 같은 단계가 다시 떴다.
    const env = serverRoom({ kind: "refused", notice: "not-eligible", until: null }, true);
    const { store, seen } = memoryStore(["list", "room", "keyboard"]);
    mountChat({ source: env.source, roomId: "duksu", guideStore: store });
    await flush();
    fireEvent.tap(screen.getByTestId(ids.snapshot), {});
    await flush();
    act(() => env.timers.advance(1500));
    await flush();
    expect(coach()?.getAttribute("data-step")).toBe("voice");
    fireEvent.tap(screen.getByTestId(ids.snapVoice), {});
    await flush();
    act(() => env.timers.advance(1500));
    await flush();
    expect(seen().sort()).toEqual(["keyboard", "list", "room", "snapshot", "voice"]);
    cleanup();
    mountChat({ source: env.source, roomId: "duksu", guideStore: store });
    await flush();
    expect(step()).toBeNull();
    expect(env.claim).toHaveBeenCalledTimes(2);
  });
});
