import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { advance, clearBackHandlers, tapId } from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryViewerItem,
  type StoryViewerProps,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { StoryViewer } from "./StoryViewer";

// `ui` 계층(FS-UI34 ~ UI41): 인물 넘김 큐브(ADR-0178 D4 개정 ⟨큐브⟩) — 면 셋 · 손가락을 따르는 각도 · 놓았을 때 넘어감/되돌아옴 ·
// 탭으로 인물이 바뀌면 한 번 돎 · 모션 줄이기면 돌지 않음. 각도 · 판정 값은 unit(FS-U26 ~ U32)이 보고, 여기서는 면의 자리와 상태만 봅니다.

beforeEach(() => {
  // 큐브는 메인 스레드의 requestAnimationFrame으로 돕니다. 테스트 환경의 그것은 진짜 setTimeout이라(가짜 시계 밖) `spin`이 진짜 틱을 돌리며
  // 가짜 시계를 16ms씩 밉니다.
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
/** 큐브가 다 도는 시간(page 300ms)보다 넉넉히. */
const TURN = 400;
const realSetTimeout = globalThis.setTimeout;
/** 메인 스레드 프레임(진짜 틱)과 가짜 시계를 함께 `ms`만큼 돌립니다 — 큐브의 끝 자리는 백그라운드 타이머가 반영합니다. */
async function spin(ms: number): Promise<void> {
  for (let passed = 0; passed < ms; passed += 16) {
    advance(16);
    await new Promise<void>((resolve) => realSetTimeout(resolve, 1));
  }
}
const REST = "translateX(0px) rotateY(0deg)";

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
const face = (role: "prev" | "current" | "next") => screen.queryByTestId(ids.face(role));
const angleOf = (role: "prev" | "current" | "next"): number => {
  const style = face(role)?.getAttribute("style") ?? "";
  const match = /rotateY\((-?[\d.]+)deg\)/.exec(style);
  return match === null ? Number.NaN : Number(match[1]);
};
const turnOf = () => screen.getByTestId(ids.viewer).getAttribute("data-turn");

/** 탭 자리에 손가락을 댑니다(메인 스레드 이벤트). */
const finger = (kind: "start" | "move" | "end", x: number, y = 400) => {
  const taps = screen.getByTestId(ids.taps);
  act(() => {
    if (kind === "start") fireEvent.touchstart(taps, { detail: { x, y } });
    if (kind === "move") fireEvent.touchmove(taps, { detail: { x, y } });
    if (kind === "end") fireEvent.touchend(taps, { detail: { x, y } });
  });
};
/** 천천히 끌어 놓습니다 — 마지막 움직임 뒤 150ms 쉬고 놓아 속도는 0. */
const slowDrag = (from: number, to: number) => {
  finger("start", from);
  advance(16);
  finger("move", from + (to - from) / 2);
  advance(16);
  finger("move", to);
  advance(150);
  finger("end", to);
};

test("FS-UI34. 면 셋 — 지금 면, 다음 인물 면(미리보기 · 가려짐), 첫 인물엔 이전 면이 없다", () => {
  mount();
  expect(face("current")).not.toBeNull();
  expect(face("prev")).toBeNull();
  const next = face("next");
  expect(next).not.toBeNull();
  expect(within(next as HTMLElement).getByText("해준")).not.toBeNull();
  expect(next).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(next).toHaveAttribute("user-interaction-enabled", "false");
  // 쉬는 자리 — 지금 면은 제자리, 다음 면은 90° 돌아 있다.
  expect(angleOf("current")).toBe(0);
  expect(angleOf("next")).toBe(90);
  // 쉬는 옆 면은 보이지 않는다(iOS가 깊이로 겹쳐 그려 지금 면 그림이 늦으면 비쳤다).
  expect(face("next")?.getAttribute("style")).toContain("opacity: 0");
  expect(face("current")?.getAttribute("style")).toContain("opacity: 1");
  // 이름 · 카드 test id는 지금 면에만.
  expect(screen.getAllByTestId(ids.name)).toHaveLength(1);
});

test("FS-UI35. 왼쪽으로 끌면 손가락을 따라 지금 면은 음수로, 다음 면은 90°에서 줄며 돈다 · 끄는 동안 진행 막대 멈춤", async () => {
  mount();
  finger("start", 300);
  advance(16);
  finger("move", 250);
  const first = { current: angleOf("current"), next: angleOf("next") };
  expect(first.current).toBeLessThan(0);
  expect(first.next).toBeGreaterThan(0);
  expect(first.next).toBeLessThan(90);
  advance(16);
  finger("move", 150);
  expect(angleOf("current")).toBeLessThan(first.current);
  expect(angleOf("next")).toBeLessThan(first.next);
  expect(screen.getByTestId(ids.progress).querySelector(".story-progress-paused")).not.toBeNull();
  // 끄는 동안 6초가 지나도 넘어가지 않는다.
  advance(6_000);
  expect(name()).toBe("윤경");
  finger("end", 150);
  await spin(TURN);
});

test("FS-UI36. 반 넘게 밀고 놓으면 다 돌아 다음 인물 — 들어온 면이 제자리, 나간 면은 이전 자리", async () => {
  mount();
  slowDrag(350, 100);
  expect(name()).toBe("윤경");
  await spin(TURN);
  expect(name()).toBe("해준");
  expect(face("current")?.getAttribute("style")).toContain(REST);
  expect(angleOf("prev")).toBe(-90);
  expect(within(face("prev") as HTMLElement).getByText("윤경")).not.toBeNull();
  // 오른쪽으로 반 넘게 밀면 이전 인물의 첫 장.
  slowDrag(60, 320);
  await spin(TURN);
  expect(name()).toBe("윤경");
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 2");
});

test("FS-UI37. 덜 밀고 천천히 놓으면 되돌아온다 · 그 손가락의 탭은 넘기지 않는다", async () => {
  mount();
  slowDrag(300, 220);
  await spin(TURN);
  expect(name()).toBe("윤경");
  expect(face("current")?.getAttribute("style")).toContain(REST);
  expect(angleOf("next")).toBe(90);
  tapId(ids.next);
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 1 of 2");
  // 다음 손가락의 탭은 넘긴다.
  finger("start", 300);
  finger("end", 300);
  tapId(ids.next);
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 2 of 2");
});

test("FS-UI38. 반이 안 돼도 빠르게 밀면 넘어간다", async () => {
  mount();
  finger("start", 300);
  advance(10);
  finger("move", 280);
  advance(10);
  finger("move", 230);
  advance(10);
  finger("end", 230);
  await spin(TURN);
  expect(name()).toBe("해준");
});

test("FS-UI39. 옆 인물이 없으면 조금만 돌고 되돌아온다 — 마지막 인물에서 반 넘게 밀면 닫힘", async () => {
  const props = mount();
  finger("start", 60);
  advance(16);
  finger("move", 300);
  expect(angleOf("current")).toBeGreaterThan(0);
  expect(angleOf("current")).toBeLessThan(23);
  advance(150);
  finger("end", 300);
  await spin(TURN);
  expect(name()).toBe("윤경");
  expect(face("current")?.getAttribute("style")).toContain(REST);
  cleanup();
  const last = mount({ start: 2 });
  expect(face("next")).toBeNull();
  slowDrag(350, 100);
  await spin(TURN);
  expect(last.onClose).toHaveBeenCalledWith("completed");
  expect(props.onClose).not.toHaveBeenCalled();
});

test("FS-UI40. 탭 · 6초 넘김으로 인물이 바뀌면 한 번 돈다(지금 면이 들어오고 방금 인물이 이전 면) — 다 돌면 전환을 거둔다", async () => {
  mount({ start: 1 });
  expect(turnOf()).toBe("none");
  tapId(ids.next);
  expect(name()).toBe("해준");
  expect(turnOf()).toBe("next");
  // 접혀 나가는 면은 방금 보던 장(윤경 둘째).
  expect(within(face("prev") as HTMLElement).getByText("윤경")).not.toBeNull();
  await spin(TURN);
  expect(turnOf()).toBe("none");
  expect(face("current")?.getAttribute("style")).toContain(REST);
  expect(angleOf("prev")).toBe(-90);
  tapId(ids.previous);
  expect(name()).toBe("윤경");
  expect(turnOf()).toBe("prev");
  await spin(TURN);
  expect(turnOf()).toBe("none");
});

test("FS-UI41. 모션 줄이기 — 끌어도 면이 돌지 않고, 반 넘게 밀면 바로 바뀌며, 탭으로 인물이 바뀌어도 돌지 않는다", () => {
  mount({ reducedMotion: true, start: 1 });
  finger("start", 350);
  advance(16);
  finger("move", 150);
  expect(angleOf("current")).toBe(0);
  advance(150);
  finger("end", 100);
  expect(name()).toBe("해준");
  expect(turnOf()).toBe("none");
  finger("start", 60);
  finger("end", 60);
  tapId(ids.previous);
  expect(name()).toBe("윤경");
  expect(turnOf()).toBe("none");
});
