import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { companionRemote } from "../lib/companion-api";
import type {
  RankingBoard,
  RankingBoardKind,
  RankingClient,
  RankingLoad,
} from "../lib/ranking.contract";
import { setTesterAccessActive } from "../lib/tester-access";
import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type { EpisodeIntroEvent } from "../screens/episode-intro/episode-intro.contract";
import { App } from "./App";
import {
  messengerChatSource,
  resetMessengerChatSourceForTests,
  setMessengerChatRemote,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setRankingClientForTests } from "./ranking-wiring";
import {
  navigatorItemIds,
  openTab,
  present,
  renderTesterApp,
  tapId,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(ADR-0170 RK-I1 ~ I6): 실제 App + 순위 포트 대역(`setRankingClientForTests`) · 컴패니언 서버 fetch 대역.
// 탭 5 · 순위 열기(Lessons 기본) · 보드 전환 · 설정 숨기기 → 숨김 상태 · Show me · 비회원 로그인 권유 · 방 줄 → Chat words · 분석.

const U1 = "11111111-1111-4111-8111-111111111111";
const board = (kind: RankingBoardKind, me: number): RankingBoard => ({
  kind,
  groupSize: 24,
  endsAt: "2099-01-05T00:00:00Z",
  reward: null,
  rows: [
    { rank: 1, name: "Linh", countryCode: "VN", episode: 6, score: 20, me: false },
    { rank: 2, name: "Mai", countryCode: "VN", episode: 2, score: me, me: true },
  ],
  me: { rank: 2, score: me },
  next: { name: "Linh", more: 21 - me },
});

type Fake = RankingClient & { loads: RankingBoardKind[]; hiddenSaves: boolean[] };
function fakeClient(state: { hidden: boolean }): Fake {
  const fake: Fake = {
    loads: [],
    hiddenSaves: [],
    load: async (kind) => {
      fake.loads.push(kind);
      const result: RankingLoad = state.hidden
        ? { status: "hidden" }
        : { status: "ready", board: board(kind, kind === "lessons" ? 7 : 14) };
      return result;
    },
    preferences: async () => ({ hidden: state.hidden }),
    setHidden: async (hidden) => {
      fake.hiddenSaves.push(hidden);
      state.hidden = hidden;
      return { hidden };
    },
  };
  return fake;
}

const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });
const tapButton = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});
const names = (events: EpisodeIntroEvent[]) => events.map((event) => event.name);

let events: EpisodeIntroEvent[] = [];
const sink = (event: EpisodeIntroEvent) => void events.push(event);

