import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  nativeInput,
  seedOf,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import type { FriendStoriesPort } from "./friend-stories.contract";
import { messengerChatTestIds as chatIds } from "./messenger-chat.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { fakeMyStories, MS_NOW, wordChoice } from "./my-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(MS-UI31 ~ UI36): 스토리 만들기(시안 26 ~ 28) — 시작 시트 · 바탕 위 편집 · 넣기 시트, 서버가 받는 종류(`kinds`, 서버 반영
// 예상)에 따라 Aa · 스티커 수 · 올릴 길이 갈린다. 서버는 메모리 대역입니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () => catalogOf([friend("mina", { name: "미나", unlockEpisode: 1 })]),
  add: () => "added",
  earlyAccess: null,
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

async function mount(fake: ReturnType<typeof fakeMyStories>) {
  const sink = vi.fn();
  const stories: FriendStoriesPort = {
    load: async () => [],
    imageUrl: () => null,
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    mine: fake.port,
  };
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MessengerListScreen
        source={makeSource(
          seedOf(
            fixtureRoom("mina", {
              counterpart: { id: "mina", name: "미나", avatarPath: null },
              messages: [
                { kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 },
              ],
            }),
          ),
        )}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={friendsPort()}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
  return { events: () => sink.mock.calls.map(([event]) => event as { name: string }) };
}

const words = [wordChoice("w1"), wordChoice("w2", "찌개", "stew")];

test("MS-UI31. 시작 시트(시안 26) — 사진을 받지 않는 서버면 Background만, 누르면 편집", async () => {
  await mount(fakeMyStories({ guideSeen: true, words }));
  tapId(ids.create);
  expect(screen.getByTestId(ids.start).textContent).toContain("New story");
  expect(screen.queryByTestId(ids.startCamera)).toBeNull();
  expect(screen.queryByTestId(ids.startPhotos)).toBeNull();
  tapId(ids.startBackground);
  expect(screen.queryByTestId(ids.start)).toBeNull();
  expect(screen.getByTestId(ids.editor)).not.toBeNull();
});

test("MS-UI32. 지금 서버(word · card) — Aa · Cards 없음, 「Add a word」 시트는 단어장 단어만(탭 없음), 스티커는 하나(바꿔 끼움), 빈 바탕은 Share 꺼짐, 바탕색 고르기", async () => {
  const fake = fakeMyStories({ guideSeen: true, words });
  await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  expect(screen.queryByTestId(ids.toolText)).toBeNull();
  expect(screen.queryByTestId("my-stories-tool-cards")).toBeNull();
  expect(screen.getByTestId(ids.editorHint).textContent).toBe("Add a word to share it.");
  tapId(ids.share);
  await flush();
  expect(fake.post).not.toHaveBeenCalled();
  tapId(ids.swatch("green"));
  expect(screen.getByTestId(ids.swatch("green")).getAttribute("accessibility-label")).toBe(
    "Green, selected",
  );
  expect(screen.getByTestId(ids.editor).getAttribute("class")).toContain("my-story-bg-green");
  tapId(ids.toolWords);
  const sheet = screen.getByTestId(ids.composer).textContent;
  expect(sheet).toContain("Add a word");
  expect(sheet).toContain("Tap a word to place it.");
  expect(sheet).not.toContain("Lesson cards");
  expect(screen.queryByTestId("my-stories-tab-card")).toBeNull();
  tapId(ids.choice("w1"));
  tapId(ids.toolWords);
  tapId(ids.choice("w2"));
  expect(screen.queryByTestId(ids.sticker("s1"))).toBeNull();
  expect(screen.getByTestId(ids.sticker("s2")).textContent).toContain("찌개");
  tapId(ids.share);
  await flush();
  expect(fake.post).toHaveBeenCalledWith(expect.objectContaining({ kind: "word", ko: "찌개" }));
});

test("MS-UI33. 스티커 — 고르면 ×로 빼고, 두 손가락으로 크기 · 회전", async () => {
  await mount(fakeMyStories({ guideSeen: true, words, kinds: ["word", "card", "text"] }));
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  tapId(ids.toolWords);
  tapId(ids.choice("w2"));
  const sticker = screen.getByTestId(ids.sticker("s2"));
  act(() => {
    fireEvent.touchstart(sticker, {
      touches: [
        { pageX: 0, pageY: 0 },
        { pageX: 100, pageY: 0 },
      ],
    });
    fireEvent.touchmove(sticker, {
      touches: [
        { pageX: 0, pageY: 0 },
        { pageX: 0, pageY: 200 },
      ],
    });
  });
  expect(screen.getByTestId(ids.sticker("s2")).getAttribute("style")).toContain("scale(2)");
  // ×는 catchtap — 바탕의 「고른 것 풀기」 탭으로 번지지 않게.
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.stickerRemove("s2")), { eventType: "catchEvent" });
  });
  expect(screen.queryByTestId(ids.sticker("s2"))).toBeNull();
  expect(screen.getByTestId(ids.sticker("s1"))).not.toBeNull();
});

