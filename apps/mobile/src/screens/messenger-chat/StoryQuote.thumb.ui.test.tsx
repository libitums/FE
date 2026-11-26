import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { tapButtonIn, tapId } from "./chat-ui.test-support";
import { ChatStoryHostContext } from "./chat-story-host-context";
import {
  chatStoryThumbTestIds as thumbIds,
  type ChatStoryHost,
  type ChatStoryLookup,
} from "./chat-story-thumb.contract";
import { ChatStoryEndedSheet } from "./ChatStoryThumb";
import { friendStoriesTestIds as ids, type ChatStoryQuote } from "./friend-stories.contract";
import { HOUR_MS, story, STORY_NOW } from "./friend-stories.test-support";
import { myStoriesTestIds as msIds } from "./my-stories.contract";
import { myStory } from "./my-stories.test-support";
import { StoryImageContext } from "./story-image-context";
import { StoryQuoteCard } from "./StoryQuote";

// `ui` 계층(CT-UI1 ~ UI8): 대화방 스토리 인용 판(ADR-0178 D5 개정 ⟨판⟩ · ADR-0194 개정 ⟨판⟩, 시안 37 ~ 39 · 40a · 40) — 올린 그대로
// 9:16 작은 판(인물의 반응 위 118 · 내 답 위 96), 누르면 결선의 open, 지난 친구 스토리는 「Ended」, 지운 것은 회색 판.

afterEach(cleanup);

const NOW = STORY_NOW;
const EMPTY: ChatStoryLookup = { mine: null, friends: null, deleted: new Set() };

const mineQuote: ChatStoryQuote = {
  storyId: "ms-1",
  characterId: "mina",
  line: "서울에 도착했어!",
  imagePath: null,
  postedAt: NOW - HOUR_MS,
  kind: "mine",
};
const friendQuote: ChatStoryQuote = {
  storyId: "s-mina",
  characterId: "mina",
  line: "야근 끝! 편의점 라면이 최고야",
  imagePath: "content/images/mina.webp",
  postedAt: NOW - 2 * HOUR_MS,
};

function hostWith(lookup: Partial<ChatStoryLookup>, extra: Partial<ChatStoryHost> = {}) {
  return {
    lookup: { ...EMPTY, ...lookup },
    need: vi.fn(),
    open: vi.fn(),
    ...extra,
  } satisfies ChatStoryHost;
}

function renderCard(
  quote: ChatStoryQuote,
  host: ChatStoryHost | null,
  from: "me" | "them" = "them",
) {
  return render(
    <StoryImageContext.Provider value={(path) => `https://cdn/${path}`}>
      <ChatStoryHostContext.Provider value={host}>
        <StoryQuoteCard quote={quote} name="미나" now={NOW} from={from} />
      </ChatStoryHostContext.Provider>
    </StoryImageContext.Provider>,
  );
}

const thumb = () => screen.getByTestId(thumbIds.thumb);

test("CT-UI1 내 글 스토리 — 바탕색 · 얹은 글을 같은 카드로 축소(118 판), 버튼 낭독 「Open story」, 누르면 open", () => {
  const posted = myStory("ms-1", {
    kind: "text",
    background: "purple",
    word: null,
    ko: "오늘 처음으로 떡볶이 만들었어",
    overlays: [
      { kind: "text", ko: "오늘 처음으로 떡볶이 만들었어", x: 0.5, y: 0.4, scale: 1, rotation: 0 },
    ],
  });
  const host = hostWith({ mine: [posted] });
  renderCard(mineQuote, host);
  const card = screen.getByTestId(ids.quote);
  expect(card.textContent).toContain("Replied to your story");
  expect(thumb().getAttribute("class")).toContain("chat-story-thumb-in");
  expect(thumb().querySelector(".my-story-bg-purple")).not.toBeNull();
  expect(thumb().textContent).toContain("떡볶이");
  expect(card.getAttribute("accessibility-traits")).toBe("button");
  expect(card.getAttribute("accessibility-label")).toBe(
    "Replied to your story: 서울에 도착했어!, Story · 1h, Open story",
  );
  expect(host.need).toHaveBeenCalledWith("mine");
  tapId(ids.quote);
  expect(host.open).toHaveBeenCalledWith(mineQuote);
});

