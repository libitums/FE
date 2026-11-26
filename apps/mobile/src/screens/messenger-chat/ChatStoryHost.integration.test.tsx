import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useContext } from "@lynx-js/react";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { ChatEventsContext } from "./chat-events";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { chatStoryThumbTestIds as thumbIds } from "./chat-story-thumb.contract";
import { clearBackHandlers, systemBack, tapButtonIn, tapId } from "./chat-ui.test-support";
import { ChatStoryHost } from "./ChatStoryHost";
import { ChatStoryHostContext } from "./chat-story-host-context";
import { tapEl } from "./lynx-tap.test-support";
import { createCoinWallet } from "./coin-wallet";
import { companionSeed } from "./companion-roster";
import {
  friendStoriesTestIds as fs,
  type ChatStoryQuote,
  type FriendStoriesPort,
} from "./friend-stories.contract";
import { story } from "./friend-stories.test-support";
import { emptyKeyboardHeightStore, unknownKoreanKeyboardProbe } from "./keyboard-ports";
import { zeroKeyboardDockEdges } from "../../lib/keyboard-dock";
import { MessengerChatScreen } from "./MessengerChatScreen";
import { myStoriesTestIds as ms } from "./my-stories.contract";
import { fakeMyStories, myStory } from "./my-stories.test-support";
import { createTrialStore } from "./trial-store";

// `integration` 계층(CT-I1 ~ I5): 대화방 → 스토리 인용 판 → 그 스토리(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩). 결선(`ChatStoryHost`)이
// 대화 기록의 인용 · 스토리 포트(메모리 대역) · 보기 층 · 안내 시트 · 이벤트를 잇는지 봅니다. 목록은 인용이 설 때 종류마다 한 번만 받습니다.

const NOW = Date.UTC(2026, 10, 26, 6, 0);
const HOUR = 3_600_000;
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const mineQuote: ChatStoryQuote = {
  storyId: "ms-1",
  characterId: "duksu",
  line: "서울에 도착했어!",
  imagePath: null,
  postedAt: NOW - HOUR,
  kind: "mine",
};
const friendQuote: ChatStoryQuote = {
  storyId: "s-duksu",
  characterId: "duksu",
  line: "야근 끝! 편의점 라면이 최고야",
  imagePath: "content/images/duksu.webp",
  postedAt: NOW - 2 * HOUR,
};
const them = (id: string, ko: string, quote?: ChatStoryQuote): ChatMessage =>
  ({
    id,
    at: NOW,
    kind: "text",
    from: "them",
    text: { ko, en: "" },
    ...(quote === undefined ? {} : { story: quote }),
  }) as ChatMessage;
const me = (id: string, ko: string, quote: ChatStoryQuote): ChatMessage =>
  ({ id, at: NOW, kind: "text", from: "me", text: { ko, en: "" }, story: quote }) as ChatMessage;

function mount(messages: readonly ChatMessage[], withPort = true) {
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages, corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  const fake = fakeMyStories({ stories: [myStory("ms-1", { postedAt: NOW - HOUR, ko: "서울" })] });
  const mineLoad = vi.spyOn(fake.port, "load");
  const friendsLoad = vi.fn(async () => [
    story("duksu", { postedAt: NOW - 2 * HOUR, expiresAt: NOW + 22 * HOUR }),
  ]);
  const port: FriendStoriesPort = {
    load: friendsLoad,
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(), markSeen: vi.fn() },
    mine: fake.port,
  };
  const sink = vi.fn();
  const onOpenRoom = vi.fn<(roomId: string) => void>();
  const wallet = createCoinWallet({ earned: 0 });
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: "duksu" }}>
      <ChatStoryHost
        port={withPort ? port : undefined}
        source={source}
        wallet={wallet}
        roomId="duksu"
        onOpenRoom={onOpenRoom}
      >
        <MessengerChatScreen
          roomId="duksu"
          source={source}
          keyboardProbe={unknownKoreanKeyboardProbe}
          keyboardHeightStore={emptyKeyboardHeightStore}
          edges={zeroKeyboardDockEdges}
          learnerName="Hana"
          wallet={wallet}
          trial={createTrialStore(0)}
          tier="free"
          onExit={vi.fn()}
          onOpenMemories={vi.fn()}
          onSignInRequired={null}
        />
      </ChatStoryHost>
    </ChatEventsContext.Provider>,
  );
  const events = (name: string) =>
    sink.mock.calls.map(([event]) => event as { name: string }).filter((e) => e.name === name);
  return { fake, mineLoad, friendsLoad, events, onOpenRoom };
}

const cards = () => screen.getAllByTestId(fs.quote);