test("MS-UI34. 글 서버(text) — Aa → 바탕 위 상자에 쓰기 · 글자색 → Done → 상자(교정 없음) · Share 바로 켜짐 → 글 스토리(쓴 글 그대로 · 앱이 만든 로마자)", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, kinds: ["word", "card", "text"] });
  await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.swatch("purple"));
  tapId(ids.toolText);
  expect(screen.getByTestId(ids.textEntry).textContent).toContain("Korean or English — we'll help");
  tapId(ids.textColor("white"));
  expect(screen.getByTestId(ids.textColor("white")).getAttribute("accessibility-label")).toBe(
    "White, selected",
  );
  act(() => nativeInput("input", "오늘 처음 김치찌개 만들었어", ids.textInput));
  tapId(ids.textDone);
  await flush();
  expect(screen.queryByTestId(ids.textEntry)).toBeNull();
  expect(screen.getByTestId(ids.textBlock).textContent).toBe("오늘 처음 김치찌개만들었어"); // 정해진 두 줄
  expect(screen.getByTestId(ids.editor).textContent).not.toContain("More natural");
  tapId(ids.toolWords);
  expect(screen.getByTestId(ids.composer).textContent).toContain("Up to 8 on one story.");
  tapId(ids.choice("w2"));
  tapId(ids.share);
  await flush();
  const [draft] = fake.postText.mock.calls[0] ?? [];
  expect(draft).toEqual(
    expect.objectContaining({
      background: "purple",
      ko: "오늘 처음 김치찌개 만들었어",
      overlays: [
        expect.objectContaining({ kind: "text", color: "white", x: 0.5, y: 0.3, scale: 1 }),
        expect.objectContaining({ kind: "word", ko: "찌개", x: 0.5, y: 0.55 }),
      ],
      lang: "en",
    }),
  );
  expect(draft).not.toHaveProperty("meaning");
  expect(draft).not.toHaveProperty("original");
  expect(draft?.overlays[0]?.roman).toBe("oneul cheoeum gimchijjigae mandeureosseo");
  expect(draft?.overlays[0]).not.toHaveProperty("meaning");
  expect(fake.post).not.toHaveBeenCalled();
  // 올린 글 스토리 보기 — 바탕 · 글 · 얹은 단어
  const card = screen.getByTestId(ids.storyBackground);
  expect(card.getAttribute("class")).toContain("my-story-bg-purple");
  expect(card.textContent).toContain("찌개");
});

test("MS-UI35. 올리기 검수의 위기 신호(crisis) — 올리지 않고 위기 안내 카드 · post_failed(crisis), 상자를 다시 누르면 고쳐 쓰기", async () => {
  const fake = fakeMyStories({ guideSeen: true, kinds: ["word", "card", "text"] });
  fake.postText.mockResolvedValueOnce({
    result: "crisis",
    resources: [{ name: "Helpline", phone: "1393", url: null, hours: "24/7" }],
  });
  const { events } = await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "힘들어", ids.textInput));
  tapId(ids.textDone);
  await flush();
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(chatIds.crisis).textContent).toContain("Helpline");
  expect(events().filter((e) => e.name === "my_story_post_failed")).toEqual([
    expect.objectContaining({ reason: "crisis" }),
  ]);
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.textBlock), { eventType: "catchEvent" });
  });
  expect(screen.getByTestId(ids.textEntry)).not.toBeNull();
});

test("MS-UI36. 글 스토리 올리기가 text_blocked면 편집에 안내 · post_failed(text_blocked)", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, kinds: ["word", "card", "text"] });
  fake.postText.mockResolvedValueOnce({ result: "text_blocked" });
  const { events } = await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "안녕", ids.textInput));
  tapId(ids.textDone);
  await flush();
  expect(screen.getByTestId(ids.textBlock).textContent).toContain("안녕");
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "This text can't be shared. Try different words.",
  );
  expect(events().filter((e) => e.name === "my_story_post_failed")).toEqual([
    expect.objectContaining({ reason: "text_blocked" }),
  ]);
});

test("MS-UI37. 올리기 포트가 던져도 실패 안내 · 다시 Share할 수 있다(리뷰 지적)", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, kinds: ["word", "card", "text"] });
  fake.postText.mockRejectedValueOnce(new Error("network"));
  await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "안녕", ids.textInput));
  tapId(ids.textDone);
  await flush();
  tapId(ids.share);
  await flush();
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "Couldn't share your story. Try again.",
  );
  tapId(ids.share);
  await flush();
  expect(fake.postText).toHaveBeenCalledTimes(2);
});

