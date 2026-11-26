import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { advance, clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryViewerItem,
  type StoryViewerProps,
} from "./friend-stories.contract";
import { myStoriesTestIds as myIds, type MyStory } from "./my-stories.contract";
import { MS_HOUR, MS_NOW, myStory, reaction } from "./my-stories.test-support";
import { myViewerItemsOf } from "./my-story-viewer";
import type { MyStoryViewerMine } from "./my-story-viewer.contract";
import { StoryViewer } from "./StoryViewer";

// `ui` 계층(MV-UI7 ~ UI11): 스토리 보기에 선 내 스토리(ADR-0194 개정 ⟨보기⟩) — 답장 칸 대신 아래 바, ⋯ 메뉴, 시트가 열리면 멈춤,
// 글 · 사진은 화면 가득, 막대 · 탭은 친구 스토리와 같음.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const word = myStory("w", {
  postedAt: MS_NOW - 3 * MS_HOUR,
  reactions: [reaction("r1", "mina")],
  seenBy: [{ characterId: "mina", at: MS_NOW }],
});
const text = myStory("t", {
  kind: "text",
  word: null,
  ko: "서울에 도착했어!",
  roman: "",
  meaning: "I arrived in Seoul!",
  example: null,
  background: "green",
  postedAt: MS_NOW - MS_HOUR,
});

function mount(stories: readonly MyStory[] = [word, text], over: Partial<StoryViewerProps> = {}) {
  const opened = myViewerItemsOf(stories, stories[0]?.id ?? "", MS_NOW, "Your story");
  const mine: MyStoryViewerMine = {
    face: (id) => (id === "mina" ? { name: "미나", avatarUrl: null } : null),
    hasFriends: true,
    onOpenChat: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
  };
  const props: StoryViewerProps = {
    items: opened?.items ?? [],
    start: opened?.start ?? 0,
    now: MS_NOW,
    reducedMotion: false,
    romanization: true,
    keyboardHeight: 0,
    onShown: vi.fn(),
    onReply: vi.fn(async () => ({ kind: "sent" as const })),
    onOpenChat: vi.fn(),
    onSaveWord: vi.fn(),
    onMeet: vi.fn(),
    onProfile: vi.fn(),
    onClose: vi.fn(),
    mine,
    ...over,
  };
  render(<StoryViewer {...props} />);
  return { props, mine };
}

const shownIds = (props: StoryViewerProps) =>
  (props.onShown as ReturnType<typeof vi.fn>).mock.calls.map(
    ([item]) => (item as StoryViewerItem).story.id,
  );

test("MV-UI7. 내 스토리 장 — 답장 칸 · 칩 대신 아래 바, 이름은 「Your story」(낭독도 그대로), 아바타는 프로필 단추가 아니다", () => {
  const { props } = mount();
  expect(screen.queryByTestId(ids.replyInput)).toBeNull();
  expect(screen.queryByTestId(ids.chip(0))).toBeNull();
  expect(screen.getByTestId(myIds.bar)).not.toBeNull();
  expect(screen.getByTestId(myIds.replyLine("r1")).textContent).toContain("미나");
  expect(screen.getByTestId(ids.name).textContent).toBe("Your story");
  expect(screen.getByTestId(ids.name).getAttribute("accessibility-label")).toBe(
    "Your story, Story 1 of 2",
  );
  expect(screen.getByTestId(ids.profile).getAttribute("accessibility-traits")).toBeNull();
  tapId(ids.profile);
  expect(props.onProfile).not.toHaveBeenCalled();
  // 단어 스토리는 한 줄 카드 그대로(한국어 · 로마자 · 뜻), 단어 알약은 없습니다.
  expect(screen.getByTestId(ids.line).textContent).toBe("야근");
  expect(screen.queryByTestId(ids.word)).toBeNull();
});

test("MV-UI8. 막대 · 탭 · 6초 넘김은 친구 스토리와 같다 — 내 스토리 수만큼 막대, 다음 탭 · 이전 탭", () => {
  const { props } = mount();
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 2");
  tapId(ids.next);
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 2 of 2");
  tapId(ids.previous);
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 2");
  advance(6_000);
  expect(shownIds(props)).toEqual(["w", "t", "w", "t"]);
});

test("MV-UI9. 「Seen by」를 누르면 답 목록 시트 — 열린 동안 멈추고, 닫으면 이어 간다", () => {
  const { props } = mount();
  tapId(myIds.barSeen);
  expect(screen.getByTestId(myIds.repliesSheet)).not.toBeNull();
  expect(screen.getByTestId(ids.viewer).getAttribute("accessibility-elements-hidden")).toBe("true");
  advance(20_000);
  expect(shownIds(props)).toEqual(["w"]);
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(myIds.repliesSheet)).toBeNull();
  advance(6_000);
  expect(shownIds(props)).toEqual(["w", "t"]);
});

test("MV-UI10. ⋯ 메뉴 → Delete story는 그 장의 스토리, 메뉴가 열린 동안 멈춤", () => {
  const { props, mine } = mount();
  tapId(myIds.viewerMenu);
  expect(screen.getByTestId(myIds.viewerMenu).getAttribute("accessibility-label")).toBe(
    "Story options",
  );
  advance(20_000);
  expect(shownIds(props)).toEqual(["w"]);
  tapId(myIds.viewerDelete);
  expect(mine.onDelete).toHaveBeenCalledWith(word);
  expect(screen.queryByTestId(myIds.viewerDelete)).toBeNull();
});

test("MV-UI11. 글 스토리는 바탕색 · 글을 화면 가득(한 줄 카드 없음), 답이 없으면 한 시간 안내", () => {
  mount([text]);
  expect(screen.getByTestId(myIds.storyBackground).getAttribute("class")).toContain(
    "my-story-bg-green",
  );
  expect(screen.getByTestId(myIds.cardKo).textContent).toBe("서울에 도착했어!");
  expect(screen.queryByTestId(ids.line)).toBeNull();
  expect(screen.getByTestId(myIds.barWaiting)).not.toBeNull();
  expect(screen.getByTestId(myIds.barSeen).textContent).toContain("No views yet");
});

test("MV-UI12. 친구 스토리 장에는 아래 바가 없다(mine을 받아도)", () => {
  mount([word], {
    items: [
      {
        story: {
          id: "f",
          characterId: "mina",
          postedAt: MS_NOW - MS_HOUR,
          expiresAt: MS_NOW + MS_HOUR,
          imagePath: "",
          line: { ko: "안녕", roman: "annyeong", meaning: { en: "Hi" } },
          word: null,
          replies: ["좋아!"],
          freeReply: false,
        },
        name: "미나",
        avatarUrl: null,
        imageUrl: null,
        unmet: null,
      },
    ],
  });
  expect(screen.queryByTestId(myIds.bar)).toBeNull();
  expect(screen.getByTestId(ids.replyInput)).not.toBeNull();
  expect(screen.queryByTestId(myIds.viewerMenu)).toBeNull();
});
