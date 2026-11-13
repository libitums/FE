import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { createCoinWallet } from "./coin-wallet";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatSource } from "./chat-source.contract";
import {
  clearBackHandlers,
  fixtureRoom,
  mountChat,
  seedOf,
  systemBack,
  tapButtonIn,
} from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import {
  messengerChatTestIds as ids,
  messengerListTestIds as list,
} from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(MG-UI2 ~ UI4): 덕수쌤 첫 입장 안내 — 목록 오버레이(덕수쌤 줄만 떠 있음) · 방 코치마크(사용자 결정 2026-11-13, 시안 2판).

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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

function serverSource(
  history: "greeted" | "empty" = "greeted",
  birthYear: "set" | "unasked" = "set",
) {
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages:
        history === "greeted"
          ? [
              {
                id: "g#0",
                at: 1,
                kind: "text",
                from: "them",
                text: { ko: "안녕하세요!", en: "Hi!" },
              },
            ]
          : [],
      corrections: {},
      ideas: null,
    }),
    greet: () => new Promise(() => undefined),
    openTurn: () => ({ cancel: () => undefined }),
  };
  return createFixtureChatSource({
    imageUrlOf: () => null,
    // 생년을 묻지 않은 씨앗은 birthYear 칸이 없습니다(방을 열면 생년 시트가 뜸).
    seed:
      birthYear === "set"
        ? { ...companionSeed(), birthYear: { kind: "set", year: 2000 } }
        : companionSeed(),
    timers: fakeTimers(),
    remote,
  });
}

function mountList(source: ChatSource, store: GuideStore, access: "open" | "sign-in" = "open") {
  const handlers = {
    onOpenRoom: vi.fn<(id: string) => void>(),
    onGoToJourney: vi.fn<() => void>(),
    onLayerChange: vi.fn<(open: boolean) => void>(),
    notice: null,
    onNoticeShown: vi.fn<() => void>(),
    access,
    onSignIn: vi.fn<() => void>(),
  };
  render(
    <MessengerListScreen
      source={source}
      wallet={createCoinWallet({ earned: 0 })}
      guideStore={store}
      {...handlers}
    />,
  );
  return handlers;
}

const rowOrder = (): string[] =>
  Array.from(screen.getByTestId(list.list).querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^messenger-list-row-[^-]+$/.test(id));

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("목록 첫 입장", () => {
  test("MG-UI2 덕수쌤 줄만 떠 있는 오버레이 — 「Chat with 덕수쌤」은 그 방을 열고 다시 안 뜬다", () => {
    const { store, seen } = memoryStore();
    const { onOpenRoom, onLayerChange } = mountList(serverSource(), store);
    const overlay = screen.getByTestId(ids.guideList);
    expect(within(overlay).getByTestId(list.row("duksu"))).toBeTruthy();
    expect(overlay.textContent).toContain("Hi! I'm 덕수쌤.");
    expect(onLayerChange).toHaveBeenCalledWith(true);
    fireEvent.tap(screen.getByTestId(ids.guideListOpen), { eventType: "catchEvent" });
    expect(onOpenRoom).toHaveBeenCalledWith("duksu");
    expect(seen()).toEqual(["list"]);
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
  });

  test("MG-UI2 떠 있는 줄을 눌러도 덕수쌤 방이 열리고, Skip은 닫기만 한다", () => {
    const first = memoryStore();
    const a = mountList(serverSource(), first.store);
    fireEvent.tap(within(screen.getByTestId(ids.guideList)).getByTestId(list.row("duksu")), {});
    expect(a.onOpenRoom).toHaveBeenCalledWith("duksu");
    expect(first.seen()).toEqual(["list"]);
    cleanup();
    const second = memoryStore();
    const b = mountList(serverSource(), second.store);
    fireEvent.tap(screen.getByTestId(ids.guideListSkip), { eventType: "catchEvent" });
    expect(b.onOpenRoom).not.toHaveBeenCalled();
    expect(second.seen()).toEqual(["list"]);
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
  });

  test("MG-UI2 이미 본 기록 · 손님 · 덕수쌤 방이 없는 출처에서는 뜨지 않는다", () => {
    mountList(serverSource(), memoryStore(["list"]).store);
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
    cleanup();
    mountList(serverSource(), memoryStore().store, "sign-in");
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
    cleanup();
    const fixture = createFixtureChatSource({
      imageUrlOf: () => null,
      seed: seedOf(fixtureRoom("mina")),
    });
    mountList(fixture, memoryStore().store);
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
  });

  test("MG-UI2 이미 미나를 해금한 사용자 — 원본 목록(순서 · 미나 NEW)은 안내가 없을 때와 같고 떠 있는 줄은 덕수쌤", () => {
    const source = serverSource();
    act(() => {
      source.unlockCharacter("mina");
    });
    mountList(source, memoryStore(["list"]).store);
    const withoutGuide = rowOrder();
    cleanup();
    mountList(source, memoryStore().store);
    expect(rowOrder()).toEqual(withoutGuide);
    expect(
      screen.getByTestId(list.list).querySelector(`[data-testid="${list.rowNew("mina")}"]`),
    ).not.toBeNull();
    const overlay = screen.getByTestId(ids.guideList);
    expect(within(overlay).queryByTestId(list.row("mina"))).toBeNull();
    expect(within(overlay).getByTestId(list.row("duksu"))).toBeTruthy();
  });
});