beforeEach(() => {
  events = [];
  resetMessengerChatSourceForTests();
  setMessengerChatStoresForTests({ unlock: memoryUnlockStore([]), now: () => Date.now() });
});
afterEach(() => {
  cleanup();
  setRankingClientForTests(null);
  setMessengerChatRemote(null);
  setTesterAccessActive(false);
  resetMessengerChatSourceForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("RK-I1. 탭은 다섯(순위는 넷째)이고, 순위 탭은 Lessons 보드 · 내 줄을 그리며 열림 · 내 줄 이벤트를 낸다", async () => {
  const client = fakeClient({ hidden: false });
  setRankingClientForTests(client);
  await renderTesterApp(
    <App progressSeed={legacyPassedSeedWithCoins(0)} episodeIntroEventSink={sink} />,
  );
  expect(navigatorItemIds()).toEqual(["journey", "roleplay", "messenger", "ranking", "settings"]);
  openTab("ranking");
  await flush();
  expect(client.loads).toEqual(["lessons"]);
  expect(textOf("ranking-title")).toBe("Weekly ranking");
  expect(screen.getByTestId("ranking-board-lessons")).toHaveAttribute("data-selected", "true");
  expect(textOf("ranking-me-gap")).toBe("14 more to pass Linh");
  expect(present("app-header")).toBe(false);
  expect(events.find((event) => event.name === "ranking_opened")).toMatchObject({
    board: "lessons",
    source: "tab",
    view: "ready",
  });
  expect(events.find((event) => event.name === "ranking_own_row_viewed")).toMatchObject({
    rank: "2",
    score: "7",
  });
});

test("RK-I2. Chat words를 누르면 그 보드를 읽고 전환 이벤트를 낸다", async () => {
  const client = fakeClient({ hidden: false });
  setRankingClientForTests(client);
  await renderTesterApp(
    <App progressSeed={legacyPassedSeedWithCoins(0)} episodeIntroEventSink={sink} />,
  );
  openTab("ranking");
  await flush();
  tapId("ranking-board-chat-words");
  await flush();
  expect(client.loads).toEqual(["lessons", "chat-words"]);
  expect(screen.getByTestId("ranking-row-1")).toHaveTextContent("words");
  expect(events.find((event) => event.name === "ranking_board_switched")).toMatchObject({
    from: "lessons",
    to: "chat_words",
  });
});

test("RK-I3. 설정 「Hide me from ranking」을 켜면 저장되고 순위는 숨김 상태 — Show me면 다시 보인다", async () => {
  const client = fakeClient({ hidden: false });
  setRankingClientForTests(client);
  await renderTesterApp(
    <App progressSeed={legacyPassedSeedWithCoins(0)} episodeIntroEventSink={sink} />,
  );
  openTab("settings");
  await flush();
  const row = screen.getByTestId("ui-lynx-settings-group-item-ranking-hidden");
  fireEvent.tap(within(row).getByTestId("ui-lynx-settings-cell"), {});
  await flush();
  expect(client.hiddenSaves).toEqual([true]);
  expect(names(events)).toContain("ranking_hide_toggled");
  openTab("ranking");
  await flush();
  expect(screen.getByTestId("ranking-notice")).toHaveAttribute("data-view", "hidden");
  tapButton("ranking-notice-action");
  await flush();
  await flush();
  expect(client.hiddenSaves).toEqual([true, false]);
  expect(screen.getByTestId("ranking-row-1")).toHaveTextContent("Linh");
});

test("RK-I5. 서버 방: 저장 카드의 채팅 단어 칩 · 머리 아래 이번 주 줄 → 누르면 순위 탭 Chat words 보드", async () => {
  const client = fakeClient({ hidden: false });
  setRankingClientForTests(client);
  setMessengerChatRemote(companionRemote);
  setTesterAccessActive(true);
  await renderTesterApp(
    <App progressSeed={legacyPassedSeedWithCoins(120)} episodeIntroEventSink={sink} />,
  );
  const history = {
    messages: [
      {
        id: U1,
        role: "user",
        origin: "turn",
        status: "complete",
        hidden: false,
        text: "김치찌개 먹었어요",
        inputMode: "text",
        segments: [],
        notice: null,
        feedback: {
          status: "none",
          items: [],
          chatWords: {
            counted: [{ id: "voca:kimchi-stew", surface: "김치찌개" }],
            pending: [],
            weekTotal: 15,
          },
        },
        createdAt: "2026-11-15T10:18:00.000Z",
      },
    ],
    hasMore: false,
  };
  vi.stubGlobal("fetch", async (url: string) => ({
    status: url.includes("/rpc/companion_list_messages") ? 200 : 404,
    text: async () => JSON.stringify(url.includes("/rpc/companion_list_messages") ? history : {}),
  }));
  messengerChatSource((path) => path).setBirthYear(2000);
  openTab("messenger");
  act(() => {
    fireEvent.tap(
      within(screen.getByTestId("messenger-list-list")).getByTestId("messenger-list-row-duksu"),
      {},
    );
  });
  await flush();
  expect(textOf("messenger-chat-words-earned")).toContain("+1 chat word");
  expect(textOf("messenger-chat-word-0")).toBe("김치찌개");
  // 보드는 14지만 이 방 기록의 이번 주 합(15)이 앞선다.
  expect(textOf("messenger-chat-words-strip")).toContain("15 chat words");
  expect(textOf("messenger-chat-words-strip")).toContain("#2 in your group");
  tapId("messenger-chat-words-strip");
  await flush();
  expect(screen.getByTestId("ranking-board-chat-words")).toHaveAttribute("data-selected", "true");
  expect(events.find((event) => event.name === "ranking_opened")).toMatchObject({
    board: "chat_words",
    source: "chat",
  });
});
