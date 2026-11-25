import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { TouchEvent } from "@lynx-js/types";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import {
  moveSticker,
  pinchSticker,
  resizeSticker,
  type EditorSticker,
  type Placement,
  type Point,
} from "./my-story-editor";
import { storyTextLines, textBoxSizeOf } from "./my-story-text";
import { myStoriesTestIds as ids } from "./my-stories.contract";

/** 바탕의 크기(px) — 끌기 거리를 비율로 바꿉니다. 아직 모르면 0(끌기 없음). */
export type CanvasSize = { readonly width: number; readonly height: number };

const pointsOf = (event: TouchEvent): Point[] =>
  (event.touches ?? []).map((touch) => ({ x: touch.pageX, y: touch.pageY }));

/** 자리 → 그리기 값(가운데 기준). 크기는 transform scale이라 글자도 같은 비율로 바뀝니다(줄바꿈은 다시 흐르지 않음). */
export function stickerStyle(place: Pick<Placement, "x" | "y" | "scale" | "rotation">) {
  return {
    left: `${place.x * 100}%`,
    top: `${place.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${place.rotation}deg) scale(${place.scale})`,
  };
}

/**
 * 글 상자의 자리 — 바탕 너비 그대로의 줄(lane)을 가운데가 x에 오게 놓고 그 안 가운데에 상자를 둡니다. 상자의 줄바꿈 폭(바탕의 80%)이 자리에 따라
 * 바뀌지 않게 하려는 것입니다(절대 위치 상자는 left에서 오른쪽 끝까지만 넓어져, 옮기면 줄이 다시 흐름 — 기기 확인).
 */
export function laneStyle(place: Pick<Placement, "x" | "y">) {
  return { left: `${(place.x - 0.5) * 100}%`, top: `${place.y * 100}%` };
}

/** 글 상자 — 확정 크기(`settled`)는 안쪽 여백 · 글자(`StoryTextLines`)에, 끄는 동안의 몫만 transform(A안, 선명하게). */
export function textBoxStyle(place: Pick<Placement, "scale" | "rotation">, settled: number) {
  const size = textBoxSizeOf(place.scale, settled);
  return {
    transform: `rotate(${place.rotation}deg) scale(${size.live})`,
    padding: size.padding,
  };
}

/**
 * 바탕 위에 놓인 것 하나(단어 · 카드 스티커 · 글 상자, 시안 27 · 30번) — 한 손가락으로 끌어 옮기고, 두 손가락이나 모서리 손잡이로 크기 · 회전을
 * 바꿉니다. 고르면 ×(빼기)와 손잡이가 섭니다. 손가락 좌표는 page 기준 — 처음 닿은 때의 자리 · 점을 잡아 두고 그 차이로 계산합니다.
 */
