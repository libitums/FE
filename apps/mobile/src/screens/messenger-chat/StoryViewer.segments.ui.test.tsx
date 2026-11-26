import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { advance, clearBackHandlers, tapId } from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryViewerItem,
  type StoryViewerProps,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { StoryViewer } from "./StoryViewer";

// `ui` 계층(FS-UI28 ~ UI31): 인물 기준 진행 막대 · 탭 이동 · 가로 넘김(ADR-0178 D4 개정, 인스타 방식).

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
    onProfile: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<StoryViewer {...props} />);
  return props;
}

const name = () => screen.getByTestId(ids.name).textContent;
const progress = () => screen.getByTestId(ids.progress).getAttribute("accessibility-label");
/** 가로로 밀고 놓은 뒤 큐브가 다 돌 때까지 기다립니다(메인 스레드 이벤트 — 큐브 FS-UI32 ~ UI39). */
const swipe = (fromX: number, toX: number) => {
  const taps = screen.getByTestId(ids.taps);
  act(() => {
    fireEvent.touchstart(taps, { detail: { x: fromX, y: 400 } });
  });
  act(() => {
    fireEvent.touchend(taps, { detail: { x: toX, y: 410 } });
  });
  advance(400);
};

test("FS-UI28. 진행 막대는 지금 인물의 스토리 수만큼 — 다른 인물 스토리는 넣지 않는다", () => {
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

test("FS-UI29. 왼쪽 탭 — 그 인물의 첫 장이면 이전 인물의 마지막 장", () => {
  mount({ start: 2 });
  tapId(ids.previous);
  expect(name()).toBe("윤경");
  expect(progress()).toBe("Story 2 of 2");
});

test("FS-UI30. 왼쪽으로 밀면 다음 인물, 오른쪽으로 밀면 이전 인물의 첫 장 — 마지막 인물에서 밀면 닫힘", () => {
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

test("FS-UI31. 인물이 바뀌면 큐브가 돌고(방향), 모션 줄이기면 전환 없이 바뀐다", () => {
  const turn = () => screen.getByTestId(ids.viewer).getAttribute("data-turn");
  mount({ start: 1 });
  expect(turn()).toBe("none");
  tapId(ids.next);
  expect(turn()).toBe("next");
  advance(400);
  tapId(ids.previous);
  expect(turn()).toBe("prev");
  cleanup();
  mount({ reducedMotion: true });
  swipe(300, 80);
  expect(name()).toBe("해준");
  expect(turn()).toBe("none");
});

test("FS-UI31. 6초마다 다음 장 — 인물을 넘어 이어 간다", () => {
  mount();
  advance(6_000);
  expect(progress()).toBe("Story 2 of 2");
  advance(6_000);
  expect(name()).toBe("해준");
});