test("CT-I1 반응 판 둘 — 내 스토리 목록은 한 번, 누르면 내 스토리 전체 화면 보기 · my_story_viewed(from chat), 닫으면 방", async () => {
  const { mineLoad, friendsLoad, events } = mount([
    them("m1#0", "와, 서울에 온 걸 환영해!", mineQuote),
    them("m2#0", "사진 너무 예쁘다!", mineQuote),
  ]);
  await flush();
  await flush();
  expect(mineLoad).toHaveBeenCalledTimes(1);
  expect(friendsLoad).not.toHaveBeenCalled();
  expect(cards()).toHaveLength(2);
  expect(cards()[0]?.getAttribute("accessibility-label")).toContain("Open story");
  const [first] = cards();
  if (first !== undefined) tapEl(first);
  await flush();
  expect(screen.getByTestId(fs.viewer)).toBeTruthy();
  expect(screen.getByTestId(ms.bar)).toBeTruthy();
  expect(events("my_story_viewed")).toEqual([
    expect.objectContaining({ from: "chat", reactions: "0", unseen: "0" }),
  ]);
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(fs.viewer)).toBeNull();
});

test("CT-I2 내가 단 친구 스토리 답 판 — 누르면 그 인물 · 그 장부터 스토리 보기, friend_story_viewed · closed(from chat)", async () => {
  const { friendsLoad, events } = mount([me("u1", "맛있겠다!", friendQuote)]);
  await flush();
  await flush();
  expect(friendsLoad).toHaveBeenCalledTimes(1);
  tapId(fs.quote);
  await flush();
  expect(screen.getByTestId(fs.viewer)).toBeTruthy();
  expect(events("friend_story_viewed")).toEqual([
    expect.objectContaining({ characterId: "duksu", from: "chat", index: "1", total: "1" }),
  ]);
  tapId(fs.close);
  expect(screen.queryByTestId(fs.viewer)).toBeNull();
  expect(events("friend_story_closed")).toEqual([
    expect.objectContaining({ reason: "closed", shown: "1", total: "1" }),
  ]);
});

test("CT-I3 24시간 지난 친구 스토리 판 — 「Ended」, 누르면 안내 시트만(보기 없음), OK로 닫힘", async () => {
  const old = { ...friendQuote, storyId: "s-old", postedAt: NOW - 30 * HOUR };
  mount([me("u1", "맛있겠다!", old)]);
  await flush();
  await flush();
  expect(screen.getByTestId(thumbIds.ended)).toBeTruthy();
  tapId(fs.quote);
  expect(screen.getByTestId(thumbIds.endedSheet)).toBeTruthy();
  expect(screen.queryByTestId(fs.viewer)).toBeNull();
  tapButtonIn("ui-lynx-bottom-sheet-action-ok");
  expect(screen.queryByTestId(thumbIds.endedSheet)).toBeNull();
});

test("CT-I4 보기에서 지우면 그 판은 「Deleted story」", async () => {
  const { fake } = mount([them("m1#0", "와, 서울에 온 걸 환영해!", mineQuote)]);
  await flush();
  await flush();
  tapId(fs.quote);
  await flush();
  tapId(ms.viewerMenu);
  tapId(ms.viewerDelete);
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledWith("ms-1");
  expect(screen.queryByTestId(fs.viewer)).toBeNull();
  expect(cards()[0]?.textContent).toContain("Deleted story");
});

test("CT-I5 스토리 포트가 없으면(손님) 목록을 받지 않고 판은 누를 수 없음", async () => {
  mount([them("m1#0", "와!", mineQuote)], false);
  await flush();
  expect(cards()[0]?.getAttribute("accessibility-traits")).toBeNull();
  tapId(fs.quote);
  expect(screen.queryByTestId(fs.viewer)).toBeNull();
});

function NeedProbe(): null {
  const host = useContext(ChatStoryHostContext);
  needRef.current = host?.need ?? null;
  return null;
}
const needRef: { current: ((kind: "mine" | "friend") => void) | null } = { current: null };

test("CT-I6 목록을 못 받으면(null) 다음 요청이 다시 받고, 받은 뒤에는 다시 받지 않음", async () => {
  const load = vi.fn<FriendStoriesPort["load"]>().mockResolvedValueOnce(null);
  load.mockResolvedValue([]);
  const port: FriendStoriesPort = {
    load,
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: vi.fn() },
  };
  const source = createFixtureChatSource({ imageUrlOf: () => null, timers: fakeTimers() });
  render(
    <ChatStoryHost
      port={port}
      source={source}
      wallet={createCoinWallet({ earned: 0 })}
      roomId="mina"
      onOpenRoom={vi.fn()}
    >
      <NeedProbe />
    </ChatStoryHost>,
  );
  for (let i = 0; i < 3; i += 1) {
    act(() => needRef.current?.("friend"));
    await flush();
  }
  expect(load).toHaveBeenCalledTimes(2);
});
