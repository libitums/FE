import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers } from "./chat-ui.test-support";
import { createFixtureChatSource } from "./chat-fixture-source";
import { memoryLastSeenStore } from "./chat-last-seen-store";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import { companionSeed } from "./companion-roster";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(LSN-UI1): 앱이 꺼진 사이 미나의 스토리 반응 2개가 왔고 기기에는 미나 방을 본 마지막 메시지가 적혀 있다 — 앱을 켜
// 목록에 들어오면 미나 줄이 맨 위 · 안 읽음 2 · 최신 미리보기(ADR-0213 개정).

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const them = (id: string, ko: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});

const histories: Record<string, ChatMessage[]> = {
  duksu: [them("d-1", "안녕하세요", 800)],
  mina: [
    them("m-1#0", "하이", 50),
    them("m-2#0", "와, 서울 도착 축하해!", 900),
    them("m-3#0", "사진 예쁘다!", 910),
  ],
};
const remote: ChatRemote = {
  loadHistory: async (characterId) => ({
    messages: histories[characterId] ?? [],
    corrections: {},
    ideas: null,
  }),
  greet: async () => null,
  openTurn: () => ({ cancel: () => undefined }),
  lastMessages: async () =>
    new Map([
      ["duksu", "2026-11-27T10:00:00.000Z"],
      ["mina", "2026-11-27T10:31:08.260Z"],
    ]),
};

const rowOrder = (): string[] =>
  Array.from(screen.getByTestId(ids.list).querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^messenger-list-row-[^-]+$/.test(id));

test("LSN-UI1 앱을 끈 사이 반응 2개 → 켜면 미나 줄이 맨 위 · 안 읽음 2 · 최신 미리보기", async () => {
  const seen = memoryLastSeenStore();
  seen.write("mina", { id: "m-1", at: 50 });
  seen.write("duksu", { id: "d-1", at: 800 });
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    remote,
    unlocked: ["mina"],
    previewOnStart: true,
    lastSeen: seen,
  });
  render(
    <MessengerListScreen
      source={source}
      wallet={createCoinWallet({ earned: 0 })}
      onOpenRoom={vi.fn()}
      onGoToJourney={vi.fn()}
      onLayerChange={vi.fn()}
      notice={null}
      onNoticeShown={vi.fn()}
      access="open"
      onSignIn={vi.fn()}
    />,
  );
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(rowOrder()[0]).toBe("messenger-list-row-mina");
  expect(screen.getByTestId(ids.rowUnread("mina")).textContent).toBe("2");
  expect(screen.queryByTestId(ids.rowUnread("duksu"))).toBeNull();
  expect(screen.getByTestId(ids.rowPreview("mina")).textContent).toContain("사진 예쁘다!");
});
