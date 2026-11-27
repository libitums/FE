import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, tapId } from "./chat-ui.test-support";
import { editorCapsOf } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";

// `ui` 계층(SP-UI1 ~ UI6, 2026-11-27): 고른 스티커는 두 손가락이 둘 다 바탕(스티커 밖)에 있어도 크기 · 회전을 따라간다(인스타그램
// 스토리 감각). 고른 것이 없으면 아무것도 하지 않고, 바탕 한 손가락 끌기는 스티커를 옮기지 않으며, 두 손가락 동안은 고름을 풀지 않는다.

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
  // 단어 스티커를 넣으면 고른 상태(× · 손잡이)
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
  return { canvas, haptics };
}

const word = () => screen.getByTestId(ids.sticker("s1"));
const styleOf = () => word().getAttribute("style") ?? "";
const removeShown = () => screen.queryByTestId(ids.stickerRemove("s1")) !== null;
const touch = (identifier: number, pageX: number, pageY: number) => ({
  identifier,
  pageX,
  pageY,
});
/** 바탕의 손가락 0은 (100, 700)에 두고 손가락 1을 반지름 r · 각도 deg 자리로 — 둘 다 스티커 밖. */
const around = (deg: number, r = 100) =>
  touch(1, 100 + r * Math.cos((deg * Math.PI) / 180), 700 + r * Math.sin((deg * Math.PI) / 180));
const A = touch(0, 100, 700);

function pinchOnCanvas(canvas: Element, deg: number, r: number) {
  act(() => {
    fireEvent.touchstart(canvas, { touches: [A], changedTouches: [A] });
    fireEvent.touchstart(canvas, { touches: [A, around(0)], changedTouches: [around(0)] });
    fireEvent.touchmove(canvas, {
      touches: [A, around(deg, r)],
      changedTouches: [around(deg, r)],
    });
  });
}

test("SP-UI1. 고른 스티커 — 두 손가락이 둘 다 바탕에 있어도 크기와 회전을 따라가고, 90° 가까이면 붙으며 진동 한 번", () => {
  const { canvas, haptics } = mount();
  expect(removeShown()).toBe(true);
  pinchOnCanvas(canvas, 30, 150);
  // 처음 −4°에서 30° 돌림 → 26°, 거리 1.5배
  expect(styleOf()).toContain("rotate(26deg) scale(1.5)");
  act(() => {
    fireEvent.touchmove(canvas, { touches: [A, around(92)], changedTouches: [around(92)] });
  });
  expect(styleOf()).toContain("rotate(90deg)");
  expect(haptics).toEqual(["key"]);
});

test("SP-UI2. 바탕 한 손가락 끌기 — 고른 스티커도 움직이지 않음", () => {
  const { canvas } = mount();
  const before = styleOf();
  act(() => {
    fireEvent.touchstart(canvas, { touches: [A], changedTouches: [A] });
    fireEvent.touchmove(canvas, {
      touches: [touch(0, 300, 400)],
      changedTouches: [touch(0, 300, 400)],
    });
    fireEvent.touchend(canvas, { touches: [], changedTouches: [touch(0, 300, 400)] });
  });
  expect(styleOf()).toBe(before);
});

test("SP-UI3. 고른 것이 없으면(바탕 탭으로 풂) 바탕 두 손가락은 아무것도 하지 않음", () => {
  const { canvas } = mount();
  act(() => {
    fireEvent.tap(canvas);
  });
  expect(removeShown()).toBe(false);
  const before = styleOf();
  pinchOnCanvas(canvas, 30, 150);
  expect(styleOf()).toBe(before);
});

test("SP-UI4. 두 손가락 동안 · 그 직후의 바탕 누름은 고름을 풀지 않음 — 다음 한 손가락 누름은 풂", () => {
  const { canvas } = mount();
  pinchOnCanvas(canvas, 30, 150);
  act(() => {
    fireEvent.touchend(canvas, { touches: [A], changedTouches: [around(30, 150)] });
    fireEvent.touchend(canvas, { touches: [], changedTouches: [A] });
    fireEvent.tap(canvas);
  });
  expect(removeShown()).toBe(true);
  act(() => {
    fireEvent.touchstart(canvas, { touches: [A], changedTouches: [A] });
    fireEvent.touchend(canvas, { touches: [], changedTouches: [A] });
    fireEvent.tap(canvas);
  });
  expect(removeShown()).toBe(false);
});

test("SP-UI5. 바탕 두 손가락에서 하나를 뗌 — 남은 한 손가락으로는 스티커가 끌리지 않음", () => {
  const { canvas } = mount();
  pinchOnCanvas(canvas, 30, 150);
  act(() => {
    fireEvent.touchend(canvas, { touches: [A], changedTouches: [around(30, 150)] });
  });
  const before = styleOf();
  act(() => {
    fireEvent.touchmove(canvas, {
      touches: [touch(0, 300, 300)],
      changedTouches: [touch(0, 300, 300)],
    });
  });
  expect(styleOf()).toBe(before);
});

test("SP-UI6. 첫 손가락이 스티커 위인 지금 방식도 그대로 — 둘째는 바탕", () => {
  const { canvas } = mount();
  act(() => {
    fireEvent.touchstart(word(), { touches: [A], changedTouches: [A] });
    fireEvent.touchstart(canvas, { touches: [A, around(0)], changedTouches: [around(0)] });
    fireEvent.touchmove(canvas, { touches: [A, around(30, 150)], changedTouches: [] });
  });
  expect(styleOf()).toContain("rotate(26deg) scale(1.5)");
});
