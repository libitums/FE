import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, tapId } from "./chat-ui.test-support";
import { editorCapsOf } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";

// `ui` 계층(ST-UI5 ~ UI7, 버그 수정 2026-11-27 사용자 추가 확인): 단어 스티커(Words)도 글 상자와 같은 끌기 코드(`MyStoryPlaced`)라 같은
// 원인 — 다른 곳에 남은 손가락이 섞이면 한 손가락 끌기가 크기 · 회전이 됐다. 그리고 단어 스티커를 누르면 고른 표시(× · 손잡이)가 바로
// 꺼지던 것(누름이 바탕으로 올라가 고름을 풂), 아래 줄 밑으로 끌리던 것.

afterEach(() => {
  cleanup();
  clearBackHandlers();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

function layout(testId: string, detail: Record<string, number>) {
  const el = screen.getByTestId(testId);
  const EventConstructor = el.ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  act(() => {
    fireEvent(el, new EventConstructor("bindEvent:layoutchange", { detail }));
  });
}

function mount() {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = {
    safeAreaInsets: { top: 59, bottom: 34, left: 0, right: 0 },
  };
  render(
    <MyStoryEditor
      caps={editorCapsOf(["text"])}
      choices={() => ({ words: [wordChoice("w1", "찌개", "stew")] })}
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
  layout(ids.stickers, { width: 390, height: 844 });
  layout(ids.editorTop, { height: 72, width: 390 });
  layout(ids.editorBottom, { height: 160, width: 390 });
  tapId(ids.toolWords);
  tapId(ids.choice("w1"));
}

const sticker = () => screen.getByTestId(ids.sticker("s1"));
const styleOf = (el: Element) => el.getAttribute("style") ?? "";
const percent = (key: string) =>
  Number(new RegExp(`${key}: (-?[0-9.]+)%`).exec(styleOf(sticker()))?.[1] ?? Number.NaN) / 100;
const touch = (identifier: number, pageX: number, pageY: number) => ({
  identifier,
  pageX,
  pageY,
});

test("ST-UI5. 단어 스티커 — 다른 곳에 남은 손가락이 섞여 와도 한 손가락 끌기는 옮기기(크기 · 기울기 −4° 그대로)", () => {
  mount();
  const ghost = touch(1, 255, 545);
  const [x0, y0] = [percent("left"), percent("top")];
  act(() => {
    fireEvent.touchstart(sticker(), {
      touches: [touch(0, 200, 460), ghost],
      changedTouches: [touch(0, 200, 460)],
    });
    fireEvent.touchmove(sticker(), {
      touches: [touch(0, 161, 400), ghost],
      changedTouches: [touch(0, 161, 400)],
    });
  });
  expect(styleOf(sticker())).toContain("rotate(-4deg) scale(1)");
  expect(percent("left")).toBeCloseTo(x0 - 39 / 390, 2);
  expect(percent("top")).toBeCloseTo(y0 - 60 / 844, 2);
});

test("ST-UI6. 단어 스티커를 누르면 고른 표시(× · 손잡이)가 남는다 — 누름을 스티커가 잡아(catchtap) 바탕의 「고름 풀기」로 올리지 않음", () => {
  mount();
  // 테스트 환경은 catch · bind를 다른 이벤트 이름으로 보내 전파 막기를 흉내 내지 못한다 — 스티커가 누름을 catch로 받는지(계약)를 보고,
  // 기기에서 누른 뒤 ×가 남는 것을 따로 확인한다(e2e ST-E4).
  const listeners = (sticker() as unknown as { eventMap?: Record<string, unknown> }).eventMap ?? {};
  expect(Object.keys(listeners)).toContain("catchEvent:tap");
  act(() => {
    fireEvent.touchstart(sticker(), { touches: [touch(0, 200, 460)] });
    fireEvent.touchend(sticker(), { touches: [], changedTouches: [touch(0, 200, 460)] });
    fireEvent.tap(sticker(), { eventType: "catchEvent" });
  });
  expect(screen.queryByTestId(ids.stickerRemove("s1"))).not.toBeNull();
});

test("ST-UI7. 단어 스티커 — 아래로 끝까지 끌면 아래 줄(안내 · Share) 위로도 가고, 상자 위 끝 32px이 아래 줄 위에 남음(2026-11-27)", () => {
  mount();
  act(() => {
    fireEvent.touchstart(sticker(), { touches: [touch(0, 200, 460)] });
    fireEvent.touchmove(sticker(), { touches: [touch(0, 200, 4000)] });
    fireEvent.touchend(sticker(), { touches: [], changedTouches: [touch(0, 200, 4000)] });
  });
  // 「찌개」 · yageun · stew — 높이 (28 + 16 + 16 + 2·2) + 16 + 4 = 84, −4° 외접 높이의 반만큼 아래 줄 + 32 아래까지
  const half =
    (84 * Math.cos((4 * Math.PI) / 180) + (2 * 22 + 32 + 4) * Math.sin((4 * Math.PI) / 180)) / 2;
  expect(percent("top")).toBeLessThanOrEqual(1 - (160 + 32) / 844 + half / 844 + 0.002);
  expect(percent("top")).toBeGreaterThan(1 - (160 + 32) / 844 + half / 844 - 0.01);
  expect(percent("top")).toBeGreaterThan(1 - 160 / 844);
});
