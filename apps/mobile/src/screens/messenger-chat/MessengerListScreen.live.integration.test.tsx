import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers } from "./chat-ui.test-support";
import { createFixtureChatSource } from "./chat-fixture-source";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";
import { companionSeed } from "./companion-roster";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `integration` 계층(LL-I1 ~ I3): 목록 화면에 가만히 있는 동안 온 스토리 반응(푸시 없음) — 목록이 보이는 동안 30초마다 목록을
// 맞춰(`server.syncRooms`) 그 방이 맨 위 · 안 읽음 · 최신 미리보기로 선다. 화면을 떠나거나 앱이 뒤로 가면 요약을 더 읽지 않는다
// (ADR-0213 개정 2). 서버 흉내 탐침 — 인물별 기록과 목록 요약을 바꿔 가며 돌려준다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const them = (id: string, ko: string, at: number): ChatMessage => ({
  id,
  at,
  kind: "text",
  from: "them",
  text: { ko, en: "" },
});

function probeServer() {
  const histories = new Map<string, ChatMessage[]>([
    ["duksu", [them("d-1", "안녕하세요", 800)]],
    ["mina", [them("m-1", "하이", 50)]],
  ]);
  let lastAt = new Map<string, string | null>([
    ["duksu", "2026-11-27T10:00:00.000Z"],
    ["mina", "2026-11-27T09:00:00.000Z"],
  ]);
  let summaries = 0;
  const remote: ChatRemote = {
    loadHistory: async (characterId) => ({
      messages: histories.get(characterId) ?? [],
      corrections: {},
      ideas: null,
    }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    lastMessages: async () => {
      summaries += 1;
      return new Map(lastAt);
    },
  };
  return {
    remote,
    summaries: () => summaries,
    /** 크론이 미나 방에 스토리 반응을 넣는다(대화의 last_message_at이 바뀐다). 푸시는 없다. */
    react: () => {
      histories.set("mina", [
        ...(histories.get("mina") ?? []),
        them("m-2", "와, 서울 도착 축하해!", 900),
      ]);
      lastAt = new Map(lastAt).set("mina", "2026-11-27T10:31:08.260Z");
    },
  };
}

const settle = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 6; i += 1) await vi.advanceTimersByTimeAsync(0);
  });
};

const signal = (name: "contentSyncOpportunity" | "appDidEnterBackground") =>
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(name, []);
  });

const rowOrder = (): string[] =>
  Array.from(screen.getByTestId(ids.list).querySelectorAll('[data-testid^="messenger-list-row-"]'))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => /^messenger-list-row-[^-]+$/.test(id));

function mountList(server: ReturnType<typeof probeServer>) {
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    remote: server.remote,
    unlocked: ["mina"],
    previewOnStart: true,
  });
  return render(
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
}

test("LL-I1 목록에 가만히 있는 동안 반응이 오면 30초 안에 미나 줄이 맨 위 · 안 읽음 1 · 최신 미리보기", async () => {
  const server = probeServer();
  mountList(server);
  await settle();
  expect(rowOrder()[0]).toBe("messenger-list-row-duksu");
  server.react();
  await settle(30_000);
  expect(rowOrder()[0]).toBe("messenger-list-row-mina");
  expect(screen.getByTestId(ids.rowUnread("mina")).textContent).toBe("1");
  expect(screen.getByTestId(ids.rowPreview("mina")).textContent).toContain("서울 도착 축하해");
});

test("LL-I2 목록 화면을 떠나면 요약을 더 읽지 않는다", async () => {
  const server = probeServer();
  const view = mountList(server);
  await settle();
  view.unmount();
  const reads = server.summaries();
  await settle(120_000);
  expect(server.summaries()).toBe(reads);
});

test("LL-I3 앱이 뒤로 가면 멈추고, 앞으로 오면 다시 30초마다 읽는다", async () => {
  const server = probeServer();
  mountList(server);
  await settle();
  signal("appDidEnterBackground");
  const reads = server.summaries();
  await settle(120_000);
  expect(server.summaries()).toBe(reads);
  signal("contentSyncOpportunity");
  server.react();
  await settle(30_000);
  expect(server.summaries()).toBe(reads + 1);
  expect(rowOrder()[0]).toBe("messenger-list-row-mina");
});