test("CT-UI2 내 사진 스토리 — 결선의 서명 주소로 사진을 그림", async () => {
  const posted = myStory("ms-1", { kind: "photo", imagePath: "u/p.jpg", word: null });
  const photoUrl = vi.fn(async (path: string) => `https://signed/${path}`);
  renderCard(mineQuote, hostWith({ mine: [posted] }, { photoUrl }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(photoUrl).toHaveBeenCalledWith("u/p.jpg");
  expect(thumb().querySelector(`[data-testid="${msIds.storyPhoto}"]`)?.getAttribute("src")).toBe(
    "https://signed/u/p.jpg",
  );
});

test("CT-UI3 목록에 없는 내 스토리 · 결선 없음 — 주황 바탕 + 한 줄, 누를 수 없음", () => {
  for (const host of [hostWith({ mine: [] }), null]) {
    renderCard(mineQuote, host);
    expect(thumb().querySelector(".my-story-bg-orange")).not.toBeNull();
    expect(thumb().textContent).toContain("서울에 도착했어!");
    const card = screen.getByTestId(ids.quote);
    expect(card.getAttribute("accessibility-traits")).toBeNull();
    expect(card.getAttribute("accessibility-label")).not.toContain("Open");
    tapId(ids.quote);
    if (host !== null) expect(host.open).not.toHaveBeenCalled();
    cleanup();
  }
});

test("CT-UI4 내가 단 친구 스토리 답 — 그림을 96 판 가득, 「Open story」, 누르면 open", () => {
  const host = hostWith({ friends: [story("mina")] });
  renderCard(friendQuote, host, "me");
  const card = screen.getByTestId(ids.quote);
  expect(card.textContent).toContain("You replied to 미나's story");
  expect(thumb().getAttribute("class")).toContain("chat-story-thumb-out");
  expect(thumb().querySelector("image")?.getAttribute("src")).toBe(
    "https://cdn/content/images/mina.webp",
  );
  expect(screen.queryByTestId(thumbIds.ended)).toBeNull();
  expect(card.getAttribute("accessibility-label")).toBe(
    "You replied to 미나's story: 야근 끝! 편의점 라면이 최고야, Story · 2h, Open story",
  );
  expect(host.need).toHaveBeenCalledWith("friend");
  tapId(ids.quote);
  expect(host.open).toHaveBeenCalledWith(friendQuote);
});

test("CT-UI5 24시간 지난 친구 스토리 — 판은 그대로(흐리게) + 「Ended」, 버튼이고 누르면 open(시트는 결선)", () => {
  const old = { ...friendQuote, postedAt: NOW - 30 * HOUR_MS };
  const host = hostWith({});
  renderCard(old, host, "me");
  expect(thumb().querySelector("image")).not.toBeNull();
  expect(screen.getByTestId(thumbIds.ended).textContent).toContain("Ended");
  const card = screen.getByTestId(ids.quote);
  expect(card.getAttribute("accessibility-traits")).toBe("button");
  expect(card.getAttribute("accessibility-label")).toContain(", Ended");
  tapId(ids.quote);
  expect(host.open).toHaveBeenCalledWith(old);
});

test("CT-UI6 지운 스토리 — 회색 판 「Deleted story」, 누름 없음 · 목록을 받지 않음", () => {
  const host = hostWith({});
  const deleted = { ...mineQuote, storyId: "", line: "", postedAt: null, kind: "deleted" as const };
  renderCard(deleted, host);
  expect(thumb().textContent).toContain("Deleted story");
  const card = screen.getByTestId(ids.quote);
  expect(card.getAttribute("accessibility-label")).toBe("Reply to a deleted story");
  expect(card.getAttribute("accessibility-traits")).toBeNull();
  tapId(ids.quote);
  expect(host.open).not.toHaveBeenCalled();
  expect(host.need).not.toHaveBeenCalled();
});

test("CT-UI7 이 방에서 막 지운 내 스토리도 회색 판", () => {
  renderCard(mineQuote, hostWith({ mine: [myStory("ms-1")], deleted: new Set(["ms-1"]) }));
  expect(thumb().textContent).toContain("Deleted story");
});

test("CT-UI8 지난 스토리 안내 시트 — 제목 · 설명 · OK, 시스템 뒤로도 닫힘", () => {
  const onClose = vi.fn();
  render(<ChatStoryEndedSheet onClose={onClose} />);
  const sheet = screen.getByTestId(thumbIds.endedSheet);
  expect(sheet.textContent).toContain("This story has ended");
  expect(sheet.textContent).not.toContain("Past stories");
  tapButtonIn("ui-lynx-bottom-sheet-action-ok");
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => {
    backHandlers.runTop();
  });
  expect(onClose).toHaveBeenCalledTimes(2);
});
