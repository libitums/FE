import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, tapEl } from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryViewerItem,
  type StoryViewerProps,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { StoryViewer } from "./StoryViewer";

// `ui` 계층(FS-UI44 ~ UI46): 탭 자리(ADR-0178 D4 개정 ⟨탭 자리⟩) — 누를 수 있는 요소를 뺀 화면 어디를 눌러도 넘기고, 경계는 화면 가운데.
// 시험 환경은 창 폭을 몰라 큐브와 같은 기본 폭 390을 씁니다 — 가운데 = 195.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const item = (id: string, name: string): StoryViewerItem => ({
  story: story("a", { id }),
  name,
  avatarUrl: null,
  imageUrl: `https://cdn/${id}.webp`,
  unmet: null,
});

// 한 인물의 스토리 셋 — 가운데 장(2 of 3)에서 시작합니다.
const ITEMS = [item("a1", "윤경"), item("a2", "윤경"), item("a3", "윤경")];

function mount() {
  const props: StoryViewerProps = {
    items: ITEMS,
    start: 1,
    now: STORY_NOW,
    reducedMotion: false,
    romanization: true,
    words: {
      lookup: () => ({ ko: "물", roman: "mul", meaning: "water" }),
      saved: () => false,
      save: vi.fn(),
    },
    keyboardHeight: 300,
    onShown: vi.fn(),
    onReply: vi.fn(async () => ({ kind: "sent" as const })),
    onOpenChat: vi.fn(),
    onSaveWord: vi.fn(),
    onMeet: vi.fn(),
    onProfile: vi.fn(),
    onClose: vi.fn(),
  };
  render(<StoryViewer {...props} />);
  return props;
}

const progress = () => screen.getByTestId(ids.progress).getAttribute("accessibility-label");
/** 누른 x로(Lynx처럼 조상으로 번지고 catchtap에서 멈춤 — `tapEl`). */
const tapAt = (testId: string, x: number) => {
  act(() => tapEl(screen.getByTestId(testId), { detail: { x, y: 600 } }));
};

test("FS-UI44. 아래 묶음(한 줄 카드 · 빈 자리) · 머리 줄 빈 자리를 눌러도 넘긴다 — 왼쪽 절반 이전, 오른쪽 절반 다음", () => {
  mount();
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.line, 100);
  expect(progress()).toBe("Story 1 of 3");
  tapAt(ids.line, 300);
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.replyBottom, 300);
  expect(progress()).toBe("Story 3 of 3");
  tapAt(ids.replyBottom, 120);
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.age, 250);
  expect(progress()).toBe("Story 3 of 3");
});

test("FS-UI45. 경계는 화면 가운데 — 가운데 바로 왼쪽은 이전, 가운데부터는 다음", () => {
  mount();
  tapAt(ids.line, 190);
  expect(progress()).toBe("Story 1 of 3");
  tapAt(ids.line, 195);
  expect(progress()).toBe("Story 2 of 3");
});

test("FS-UI46. 누를 수 있는 요소(칩 · 단어 알약 · 답장 칸 · 아바타 · 멈춤)는 제 동작만 — 넘기지 않는다", () => {
  const props = mount();
  tapAt(ids.chip(0), 300);
  expect(props.onReply).toHaveBeenCalledTimes(1);
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.word, 300);
  expect(props.onSaveWord).toHaveBeenCalledTimes(1);
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.reply, 300);
  tapAt(ids.replySend, 300);
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.profile, 40);
  expect(props.onProfile).toHaveBeenCalledTimes(1);
  expect(progress()).toBe("Story 2 of 3");
  tapAt(ids.pause, 350);
  expect(screen.getByTestId(ids.pause).getAttribute("accessibility-label")).toBe("Play");
  expect(progress()).toBe("Story 2 of 3");
});
