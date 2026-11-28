import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import { friendStoriesTestIds as fsIds, type FriendStoriesPort } from "./friend-stories.contract";
import { myStoriesTestIds as ids, type MyStoriesPort, type MyStory } from "./my-stories.contract";
import { fakeMyStories, MS_HOUR, MS_NOW, myStory, reaction } from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { MyStoriesScreen } from "./MyStoriesScreen";

// `integration` 계층(LV-I1 ~ I5): 내 스토리 보기를 연 동안 다시 읽기(ADR-0194 개정 ⟨살아 있는 보기⟩) — 목록 · 설정 화면에서 보기를 열고
// 서버(메모리 대역)의 Seen by · 답이 늘면 30초 뒤 아래 바 · 새 답 줄이 바뀌고, 닫으면 더 읽지 않고, 앱이 뒤로 가면 멈춥니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const seed = () =>
  seedOf(
    fixtureRoom("mina", {
      counterpart: { id: "mina", name: "미나", avatarPath: null },
      messages: [{ kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 }],
    }),
    fixtureRoom("haejun", {
      counterpart: { id: "haejun", name: "권해준", avatarPath: null },
      messages: [{ kind: "text", from: "them", text: { ko: "와!", en: "Wow!" }, minutesAgo: 40 }],
    }),
  );

/** 서버 대역 — `grow()`로 Seen by · 답이 늘어난 것처럼 바꿉니다. */
function liveServer() {
  let story: MyStory = myStory("ms-1", {
    postedAt: MS_NOW - MS_HOUR,
    seenBy: [{ characterId: "mina", at: MS_NOW - 10 * 60_000 }],
  });
  const fake = fakeMyStories({ stories: [story], guideSeen: true });
  const load = vi.fn(async () => ({ ...fake.state(), stories: [story] }));
  const port: MyStoriesPort = {
    ...fake.port,
    load,
  };
  const grow = () => {
    story = {
      ...story,
      seenBy: [...story.seenBy, { characterId: "haejun", at: MS_NOW }],
      reactions: [reaction("r9", "haejun", { text: "창가 자리 부럽다.", at: MS_NOW })],
    };
  };
  const signal = (value: "resume" | "background") =>
    act(() => {
      lynx
        .getJSModule("GlobalEventEmitter")
        .emit(value === "resume" ? "contentSyncOpportunity" : "appDidEnterBackground", []);
    });
  return { port, load, grow, signal };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mountList(port: MyStoriesPort) {
  const stories: FriendStoriesPort = {
    load: async () => [],
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    mine: port,
  };
  render(
    <ChatEventsContext.Provider value={{ sink: vi.fn(), roomId: null }}>
      <MessengerListScreen
        source={makeSource(seed())}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
}

test("LV-I1. 목록 「Your story」 보기 — 30초 뒤 Seen by · 새 답 줄이 늘고, 닫으면 더 읽지 않는다", async () => {
  const server = liveServer();
  mountList(server.port);
  await advance(4);
  tapId(ids.mine);
  await advance(1);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 1");
  // 자동 넘김(6초)이 보기를 닫지 않게 멈춤 단추로 세웁니다.
  tapId(fsIds.pause);
  server.grow();
  await advance(30_000);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 2");
  expect(screen.getByTestId(ids.replyLine("r9"))).not.toBeNull();
  const reads = server.load.mock.calls.length;
  tapId(fsIds.close);
  await advance(120_000);
  expect(server.load).toHaveBeenCalledTimes(reads);
});

test("LV-I2. 앱이 뒤로 가면 보기를 연 채로도 읽지 않고, 앞으로 오면 바로 읽어 바뀐 수를 보인다", async () => {
  const server = liveServer();
  mountList(server.port);
  await advance(4);
  tapId(ids.mine);
  tapId(fsIds.pause);
  await advance(1);
  server.signal("background");
  const reads = server.load.mock.calls.length;
  server.grow();
  await advance(120_000);
  expect(server.load).toHaveBeenCalledTimes(reads);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 1");
  server.signal("resume");
  await advance(1);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 2");
});

test("LV-I3. 설정 › My stories 칸 보기도 30초 뒤 Seen by가 는다", async () => {
  const server = liveServer();
  render(
    <ChatEventsContext.Provider value={{ sink: vi.fn(), roomId: null }}>
      <MyStoriesScreen
        port={server.port}
        source={makeSource(seed())}
        onBack={vi.fn()}
        onOpenRoom={vi.fn()}
      />
    </ChatEventsContext.Provider>,
  );
  await advance(4);
  tapId(ids.tile("ms-1"));
  tapId(fsIds.pause);
  await advance(1);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 1");
  server.grow();
  await advance(30_000);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 2");
});

test("LV-I4. (보고 재현) 목록을 읽은 뒤 답이 왔다 → 「Your story」를 열면 30초를 기다리지 않고 그 답 줄 · Seen by가 선다", async () => {
  const server = liveServer();
  mountList(server.port);
  await advance(4);
  // 목록을 읽은 뒤 서버에 답이 도착(앱은 아직 모름).
  server.grow();
  tapId(ids.mine);
  tapId(fsIds.pause);
  await advance(4);
  expect(screen.getByTestId(ids.replyLine("r9"))).not.toBeNull();
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 2");
});

test("LV-I5. 보기를 닫아 둔 채 앱이 앞으로 오면 목록이 한 번 다시 읽혀 「Your story」 고리가 새 답(unseen)이 된다", async () => {
  const server = liveServer();
  mountList(server.port);
  await advance(4);
  tapId(ids.mine);
  tapId(fsIds.close);
  await advance(4);
  expect(screen.getByTestId(ids.mine).getAttribute("data-state")).toBe("seen");
  server.grow();
  server.signal("background");
  server.signal("resume");
  await advance(4);
  expect(screen.getByTestId(ids.mine).getAttribute("data-state")).toBe("unseen");
});