describe("뒤로가기 · 낭독(리뷰 W-3 · W-5)", () => {
  test("MG-UI5 목록 안내 중 뒤로가기 = 닫기(본 것으로), 뒤 목록은 낭독에서 숨는다", () => {
    const { store, seen } = memoryStore();
    const { onOpenRoom } = mountList(serverSource(), store);
    const content = document.querySelector(".messenger-list-content");
    expect(content?.getAttribute("accessibility-elements-hidden")).toBe("true");
    systemBack();
    expect(screen.queryByTestId(ids.guideList)).toBeNull();
    expect(onOpenRoom).not.toHaveBeenCalled();
    expect(seen()).toEqual(["list"]);
    expect(
      document
        .querySelector(".messenger-list-content")
        ?.getAttribute("accessibility-elements-hidden"),
    ).not.toBe("true");
  });

  test("MG-UI5 방 코치마크 중 뒤로가기 = Skip(방을 나가지 않음)", async () => {
    const { store, seen } = memoryStore();
    const { onExit } = mountChat({ source: serverSource(), roomId: "duksu", guideStore: store });
    await flush();
    systemBack();
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
    expect(onExit).not.toHaveBeenCalled();
    expect(seen()).toContain("room");
  });
});

describe("덕수쌤 방 첫 입장", () => {
  test("MG-UI3 첫 인사가 온 뒤 코치마크 — 입력 칸 → 전구, 단계에 맞춰 입력 줄 고리, Got it이면 다시 안 뜸", async () => {
    const { store, seen } = memoryStore();
    mountChat({ source: serverSource(), roomId: "duksu", guideStore: store });
    await flush();
    const coach = () => screen.getByTestId(ids.guideCoach);
    expect(coach().getAttribute("data-step")).toBe("chat");
    expect(coach().textContent).toContain("1 of 2");
    expect(document.querySelector(".messenger-guide-target-chat")).not.toBeNull();
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
    expect(coach().getAttribute("data-step")).toBe("ideas");
    expect(document.querySelector(".messenger-guide-target-ideas")).not.toBeNull();
    expect(screen.getByTestId(ids.guideCoachNext).textContent).toBe("Got it");
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
    expect(seen()).toEqual(["room", "list"]); // 방 코치마크를 끝내면 목록 안내도 본 것(리뷰 S-7)
  });

  test("MG-UI3 아무 데나 탭 = 다음, Skip은 끝, 사진 · 음성 단계는 서버 연결 전 없음", async () => {
    const { store, seen } = memoryStore();
    mountChat({ source: serverSource(), roomId: "duksu", guideStore: store });
    await flush();
    fireEvent.tap(screen.getByTestId(ids.guideCoach), { eventType: "catchEvent" });
    expect(screen.getByTestId(ids.guideCoach).getAttribute("data-step")).toBe("ideas");
    fireEvent.tap(screen.getByTestId(ids.guideCoachSkip), { eventType: "catchEvent" });
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
    expect(seen()).toEqual(["room", "list"]); // 방 코치마크를 끝내면 목록 안내도 본 것(리뷰 S-7)
    expect(document.querySelector(".messenger-guide-target-media")).toBeNull();
  });

  test("MG-UI3 첫 인사 전 · 이미 봄 · 덕수쌤 아닌 방 · 가짜 출처에서는 뜨지 않는다", async () => {
    mountChat({ source: serverSource("empty"), roomId: "duksu", guideStore: memoryStore().store });
    await flush();
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
    cleanup();
    mountChat({ source: serverSource(), roomId: "duksu", guideStore: memoryStore(["room"]).store });
    await flush();
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
    cleanup();
    mountChat({
      seed: seedOf(fixtureRoom("duksu")),
      roomId: "duksu",
      guideStore: memoryStore().store,
    });
    await flush();
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
  });

  test("MG-UI3 생년 시트가 먼저 뜨면 코치마크는 기다렸다가 시트를 닫은 뒤에 뜬다(기기 확인 2026-11-13)", async () => {
    const shown = (id: string) => screen.queryByTestId(id) !== null;
    mountChat({
      source: serverSource("greeted", "unasked"),
      roomId: "duksu",
      guideStore: memoryStore().store,
    });
    await flush();
    expect(shown(ids.birthYearSheet)).toBe(true);
    expect(shown(ids.guideCoach)).toBe(false);
    act(() => {
      fireEvent.tap(screen.getByTestId(ids.birthYearOption(2001)), {});
    });
    act(() => {
      tapButtonIn("ui-lynx-bottom-sheet-action-continue");
    });
    await flush();
    expect(shown(ids.birthYearSheet)).toBe(false);
    expect(screen.getByTestId(ids.guideCoach).getAttribute("data-step")).toBe("chat");
  });

  test("MG-UI4 안내 단추 · 말풍선은 Android 낭독 속성을 갖는다", async () => {
    mountChat({ source: serverSource(), roomId: "duksu", guideStore: memoryStore().store });
    await flush();
    for (const id of [ids.guideCoachNext, ids.guideCoachSkip]) {
      const el = screen.getByTestId(id);
      expect(el.getAttribute("accessibility-enable-tap")).toBe("true");
      expect(el.getAttribute("flatten")).toBe("false");
      expect(el.getAttribute("accessibility-traits")).toBe("button");
    }
    const copy = screen.getByTestId(ids.guideCoach).querySelector('[accessibility-element="true"]');
    expect(copy?.getAttribute("accessibility-label")).toContain("1 of 2");
  });
});
