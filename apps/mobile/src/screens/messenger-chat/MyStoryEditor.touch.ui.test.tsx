import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, nativeInput, tapId } from "./chat-ui.test-support";
import { editorCapsOf } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";

// `ui` 계층(ST-UI1 ~ UI4, 버그 수정 2026-11-27): 스토리 만들기 글 상자 — 남은 손가락이 섞여도 한 손가락 끌기는 옮기기, 두 손가락 중
// 하나를 떼면 남은 손가락으로 계속, 바탕은 화면 전체(보기와 같은 좌표)이고 위 줄 · 아래 줄이 가리는 곳에는 놓이지 않음, 글 입력은 여러 줄.

afterEach(() => {
  cleanup();
  clearBackHandlers();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

const SCREEN = { width: 390, height: 844 };

function layout(testId: string, detail: Record<string, number>) {
  const el = screen.getByTestId(testId);
  const EventConstructor = el.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  act(() => {
    fireEvent(el, new EventConstructor("bindEvent:layoutchange", { detail }));
  });
}

function mount(text = "오늘") {
  const onShare = vi.fn();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = {
    safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 },
  };
  render(
    <MyStoryEditor
      caps={editorCapsOf(["text"])}
      choices={() => ({ words: [wordChoice("w1", "김치찌개", "kimchi stew")] })}
      sharing={{
        busy: false,
        checking: false,
        error: null,
        crisis: null,
        rejected: null,
        share: vi.fn(async () => undefined),
        requestReview: vi.fn(async () => undefined),
        reset: vi.fn(),
      }}
      onShare={onShare}
      onChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  layout(ids.stickers, SCREEN);
  layout(ids.editorTop, { height: 72, width: 390 });
  layout(ids.editorBottom, { height: 160, width: 390 });
  tapId(ids.toolText);
  act(() => nativeInput("input", text, ids.textInput));
  tapId(ids.textDone);
  return { onShare };
}

const box = () => screen.getByTestId(ids.textBlock);
const lane = () => box().parentElement as Element;
const styleOf = (el: Element) => el.getAttribute("style") ?? "";
/** 줄(lane)의 left · top에서 자리 비율을 되읽습니다 — left는 (x − 0.5) × 100%. */
const placeOf = () => {
  const style = styleOf(lane());
  const left = Number(/left: (-?[0-9.]+)%/.exec(style)?.[1] ?? Number.NaN) / 100;
  const top = Number(/top: (-?[0-9.]+)%/.exec(style)?.[1] ?? Number.NaN) / 100;
  return { x: left + 0.5, y: top };
};
const touch = (identifier: number, pageX: number, pageY: number) => ({
  identifier,
  pageX,
  pageY,
});

test("ST-UI1. 다른 곳에 남은 손가락이 섞여 와도 한 손가락 끌기는 옮기기 — 크기 · 회전은 그대로", () => {
  mount();
  const ghost = touch(1, 255, 545);
  const before = placeOf();
  act(() => {
    fireEvent.touchstart(box(), {
      touches: [touch(0, 200, 250), ghost],
      changedTouches: [touch(0, 200, 250)],
    });
    fireEvent.touchmove(box(), {
      touches: [touch(0, 161, 328), ghost],
      changedTouches: [touch(0, 161, 328)],
    });
  });
  expect(styleOf(box())).toContain("rotate(0deg) scale(1)");
  const after = placeOf();
  expect(after.x).toBeCloseTo(before.x - 39 / 390, 2);
  expect(after.y).toBeCloseTo(before.y + 78 / 844, 2);
});

test("ST-UI2. 두 손가락에서 하나를 떼면 남은 손가락으로 이어 옮긴다", () => {
  mount();
  act(() => {
    fireEvent.touchstart(box(), {
      touches: [touch(0, 150, 250)],
      changedTouches: [touch(0, 150, 250)],
    });
    fireEvent.touchstart(box(), {
      touches: [touch(0, 150, 250), touch(1, 250, 250)],
      changedTouches: [touch(1, 250, 250)],
    });
    fireEvent.touchend(box(), {
      touches: [touch(0, 150, 250), touch(1, 250, 250)],
      changedTouches: [touch(1, 250, 250)],
    });
  });
  const before = placeOf();
  act(() => {
    fireEvent.touchmove(box(), {
      touches: [touch(0, 150, 350)],
      changedTouches: [touch(0, 150, 350)],
    });
  });
  expect(placeOf().y).toBeCloseTo(before.y + 100 / 844, 2);
});

test("ST-UI3. 바탕은 화면 전체 — 위 · 아래로 끝까지 끌면 위 줄 · 아래 줄 위로도 가고, 가려지지 않는 곳에 상자 32px이 남음(2026-11-27)", () => {
  mount();
  const drag = (dy: number) =>
    act(() => {
      fireEvent.touchstart(box(), { touches: [touch(0, 200, 400)] });
      fireEvent.touchmove(box(), { touches: [touch(0, 200, 400 + dy)] });
      fireEvent.touchend(box(), { touches: [], changedTouches: [touch(0, 200, 400 + dy)] });
    });
  // 「오늘」 상자 높이 28 + 16 + 4 = 48 → 반 24 — 상자 아래 끝이 위 줄(안전 영역 59 + 72) 아래 32px, 위 끝이 아래 줄 위 32px
  drag(-2000);
  expect(placeOf().y).toBeCloseTo((59 + 72 + 32 - 24) / 844, 3);
  drag(4000);
  expect(placeOf().y).toBeCloseTo(1 - (160 + 32 - 24) / 844, 3);
});

test("ST-UI4. 글 입력은 여러 줄(textarea, Enter는 줄바꿈) — 친 줄대로 상자에 그리고 올릴 때도 줄바꿈 그대로", () => {
  const { onShare } = mount("오늘\n김치찌개 만들었어");
  const lines = [...box().querySelectorAll("text")].map((el) => el.textContent);
  expect(lines.slice(0, 2)).toEqual(["오늘", "김치찌개 만들었어"]);
  tapId(ids.toolText);
  const input = screen.getByTestId(ids.textInput);
  expect(input.tagName.toLowerCase()).toBe("textarea");
  expect(input.getAttribute("confirm-type")).toBeNull();
  tapId(ids.textDone);
  tapId(ids.share);
  expect(onShare).toHaveBeenCalledTimes(1);
  const [share] = onShare.mock.calls[0] ?? [];
  expect(share?.text?.ko).toBe("오늘\n김치찌개 만들었어");
  expect(share?.overlays[0]?.ko).toBe("오늘\n김치찌개 만들었어");
});
