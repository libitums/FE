import { useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { TouchEvent } from "@lynx-js/types";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { moveSticker, pinchSticker, type EditorSticker, type Point } from "./my-story-editor";
import { myStoriesTestIds as ids } from "./my-stories.contract";

/** 바탕의 크기(px) — 끌기 거리를 비율로 바꿉니다. 아직 모르면 0(끌기 없음). */
export type CanvasSize = { readonly width: number; readonly height: number };

const pointsOf = (event: TouchEvent): Point[] =>
  (event.touches ?? []).map((touch) => ({ x: touch.pageX, y: touch.pageY }));

/** 스티커 위치 · 크기 · 회전 → 그리기 값(가운데 기준). */
export function stickerStyle(sticker: Pick<EditorSticker, "x" | "y" | "scale" | "rotation">) {
  return {
    left: `${sticker.x * 100}%`,
    top: `${sticker.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
  };
}

/**
 * 바탕 위 단어 · 카드 스티커(시안 27번) — 한 손가락으로 끌어 옮기고, 두 손가락으로 크기 · 회전을 바꿉니다. 누르면 고른 것이 되고 ×로 뺍니다.
 * 손가락 좌표는 page 기준 — 처음 닿은 때의 스티커 · 점을 잡아 두고 그 차이로 계산합니다(움직일 때마다 위로 올려 다시 그림).
 */
export function MyStorySticker({
  sticker,
  canvas,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  readonly sticker: EditorSticker;
  readonly canvas: CanvasSize;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onChange: (next: EditorSticker) => void;
  readonly onRemove: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.editor;
  const start = useRef<{ sticker: EditorSticker; points: Point[] } | null>(null);
  const { choice } = sticker;

  const begin = (event: TouchEvent) => {
    "background only";
    start.current = { sticker, points: pointsOf(event) };
    onSelect();
  };
  const move = (event: TouchEvent) => {
    "background only";
    const from = start.current;
    const now = pointsOf(event);
    const [a0, b0] = from?.points ?? [];
    const [a1, b1] = now;
    if (from === null || a0 === undefined || a1 === undefined) return;
    if (b0 !== undefined && b1 !== undefined)
      return onChange(pinchSticker(from.sticker, [a0, b0], [a1, b1]));
    if (b0 !== undefined && b1 === undefined) {
      // 두 손가락에서 하나를 뗌 — 그 자리부터 다시 끕니다.
      start.current = { sticker, points: now };
      return;
    }
    if (canvas.width <= 0 || canvas.height <= 0) return;
    onChange(
      moveSticker(from.sticker, (a1.x - a0.x) / canvas.width, (a1.y - a0.y) / canvas.height),
    );
  };
  const end = () => {
    "background only";
    start.current = null;
  };

  return (
    <view
      className={selected ? "my-story-sticker my-story-sticker-on" : "my-story-sticker"}
      data-testid={ids.sticker(sticker.id)}
      style={stickerStyle(sticker)}
      flatten={false}
      accessibility-element={true}
      accessibility-label={copy.stickerLabel(choice.ko, choice.meaning)}
      bindtouchstart={begin}
      bindtouchmove={move}
      bindtouchend={end}
      bindtouchcancel={end}
    >
      <text className="my-story-sticker-ko" accessibility-elements-hidden={true}>
        {choice.ko}
      </text>
      {choice.roman === "" ? null : (
        <text className="my-story-sticker-roman" accessibility-elements-hidden={true}>
          {choice.roman}
        </text>
      )}
      <text className="my-story-sticker-meaning" accessibility-elements-hidden={true}>
        {choice.meaning}
      </text>
      {selected ? (
        <view
          className="my-story-sticker-remove"
          data-testid={ids.stickerRemove(sticker.id)}
          accessibility-element={true}
          accessibility-label={copy.remove(choice.ko)}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          flatten={false}
          catchtap={() => {
            "background only";
            onRemove();
          }}
        >
          <svg
            className="my-story-sticker-remove-icon"
            content={cross}
            current-color={color.white}
          />
        </view>
      ) : null}
    </view>
  );
}
