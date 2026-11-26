import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import { myStoriesTestIds as ids, type MyStory, type ReactionFace } from "./my-stories.contract";
import { MS_NOW, myStory, reaction } from "./my-stories.test-support";
import type { MyStoryViewerMine } from "./my-story-viewer.contract";
import { MyStoryRepliesSheet, MyStoryViewerBottom } from "./MyStoryViewerBar";

// `ui` 계층(MV-UI1 ~ UI5): 내 스토리 전체 화면 보기의 아래 바 · 새 답 줄 · 답 목록 시트(ADR-0194 개정 ⟨보기⟩, 시안 34 ~ 36번).

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const FACES: Record<string, ReactionFace> = {
  mina: { name: "미나", avatarUrl: null },
  haejun: { name: "해준", avatarUrl: null },
  gunwoo: { name: "건우", avatarUrl: null },
  yun: { name: "윤경", avatarUrl: null },
};

function mine(over: Partial<MyStoryViewerMine> = {}): MyStoryViewerMine {
  return {
    face: (id) => FACES[id] ?? null,
    hasFriends: true,
    onOpenChat: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
}

const replied = (): MyStory =>
  myStory("s1", {
    reactions: [
      reaction("r1", "yun", { text: "와, 서울에 온 걸 환영해!", at: MS_NOW - 52 * 60_000 }),
      reaction("r2", "haejun", { text: "창가 자리 부럽다.", at: MS_NOW - 31 * 60_000 }),
      reaction("r3", "gunwoo", { text: "도착하면 한강 가자!", at: MS_NOW - 5 * 60_000 }),
    ],
    seenBy: ["yun", "haejun", "gunwoo", "mina"].map((characterId) => ({ characterId, at: MS_NOW })),
  });

function mountBottom(story: MyStory, over: Partial<MyStoryViewerMine> = {}) {
  const props = { story, mine: mine(over), onReplies: vi.fn() };
  render(<MyStoryViewerBottom {...props} />);
  return props;
}

test("MV-UI1. 답이 있으면 최근 2줄(최신이 아래, 얼굴 · 이름 · 한국어 한 줄) — 누르면 그 친구 방, 바는 Seen by 4 · 얼굴 3 · 위로 밀기 안내", () => {
  const story = replied();
  const props = mountBottom(story);
  const lines = screen.getAllByTestId(/my-stories-reply-line-/);
  expect(lines.map((line) => line.getAttribute("data-testid"))).toEqual([
    ids.replyLine("r2"),
    ids.replyLine("r3"),
  ]);
  expect(lines[1]?.textContent).toContain("건우");
  expect(lines[1]?.textContent).toContain("도착하면 한강 가자!");
  expect(lines[1]?.getAttribute("accessibility-traits")).toBe("button");
  expect(lines[1]?.getAttribute("accessibility-label")).toContain("Open chat with 건우");
  tapId(ids.replyLine("r3"));
  expect(props.mine.onOpenChat).toHaveBeenCalledWith(story.reactions[2]);
  const seen = screen.getByTestId(ids.barSeen);
  expect(seen.textContent).toContain("Seen by 4");
  expect(screen.getByTestId(ids.barSwipeHint).textContent).toBe("Swipe up for replies");
  expect(seen.getAttribute("accessibility-label")).toBe("Seen by 4 friends, Show replies");
  expect(seen.getAttribute("accessibility-traits")).toBe("button");
  expect(seen.querySelectorAll(`[data-testid='${ids.barFace}']`).length).toBe(3);
  tapId(ids.barSeen);
  expect(props.onReplies).toHaveBeenCalledTimes(1);
});

test("MV-UI2. 「+」은 만들기, 지우기는 그 스토리 — 둘 다 낭독 이름이 있는 단추", () => {
  const story = replied();
  const props = mountBottom(story);
  expect(screen.getByTestId(ids.barAdd).getAttribute("accessibility-label")).toBe("New story");
  expect(screen.getByTestId(ids.barDelete).getAttribute("accessibility-label")).toBe(
    "Delete story",
  );
  tapId(ids.barAdd);
  expect(props.mine.onCreate).toHaveBeenCalledTimes(1);
  tapId(ids.barDelete);
  expect(props.mine.onDelete).toHaveBeenCalledWith(story);
});

test("MV-UI3. 답이 0개면 줄 자리에 한 시간 안내, 본 사람이 없으면 「No views yet」 · 밀기 안내 없음", () => {
  mountBottom(myStory("s0"));
  expect(screen.queryAllByTestId(/my-stories-reply-line-/)).toEqual([]);
  expect(screen.getByTestId(ids.barWaiting).textContent).toBe(
    "Friends usually reply within an hour.",
  );
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("No views yet");
  expect(screen.queryByTestId(ids.barSwipeHint)).toBeNull();
  expect(screen.queryByTestId(ids.barNoFriends)).toBeNull();
});

test("MV-UI4. 친구가 0명이면 「Add a friend to get replies」 — 친구 찾기가 있으면 누를 수 있다", () => {
  const onFindFriends = vi.fn();
  mountBottom(myStory("s0"), { hasFriends: false, onFindFriends });
  expect(screen.queryByTestId(ids.barWaiting)).toBeNull();
  const note = screen.getByTestId(ids.barNoFriends);
  expect(note.textContent).toBe("Add a friend to get replies");
  expect(note.getAttribute("accessibility-traits")).toBe("button");
  tapId(ids.barNoFriends);
  expect(onFindFriends).toHaveBeenCalledTimes(1);
});

test("MV-UI5. 위로 밀면 답 목록 — 짧거나 아래 · 옆으로 민 것은 아니다", () => {
  const props = mountBottom(replied());
  const group = screen.getByTestId(ids.bar);
  fireEvent.touchstart(group, { detail: { x: 100, y: 600 } });
  fireEvent.touchend(group, { detail: { x: 104, y: 570 } });
  fireEvent.touchstart(group, { detail: { x: 100, y: 600 } });
  fireEvent.touchend(group, { detail: { x: 100, y: 680 } });
  fireEvent.touchstart(group, { detail: { x: 100, y: 600 } });
  fireEvent.touchend(group, { detail: { x: 220, y: 540 } });
  expect(props.onReplies).not.toHaveBeenCalled();
  fireEvent.touchstart(group, { detail: { x: 100, y: 600 } });
  fireEvent.touchend(group, { detail: { x: 110, y: 520 } });
  expect(props.onReplies).toHaveBeenCalledTimes(1);
});

test("MV-UI6. 답 목록 시트 — 제목 「3 friends replied」 · Seen by · 반응마다 Open chat · 저장 안내, 닫기 · 시스템 뒤로 = 닫힘", () => {
  const story = replied();
  const props = { story, now: MS_NOW, mine: mine(), onClose: vi.fn() };
  render(<MyStoryRepliesSheet {...props} />);
  const sheet = screen.getByTestId(ids.repliesSheet);
  expect(sheet.textContent).toContain("3 friends replied");
  expect(screen.getByTestId(ids.seenBy).getAttribute("accessibility-label")).toBe(
    "Seen by 4 friends",
  );
  expect(screen.getByTestId(ids.reaction("r3")).textContent).toContain("도착하면 한강 가자!");
  expect(screen.getByTestId(ids.savedNote).textContent).toBe(
    "Replies are saved in each friend's chat.",
  );
  tapId(ids.openChat("r1"));
  expect(props.mine.onOpenChat).toHaveBeenCalledWith(story.reactions[0]);
  tapId("ui-lynx-bottom-sheet-close");
  expect(props.onClose).toHaveBeenCalledTimes(1);
  expect(systemBack()).toBe(true);
  expect(props.onClose).toHaveBeenCalledTimes(2);
});

test("MV-UI6. 답이 없는 시트 — 「No replies yet」 · 한 시간 안내, 친구 0명이면 친구 추가 안내", () => {
  render(
    <MyStoryRepliesSheet
      story={myStory("s0")}
      now={MS_NOW}
      mine={mine({ hasFriends: false })}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByTestId(ids.repliesSheet).textContent).toContain("No replies yet");
  expect(screen.getByTestId(ids.waiting)).not.toBeNull();
  expect(screen.getByTestId(ids.noFriends)).not.toBeNull();
});
