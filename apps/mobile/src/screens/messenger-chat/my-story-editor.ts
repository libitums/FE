// 스토리 만들기 — 바탕 위 편집(시안 26 ~ 28) 판정. 순수. 서버가 받는 종류(`kinds`, 서버 반영 예상)에 따라 켤 도구 · 스티커 수 · 올릴 길을 가립니다.
// - 지금 서버(word · card): Aa 없음, 스티커 하나, 글 없이 스티커 하나일 때만 기존 단어 · 카드 올리기.
// - `text`가 있으면: Aa(내 글 + 교정) · 스티커 여덟(서버 overlays 상한 `MY_STORY_OVERLAY_MAX`와 같음), 글 스토리로 올리기.
// - `photo`가 있어야 시작 시트의 Camera · 최근 사진이 섭니다(업로드 화면은 범위 밖).

import type {
  MyStoryChoice,
  MyStoryOverlay,
  MyStoryPostKind,
  StoryBackground,
} from "./my-stories.contract";

/** 편집 위 스티커(단어 · 카드) — 위치 · 크기는 바탕에 대한 비율(가운데 기준), 회전은 도. */
export type EditorSticker = {
  readonly id: string;
  readonly choice: MyStoryChoice;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
};

/** 바탕 위에 둔 글(Aa) — 한 줄. 교정을 받았으면 `original`이 내가 쓴 글. */
export type EditorText = {
  readonly ko: string;
  readonly meaning: string | null;
  readonly original: string | null;
};

export type EditorCaps = {
  readonly text: boolean;
  readonly photo: boolean;
  readonly maxStickers: number;
};

export type EditorShare =
  | { readonly kind: "choice"; readonly choice: MyStoryChoice }
  | {
      readonly kind: "text";
      readonly background: StoryBackground;
      readonly text: EditorText | null;
      readonly overlays: readonly MyStoryOverlay[];
    };

/** 서버 `MY_STORY_OVERLAY_MAX`(계약 패키지) — 값을 가져오면 zod가 번들에 들어가 숫자만 둡니다. */
const OVERLAY_MAX = 8;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
/** 새 스티커 자리 — 가운데 조금 아래, 살짝 기울여(시안 27번), 겹치지 않게 하나마다 비켜 놓습니다. */
const START = { x: 0.5, y: 0.55, rotation: -4, step: 0.06 } as const;

export const STORY_BACKGROUNDS: readonly StoryBackground[] = ["orange", "green", "blue", "purple"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

export function editorCapsOf(kinds: readonly MyStoryPostKind[]): EditorCaps {
  const text = kinds.includes("text");
  return { text, photo: kinds.includes("photo"), maxStickers: text ? OVERLAY_MAX : 1 };
}

/** 스티커 하나를 놓습니다 — 하나만 되는 서버면 바꿔 끼우고, 상한이면 그대로. */
export function placeSticker(
  stickers: readonly EditorSticker[],
  choice: MyStoryChoice,
  caps: EditorCaps,
  id: string,
): readonly EditorSticker[] {
  const base = caps.maxStickers <= 1 ? [] : stickers;
  if (base.length >= caps.maxStickers) return stickers;
  const n = base.length;
  const shift = n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) * Math.ceil(n / 2) * START.step;
  return [
    ...base,
    {
      id,
      choice,
      x: round(clamp(START.x + shift, 0, 1)),
      y: round(clamp(START.y + shift, 0, 1)),
      scale: 1,
      rotation: START.rotation,
    },
  ];
}

/** 끌기 — 바탕 비율만큼 옮기고 바탕 밖으로 나가지 않게 자릅니다. */
export function moveSticker(sticker: EditorSticker, dx: number, dy: number): EditorSticker {
  return {
    ...sticker,
    x: round(clamp(sticker.x + dx, 0, 1)),
    y: round(clamp(sticker.y + dy, 0, 1)),
  };
}

export type Point = { readonly x: number; readonly y: number };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/** 두 손가락 — 처음 두 점과 지금 두 점의 거리 비로 크기, 각도 차로 회전. */
export function pinchSticker(
  start: EditorSticker,
  from: readonly [Point, Point],
  to: readonly [Point, Point],
): EditorSticker {
  const before = distance(from[0], from[1]);
  const ratio = before === 0 ? 1 : distance(to[0], to[1]) / before;
  return {
    ...start,
    scale: round(clamp(start.scale * ratio, MIN_SCALE, MAX_SCALE)),
    rotation: round(start.rotation + angle(to[0], to[1]) - angle(from[0], from[1])),
  };
}

/** 스티커 → 서버 overlay(계약 `myStoryOverlaySchema`). */
export function overlayOf(sticker: EditorSticker): MyStoryOverlay {
  const { choice } = sticker;
  return {
    kind: choice.kind,
    ko: choice.ko,
    ...(choice.roman === "" ? {} : { roman: choice.roman }),
    ...(choice.meaning === "" ? {} : { meaning: choice.meaning }),
    word: choice.word,
    x: sticker.x,
    y: sticker.y,
    scale: sticker.scale,
    rotation: sticker.rotation,
  };
}

/**
 * 올릴 길 — 글 없이 스티커 하나면 기존 단어 · 카드 올리기(반응 각도 word를 살림), 글 서버에서 글이 있거나 스티커가 둘 이상이면 글 스토리.
 * 그 밖(빈 바탕 · 지금 서버의 글)은 null — Share가 꺼집니다.
 */
export function editorShareOf(
  background: StoryBackground,
  stickers: readonly EditorSticker[],
  text: EditorText | null,
  caps: EditorCaps,
): EditorShare | null {
  const [only] = stickers;
  if (text === null && stickers.length === 1 && only !== undefined)
    return { kind: "choice", choice: only.choice };
  if (!caps.text || (text === null && stickers.length === 0)) return null;
  return { kind: "text", background, text, overlays: stickers.map(overlayOf) };
}
