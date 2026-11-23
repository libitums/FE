import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatMediaRemote, MediaRequestResult, RemoteMedia } from "./chat-media.contract";
import type { ChatRemote } from "./chat-remote.contract";
import { clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";

// `ui` 계층(MG-UI10 ~ UI13): 예시 스냅샷 안내(ADR-0146 추가, 시안 「스냅샷 안내」 2026-11-23) — 방 코치마크가 사진 알약을 가리키고,
// 그 알약을 누르면 결제 확인 없이 예시 사진을 받는다. 안내를 이미 본 사람에게는 그 단계만 「New」로 한 번.

const A1 = "22222222-2222-4222-8222-222222222222";
// 기록 읽기 → 첫 인사 → (효과) 예시 제안 묻기 → 다시 그리기 — 효과는 act가 끝날 때 돌아서, 박자를 나눠 여러 번 비웁니다.
const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 6; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
const flush = async () => {
  for (let round = 0; round < 4; round += 1) await settle();
};

function memoryStore(seen: readonly GuidePart[] = []) {
  const parts = new Set<GuidePart>(seen);
  const store: GuideStore = {
    unseen: (part) => !parts.has(part),
    markSeen: (part) => {
      parts.add(part);
    },
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

function serverSource(offered: boolean) {
  const claim = vi.fn(async (): Promise<MediaRequestResult> => ({
    kind: "accepted",
    media: sampleMedia,
    cached: false,
  }));
  const media: ChatMediaRemote = {
    request: vi.fn(async (): Promise<MediaRequestResult> => ({ kind: "failed" })),
    load: async () => [],
    sign: async (path) => `https://signed/${path}`,
    balance: async () => 100,
    sample: { offer: vi.fn(async () => offered), claim },
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
    }),
    greet: () => new Promise(() => undefined),
    openTurn: () => ({ cancel: () => undefined }),
    media,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  return { source, claim, media };
}

const coach = () => screen.queryByTestId(ids.guideCoach);
const pill = () => screen.getByTestId(ids.snapshot);

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("안내를 이미 본 사용자", () => {
  test("MG-UI10 서버가 예시를 제안하면 사진 단계만 「New」로 뜨고, 사진 알약에 고리 · FREE가 선다", async () => {
    const { source } = serverSource(true);
    mountChat({ source, roomId: "duksu", guideStore: memoryStore(["list", "room"]).store });
    await flush();
    expect(coach()?.getAttribute("data-step")).toBe("sample");
    expect(coach()?.textContent).toContain("This first one is on me.");
    expect(coach()?.textContent).toContain("New");
    expect(coach()?.textContent).not.toContain("1 of 1");
    expect(document.querySelector(".messenger-guide-target-sample")).not.toBeNull();
    expect(pill().textContent).toContain("FREE");
    expect(pill().textContent).not.toContain("35");
    expect(pill().getAttribute("accessibility-label")).toBe("Snapshot, FREE");
    // 이 단계에는 「다음」이 없다 — 알약을 누르거나 Skip.
    expect(screen.queryByTestId(ids.guideCoachNext)).toBeNull();
  });

  test("MG-UI11 알약을 누르면 결제 확인 없이 예시를 받고 안내가 끝난다 — 다시 뜨지 않는다", async () => {
    const { source, claim } = serverSource(true);
    const { store, seen } = memoryStore(["list", "room"]);
    mountChat({ source, roomId: "duksu", guideStore: store });
    await flush();
    fireEvent.tap(pill(), {});
    await flush();
    expect(claim).toHaveBeenCalledWith(A1);
    expect(coach()).toBeNull();
    expect(screen.queryByTestId(ids.askDialog)).toBeNull();
    expect(seen()).toContain("snapshot");
    // 대기 말풍선이 바로 선다.
    expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
    // 알약은 원래 가격으로.
    expect(pill().textContent).toContain("35");
  });

  test("MG-UI12 Skip은 받지 않고 끝낸다. 제안이 없으면 안내가 서지 않고 알약은 보통 가격", async () => {
    const offered = serverSource(true);
    const first = memoryStore(["list", "room"]);
    mountChat({ source: offered.source, roomId: "duksu", guideStore: first.store });
    await flush();
    fireEvent.tap(screen.getByTestId(ids.guideCoachSkip), { eventType: "catchEvent" });
    expect(coach()).toBeNull();
    expect(offered.claim).not.toHaveBeenCalled();
    expect(first.seen()).toContain("snapshot");
    expect(pill().textContent).toContain("35");
    cleanup();

    const none = serverSource(false);
    mountChat({
      source: none.source,
      roomId: "duksu",
      guideStore: memoryStore(["list", "room"]).store,
    });
    await flush();
    expect(coach()).toBeNull();
    expect(pill().textContent).toContain("35");
  });
});

describe("처음 온 사용자", () => {
  test("MG-UI13 chat → ideas 뒤에 예시 단계가 「3 of 3」으로 이어지고, 받으면 방 · 목록 · 예시 안내를 모두 본 것으로 적는다", async () => {
    const { source, claim } = serverSource(true);
    const { store, seen } = memoryStore();
    mountChat({ source, roomId: "duksu", guideStore: store });
    await flush();
    expect(coach()?.textContent).toContain("1 of 3");
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
    expect(coach()?.getAttribute("data-step")).toBe("sample");
    expect(coach()?.textContent).toContain("3 of 3");
    fireEvent.tap(pill(), {});
    await flush();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(coach()).toBeNull();
    expect(seen().sort()).toEqual(["list", "room", "snapshot"]);
  });
});
