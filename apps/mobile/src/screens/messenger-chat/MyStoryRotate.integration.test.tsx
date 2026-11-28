import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, nativeInput, tapId } from "./chat-ui.test-support";
import { editorCapsOf, type EditorShare } from "./my-story-editor";
import { myStoriesFrom } from "./my-stories-parse";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { wordChoice } from "./my-stories.test-support";
import { MyStoryEditor } from "./MyStoryEditor";
import { MyStoryFace } from "./MyStoryFace";

// `integration` 계층(RT-I1 · I2, 2026-11-27): 두 손가락으로 돌린 각도가 올리기 요청(overlay `rotation`)에 실리고, 서버가 돌려준 그 값을
// 읽기 풀기를 지나 보기가 그대로 그린다. `rotation`이 없는 옛 행은 0°.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const touch = (identifier: number, pageX: number, pageY: number) => ({
  identifier,
  pageX,
  pageY,
});

test("RT-I1. 편집에서 87°까지 돌림 → 붙은 90°가 올리기 요청에 → 서버 행으로 돌아와 보기에서 rotate(90deg)", () => {
  const onShare = vi.fn<(share: EditorShare) => void>();
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
      onShare={onShare}
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
  const box = screen.getByTestId(ids.textBlock);
  const rad = (87 * Math.PI) / 180;
  act(() => {
    fireEvent.touchstart(box, {
      touches: [touch(0, 200, 300), touch(1, 300, 300)],
      changedTouches: [touch(0, 200, 300), touch(1, 300, 300)],
    });
    fireEvent.touchmove(canvas, {
      touches: [touch(0, 200, 300), touch(1, 200 + 100 * Math.cos(rad), 300 + 100 * Math.sin(rad))],
    });
    fireEvent.touchend(canvas, {
      touches: [],
      changedTouches: [touch(0, 200, 300), touch(1, 200, 400)],
    });
  });
  tapId(ids.share);
  const [share] = onShare.mock.calls[0] ?? [];
  if (share === undefined || share.kind !== "text") throw new Error("text share expected");
  const [overlay] = share.overlays;
  expect(overlay?.rotation).toBe(90);
  cleanup();

  const state = myStoriesFrom(
    JSON.stringify({
      enabled: true,
      stories: [
        {
          id: "ms-r",
          kind: "text",
          word: null,
          ko: "오늘",
          roman: "",
          meaning: "",
          example: null,
          background: "blue",
          postedAt: "2026-11-27T03:00:00.000Z",
          expiresAt: "2026-11-28T03:00:00.000Z",
          reactions: [],
          overlays: share.overlays,
        },
      ],
    }),
  );
  const [story] = state?.stories ?? [];
  if (story === undefined) throw new Error("story not parsed");
  render(<MyStoryFace story={story} insetTop={59} photoUrl={undefined} />);
  expect(screen.getByTestId(ids.cardKo).getAttribute("style")).toContain("rotate(90deg)");
});

test("RT-I2. rotation이 없는 옛 행 — 0°로 그린다", () => {
  const state = myStoriesFrom(
    JSON.stringify({
      enabled: true,
      stories: [
        {
          id: "ms-o",
          kind: "text",
          word: null,
          ko: "오늘",
          roman: "",
          meaning: "",
          example: null,
          background: "orange",
          postedAt: "2026-11-27T03:00:00.000Z",
          expiresAt: "2026-11-28T03:00:00.000Z",
          reactions: [],
          overlays: [{ kind: "text", ko: "오늘", x: 0.5, y: 0.3, scale: 1 }],
        },
      ],
    }),
  );
  const [story] = state?.stories ?? [];
  if (story === undefined) throw new Error("story not parsed");
  render(<MyStoryFace story={story} insetTop={59} photoUrl={undefined} />);
  expect(screen.getByTestId(ids.cardKo).getAttribute("style")).toContain("rotate(0deg)");
});
