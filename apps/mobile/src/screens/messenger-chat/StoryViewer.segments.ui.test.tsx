import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { advance, clearBackHandlers, fireOnRef, tapId } from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryViewerItem,
  type StoryViewerProps,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { StoryViewer } from "./StoryViewer";

// `ui` 계층(FS-UI23 ~ UI26): 인물 기준 진행 막대 · 탭 이동 · 가로 넘김(ADR-0178 D4 개정, 인스타 방식).

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const item = (id: string, characterId: string, name: string): StoryViewerItem => ({
  story: story(characterId, { id }),
  name,
  avatarUrl: null,
  imageUrl: null,
  unmet: null,
});

// 윤경 둘 → 해준 하나.
const ITEMS = [item("a1", "a", "윤경"), item("a2", "a", "윤경"), item("b1", "b", "해준")];

function mount(over: Partial<StoryViewerProps> = {}) {
  const props: StoryViewerProps = {
    items: ITEMS,
    start: 0,
    now: STORY_NOW,
    reducedMotion: false,
    romanization: true,
    keyboardHeight: 300,
    onShown: vi.fn(),
    onReply: vi.fn(async () => ({ kind: "sent" as const })),
    onOpenChat: vi.fn(),
    onSaveWord: vi.fn(),
    onMeet: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<StoryViewer {...props} />);
  return props;
}

const name = () => screen.getByTestId(ids.name).textContent;
const progress = () => screen.getByTestId(ids.progress).getAttribute("accessibility-label");
const swipe = (fromX: number, toX: number) => {
  fireOnRef(ids.taps, "touchstart", { x: fromX, y: 400 });
  fireOnRef(ids.taps, "touchend", { x: toX, y: 410 });
};

test("FS-UI23. 진행 막대는 지금 인물의 스토리 수만큼 — 다른 인물 스토리는 넣지 않는다", () => {
  mount();
  expect(screen.queryByTestId(ids.segment(0))).not.toBeNull();
  expect(screen.queryByTestId(ids.segment(1))).not.toBeNull();
  expect(screen.queryByTestId(ids.segment(2))).toBeNull();
  expect(progress()).toBe("Story 1 of 2");
  tapId(ids.next);
  expect(name()).toBe("윤경");
  expect(progress()).toBe("Story 2 of 2");
  tapId(ids.next);
  expect(name()).toBe("해준");
  expect(progress()).toBe("Story 1 of 1");
  expect(screen.queryByTestId(ids.segment(1))).toBeNull();
});

test("FS-UI24. 왼쪽 탭 — 그 인물의 첫 장이면 이전 인물의 마지막 장", () => {
  mount({ start: 2 });
  tapId(ids.previous);
  expect(name()).toBe("윤경");
  expect(progress()).toBe("Story 2 of 2");
});

test("FS-UI25. 왼쪽으로 밀면 다음 인물, 오른쪽으로 밀면 이전 인물의 첫 장 — 마지막 인물에서 밀면 닫힘", () => {
  const props = mount();
  swipe(300, 80);
  expect(name()).toBe("해준");
  swipe(80, 300);
  expect(name()).toBe("윤경");
  expect(progress()).toBe("Story 1 of 2");
  // 짧게 움직인 것은 넘김이 아니다.
  swipe(200, 180);
  expect(name()).toBe("윤경");
  swipe(300, 80);
  swipe(300, 80);
  expect(props.onClose).toHaveBeenCalledWith("completed");
});

test("FS-UI26. 인물이 바뀌면 옆으로 미끄러지고(방향), 모션 줄이기면 전환 없이 바뀐다 · 6초 넘김은 그대로", () => {
  mount();
  expect(screen.getByTestId(ids.content).getAttribute("data-slide")).toBe("none");
  swipe(300, 80);
  expect(screen.getByTestId(ids.content).getAttribute("data-slide")).toBe("next");
  swipe(80, 300);
  expect(screen.getByTestId(ids.content).getAttribute("data-slide")).toBe("prev");
  cleanup();
  mount({ reducedMotion: true });
  swipe(300, 80);
  expect(name()).toBe("해준");
  expect(screen.getByTestId(ids.content).getAttribute("data-slide")).toBe("none");
});

test("FS-UI26. 6초마다 다음 장 — 인물을 넘어 이어 간다", () => {
  mount();
  advance(6_000);
  expect(progress()).toBe("Story 2 of 2");
  advance(6_000);
  expect(name()).toBe("해준");
});
