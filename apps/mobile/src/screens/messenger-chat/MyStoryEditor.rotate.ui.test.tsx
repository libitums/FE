import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, nativeInput, tapId } from "./chat-ui.test-support";
import { editorCapsOf } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";

// `ui` 계층(RT-UI1 ~ UI3, 2026-11-27): 두 손가락 크기 · 회전(인스타그램 스토리 감각) — 둘째 손가락은 바탕 어디에 닿아도 잡은 것에 붙고,
// 0° · ±90° · 180° 가까이에서 붙으며 새로 붙을 때 가벼운 진동 한 번, 안내 문구에 회전.

afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.unstubAllGlobals();
});

function mount() {
  const haptics: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: () => {},
      stopRing: () => {},
      haptic: (kind: string) => haptics.push(kind),
    },
  });
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
        share: vi.fn<() => Promise<void>>(async () => undefined),
        requestReview: vi.fn<() => Promise<void>>(async () => undefined),
        reset: vi.fn<() => void>(),
      }}
      onShare={vi.fn<() => void>()}
      onChange={vi.fn<() => void>()}
      onClose={vi.fn<() => void>()}
    />,
  );
  const canvas = screen.getByTestId(ids.stickers);
  const EventConstructor = canvas.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  act(() => {
    fireEvent(
      canvas,
      new EventConstructor("bindEvent:layoutchange", { detail: { width: 390, height: 844 } }),
    );
  });
  tapId(ids.toolText);
  act(() => nativeInput("input", "오늘", ids.textInput));
  tapId(ids.textDone);
  return { canvas, haptics };
}

const box = () => screen.getByTestId(ids.textBlock);
const touch = (identifier: number, pageX: number, pageY: number) => ({
  identifier,
  pageX,
  pageY,
});
/** 손가락 0은 (200, 300)에 둔 채 손가락 1을 그 둘레 반지름 r · 각도 deg 자리로. */
const around = (deg: number, r = 100) =>
  touch(1, 200 + r * Math.cos((deg * Math.PI) / 180), 300 + r * Math.sin((deg * Math.PI) / 180));

test("RT-UI1. 둘째 손가락이 글 상자 밖(바탕)에 닿아도 — 두 손가락으로 크기와 회전을 함께", () => {
  const { canvas } = mount();
  act(() => {
    fireEvent.touchstart(box(), {
      touches: [touch(0, 200, 300)],
      changedTouches: [touch(0, 200, 300)],
    });
    // 바탕에 닿은 둘째 손가락
    fireEvent.touchstart(canvas, {
      touches: [touch(0, 200, 300), around(0)],
      changedTouches: [around(0)],
    });
    fireEvent.touchmove(canvas, {
      touches: [touch(0, 200, 300), around(30, 150)],
      changedTouches: [around(30, 150)],
    });
  });
  expect(box().getAttribute("style")).toContain("rotate(30deg) scale(1.5)");
});

test("RT-UI2. 0° · 90° 가까이에서 붙고 새로 붙을 때만 진동 한 번 — 붙은 채 움직임 · 떨어짐은 진동 없음", () => {
  const { canvas, haptics } = mount();
  const turn = (deg: number) =>
    act(() => {
      fireEvent.touchmove(canvas, {
        touches: [touch(0, 200, 300), around(deg)],
        changedTouches: [around(deg)],
      });
    });
  act(() => {
    fireEvent.touchstart(box(), {
      touches: [touch(0, 200, 300), around(0)],
      changedTouches: [touch(0, 200, 300), around(0)],
    });
  });
  turn(20);
  expect(box().getAttribute("style")).toContain("rotate(20deg)");
  expect(haptics).toEqual([]);
  turn(87);
  expect(box().getAttribute("style")).toContain("rotate(90deg)");
  expect(haptics).toEqual(["key"]);
  turn(92);
  expect(box().getAttribute("style")).toContain("rotate(90deg)");
  expect(haptics).toEqual(["key"]);
  turn(60);
  turn(2);
  expect(box().getAttribute("style")).toContain("rotate(0deg)");
  expect(haptics).toEqual(["key", "key"]);
});

test("RT-UI3. 안내 — 얹은 것이 있으면 끌기 · 두 손가락 크기 · 회전을 알린다", () => {
  mount();
  expect(screen.getByTestId(ids.editorHint).textContent).toBe(
    "Drag to move. Pinch to resize or rotate.",
  );
});
