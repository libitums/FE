import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { round, type EditorSticker, type Placement } from "./my-story-editor";
import type { CanvasBox } from "./my-story-fit";
import { stickerFit, stickerSizeOf } from "./my-story-sticker-size";
import { usePlacedGrip } from "./use-placed-grip";
import { textBoxSizeOf } from "./my-story-text";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { StickerWordLines } from "./StoryOverlayLines";

/**
 * 바탕의 크기(px) — 화면 전체(보기와 같은 좌표). `top` · `bottom`은 위 줄 · 아래 줄이 가리는 높이(끝단만 씀). 아직 모르면 0(끌기 없음).
 */
export type CanvasSize = CanvasBox;

/**
 * 단어 스티커의 그리기 값(가운데 기준) — 확정 크기(`settled`)는 글자 · 사이 · 안쪽 여백에(`StickerWordLines`), 끄는 동안의 몫만
 * transform(글 상자와 같은 A안, 선명하게). 손을 떼면 settled = scale이 되어 live 1(같은 가운데 기준이라 튀지 않음).
 */
export function stickerStyle(
  place: Pick<Placement, "x" | "y" | "scale" | "rotation">,
  settled: number,
) {
  const size = stickerSizeOf(place.scale, settled);
  return {
    left: `${round(place.x * 100)}%`,
    top: `${round(place.y * 100)}%`,
    transform: `translate(-50%, -50%) rotate(${place.rotation}deg) scale(${size.live})`,
    padding: size.padding,
    gap: size.gap,
  };
}

/**
 * 글 상자의 자리 — 바탕 너비 그대로의 줄(lane)을 가운데가 x에 오게 놓고 그 안 가운데에 상자를 둡니다. 상자의 줄바꿈 폭(바탕의 80%)이 자리에 따라
 * 바뀌지 않게 하려는 것입니다(절대 위치 상자는 left에서 오른쪽 끝까지만 넓어져, 옮기면 줄이 다시 흐름 — 기기 확인).
 */
export function laneStyle(place: Pick<Placement, "x" | "y">) {
  return { left: `${round((place.x - 0.5) * 100)}%`, top: `${round(place.y * 100)}%` };
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
  fit,
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
  /** 끝단 — 바뀐 자리 · 크기를 바탕 안(도구 열 앞 · 회전 외접 사각형)으로 고칩니다. 확정 크기를 함께 받아 끄는 중의 상자도 잽니다. */
  readonly fit: (next: T, settled: number) => T;
  /** 글 상자 — 바탕 너비 줄 안에 놓아 옮겨도 줄바꿈이 그대로입니다(`laneStyle`). */
  readonly lane?: boolean;
  /** 확정 크기를 받아 글자를 그립니다(손을 떼면 확정 — 끄는 동안은 transform). */
  readonly children: (settled: number) => ReactNode;
}): ReactNode {
  const [settled, setSettled] = useState(item.scale);
  const settle = () => setSettled(item.scale);
  const change = (next: T) => onChange(fit(next, settled));
  const grip = usePlacedGrip({ item, canvas, change, settle, onSelect });

  const box = (
    <view
      className={`${className}${selected ? ` ${className}-on` : ""}`}
      data-testid={testId}
      style={lane ? textBoxStyle(item, settled) : stickerStyle(item, settled)}
      flatten={false}
      accessibility-element={true}
      accessibility-label={label}
      bindtouchstart={grip.begin}
      {...(grip.own
        ? { bindtouchmove: grip.move, bindtouchend: grip.end, bindtouchcancel: grip.cancel }
        : {})}
      {...(onTap === undefined
        ? {}
        : {
            catchtap: () => {
              "background only";
              onTap();
            },
          })}
    >
      {children(settled)}
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
            catchtouchstart={grip.resizeBegin}
            catchtouchmove={grip.resizeMove}
            catchtouchend={grip.resizeEnd}
            catchtouchcancel={grip.resizeEnd}
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

/** 단어 · 카드 스티커(시안 27번) — 글 상자와 같은 끝단(`stickerFit`) · 같은 크기 방식. */
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
      fit={(next, settled) => ({ ...next, ...stickerFit(choice, next, canvas, settled) })}
    >
      {(settled: number) => <StickerWordLines words={choice} size={settled} />}
    </MyStoryPlaced>
  );
}