export function MyStoryPlaced<T extends Placement>({
  item,
  testId,
  label,
  removeTestId,
  removeLabel,
  canvas,
  selected,
  className,
  onSelect,
  onChange,
  onRemove,
  onTap,
  lane = false,
  children,
}: {
  readonly item: T;
  readonly testId: string;
  readonly label: string;
  readonly removeTestId: string;
  readonly removeLabel: string;
  readonly canvas: CanvasSize;
  readonly selected: boolean;
  readonly className: string;
  readonly onSelect: () => void;
  readonly onChange: (next: T) => void;
  readonly onRemove: () => void;
  /** 누름(끌지 않음) — 글 상자는 다시 쓰기. */
  readonly onTap?: () => void;
  /** 글 상자 — 바탕 너비 줄 안에 놓아 옮겨도 줄바꿈이 그대로입니다(`laneStyle`). */
  readonly lane?: boolean;
  /** 글 상자는 확정 크기를 받아 글자를 그립니다(손을 떼면 확정 — 끄는 동안은 transform). */
  readonly children: ReactNode | ((settled: number) => ReactNode);
}): ReactNode {
  const [settled, setSettled] = useState(item.scale);
  const settle = () => {
    if (lane) setSettled(item.scale);
  };
  const start = useRef<{ item: T; points: Point[] } | null>(null);
  const resize = useRef<{ item: T; point: Point } | null>(null);

  const begin = (event: TouchEvent) => {
    "background only";
    start.current = { item, points: pointsOf(event) };
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
      return onChange(pinchSticker(from.item, [a0, b0], [a1, b1]));
    if (b0 !== undefined && b1 === undefined) {
      // 두 손가락에서 하나를 뗌 — 그 자리부터 다시 끕니다.
      start.current = { item, points: now };
      return;
    }
    if (canvas.width <= 0 || canvas.height <= 0) return;
    onChange(moveSticker(from.item, (a1.x - a0.x) / canvas.width, (a1.y - a0.y) / canvas.height));
  };
  const end = () => {
    "background only";
    start.current = null;
    settle();
  };
  const resizeBegin = (event: TouchEvent) => {
    "background only";
    const [point] = pointsOf(event);
    if (point !== undefined) resize.current = { item, point };
  };
  const resizeMove = (event: TouchEvent) => {
    "background only";
    const from = resize.current;
    const [point] = pointsOf(event);
    if (from === null || point === undefined) return;
    onChange(resizeSticker(from.item, point.x - from.point.x, point.y - from.point.y));
  };
  const resizeEnd = () => {
    "background only";
    resize.current = null;
    settle();
  };

  const box = (
    <view
      className={`${className}${selected ? ` ${className}-on` : ""}`}
      data-testid={testId}
      style={lane ? textBoxStyle(item, settled) : stickerStyle(item)}
      flatten={false}
      accessibility-element={true}
      accessibility-label={label}
      bindtouchstart={begin}
      bindtouchmove={move}
      bindtouchend={end}
      bindtouchcancel={end}
      {...(onTap === undefined
        ? {}
        : {
            catchtap: () => {
              "background only";
              onTap();
            },
          })}
    >
      {typeof children === "function" ? children(settled) : children}
      {selected ? (
        <>
          <view
            className="my-story-sticker-remove"
            data-testid={removeTestId}
            accessibility-element={true}
            accessibility-label={removeLabel}
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
          <view
            className="my-story-sticker-handle"
            accessibility-elements-hidden={true}
            catchtouchstart={resizeBegin}
            catchtouchmove={resizeMove}
            catchtouchend={resizeEnd}
            catchtouchcancel={resizeEnd}
          />
        </>
      ) : null}
    </view>
  );
  return lane ? (
    <view className="my-story-lane" style={laneStyle(item)}>
      {box}
    </view>
  ) : (
    box
  );
}

/** 글 상자의 줄들 — 정해진 줄(`storyTextLines`)을 한 줄씩, 글자 크기에 크기를 곱해 그립니다(편집 · 보기 같은 함수). */
export function StoryTextLines({
  ko,
  color: ink,
  size,
}: {
  readonly ko: string;
  readonly color: string;
  readonly size: number;
}): ReactNode {
  const { fontSize, lineHeight } = textBoxSizeOf(size, size);
  return storyTextLines(ko).map((line, index) => (
    <text
      key={index}
      className={`my-story-text-box-ko my-story-ink-${ink}`}
      style={{ fontSize, lineHeight }}
      accessibility-elements-hidden={true}
    >
      {line}
    </text>
  ));
}

/** 단어 · 카드 스티커(시안 27번). */
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
  const { choice } = sticker;
  return (
    <MyStoryPlaced
      item={sticker}
      testId={ids.sticker(sticker.id)}
      label={copy.stickerLabel(choice.ko, choice.meaning)}
      removeTestId={ids.stickerRemove(sticker.id)}
      removeLabel={copy.remove(choice.ko)}
      canvas={canvas}
      selected={selected}
      className="my-story-sticker"
      onSelect={onSelect}
      onChange={onChange}
      onRemove={onRemove}
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
    </MyStoryPlaced>
  );
}