test("MS-UI38. 새 서버(#598 — kinds text · photo) — Aa · Words 둘 다, 단어 하나만 얹어도 색 바탕 스토리로 올리고, check_limit이면 안내", async () => {
  const fake = fakeMyStories({ guideSeen: true, words, kinds: ["text", "photo"] });
  fake.postText.mockResolvedValueOnce({ result: "check_limit" });
  await mount(fake);
  tapId(ids.create);
  tapId(ids.startBackground);
  expect(screen.getByTestId(ids.toolText)).not.toBeNull();
  tapId(ids.toolWords);
  tapId(ids.choice("w2"));
  tapId(ids.share);
  await flush();
  expect(fake.post).not.toHaveBeenCalled();
  expect(fake.postText).toHaveBeenCalledWith(
    expect.objectContaining({
      ko: "",
      overlays: [expect.objectContaining({ kind: "word", ko: "찌개" })],
    }),
  );
  expect(screen.getByTestId(ids.composerError).textContent).toBe(
    "You've tried enough for today. Try again tomorrow.",
  );
});

/** 글 상자 입력 칸이 키보드 높이를 알립니다(iOS pt · Lynx `keyboardheightchange`). */
function typingKeyboard(height: number): void {
  const EventConstructor = screen.getByTestId(ids.textInput).ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(`[data-testid="${ids.textInput}"]`);
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:keyboardheightchange", { detail: { height } }),
  );
}

test("MS-UI39. Aa 쓰는 동안 키보드가 오르면 글 상자를 키보드 바로 위로(키보드 높이 + 틈), 내리면 원래 자리", async () => {
  await mount(fakeMyStories({ guideSeen: true, words, kinds: ["text", "photo"] }));
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  // 글 상자 묶음(입력 칸의 상자 · 묶음)이 키보드 바로 위(키보드 높이 + 틈)에 섭니다.
  const group = () =>
    screen.getByTestId(ids.textInput).parentElement?.parentElement?.getAttribute("style") ?? "";
  expect(group()).toContain("bottom: auto");
  act(() => typingKeyboard(336));
  expect(group()).toContain("position: absolute");
  expect(group()).toContain("bottom: 348px");
  // 글자색 줄 · Done은 위에 그대로
  expect(screen.getByTestId(ids.textDone)).not.toBeNull();
  act(() => typingKeyboard(0));
  expect(group()).toContain("bottom: auto");
  expect(group()).toContain("position: relative");
});

test("MS-UI40. 글 상자 크기 A안 — 정해진 줄마다 글자 크기로 그리고(22px · 줄 둘), transform은 회전 · 끄는 몫(1)만", async () => {
  await mount(fakeMyStories({ guideSeen: true, words, kinds: ["text", "photo"] }));
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "오늘 처음 김치찌개 만들었어", ids.textInput));
  tapId(ids.textDone);
  await flush();
  const box = screen.getByTestId(ids.textBlock);
  expect(box.getAttribute("style")).toContain("scale(1)");
  expect(box.getAttribute("style")).toContain("padding: 8px 14px");
  const lines = [...box.querySelectorAll("text")].filter((el) =>
    (el.getAttribute("style") ?? "").includes("font-size"),
  );
  expect(lines.map((el) => el.textContent)).toEqual(["오늘 처음 김치찌개", "만들었어"]);
  expect(lines[0]?.getAttribute("style")).toContain("font-size: 22px");
});

test("MS-UI41. 글 상자 끝단 — 두 손가락으로 크게 해도 상자가 바탕 폭(좌우 여백 · 오른쪽 도구 열 뺌) 안에서 멈추고(끄는 중에도), 손을 떼면 그 크기로 확정", async () => {
  await mount(fakeMyStories({ guideSeen: true, words, kinds: ["text", "photo"] }));
  tapId(ids.create);
  tapId(ids.startBackground);
  tapId(ids.toolText);
  act(() => nativeInput("input", "오늘 처음 김치찌개 만들었어", ids.textInput));
  tapId(ids.textDone);
  await flush();
  const canvas = screen.getByTestId(ids.stickers);
  const EventConstructor = canvas.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  act(() => {
    fireEvent(
      canvas,
      new EventConstructor("bindEvent:layoutchange", { detail: { width: 390, height: 700 } }),
    );
  });
  const box = () => screen.getByTestId(ids.textBlock);
  act(() => {
    fireEvent.touchstart(box(), {
      touches: [
        { pageX: 0, pageY: 0 },
        { pageX: 100, pageY: 0 },
      ],
    });
    fireEvent.touchmove(box(), {
      touches: [
        { pageX: 0, pageY: 0 },
        { pageX: 400, pageY: 0 },
      ],
    });
  });
  // 4배를 바랐지만 확정 1의 상자(221.2px)를 키운 폭이 390 − 72 − 64 = 254에 닿는 1.148에서 멈춤
  expect(box().getAttribute("style")).toContain("scale(1.148)");
  act(() => {
    fireEvent.touchend(box(), { touches: [] });
  });
  expect(box().getAttribute("style")).toContain("scale(1)");
  const [first] = [...box().querySelectorAll("text")].filter((el) =>
    (el.getAttribute("style") ?? "").includes("font-size"),
  );
  expect(first?.getAttribute("style")).toContain("font-size: 25.256px");
});
