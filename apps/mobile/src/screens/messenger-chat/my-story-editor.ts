// 스토리 만들기 — 바탕 위 편집(시안 26 ~ 30) 판정. 순수. 서버가 받는 종류(`kinds`, 서버 반영 예상)에 따라 켤 도구 · 스티커 수 · 올릴 길을 가립니다.
// - 옛 서버(word · card): Aa 없음, 스티커 하나, 글 없이 스티커 하나일 때만 기존 단어 올리기.
// - 새 서버(#598, ADR-0191 D13 · D15 — kinds text · photo): 단어는 「색 바탕 + 단어」로 — word가 없어도 text가 있으면 단어를 얹어 글 스토리로.
// - `text`가 있으면: Aa(바탕 위 글 상자, 교정 없음 — 검수는 올리기 요청 안에서 서버가) · 얹을 것 여덟(서버 overlays 상한 `MY_STORY_OVERLAY_MAX`와 같음, 글 상자 포함), 글 스토리로 올리기.
// - `photo`가 있어야 시작 시트의 Camera · 최근 사진이 섭니다. 사진 위 편집은 늘 Aa · 얹기 여덟이고 사진 스토리로 올립니다(ADR-0199).

import { romanizeKorean } from "../../lib/korean-romanize";
import { storyTextOf } from "./my-story-lines";
import { photoLineOf } from "./my-story-photo";
import type {
  MyStoryChoice,
  MyStoryOverlay,
  MyStoryPostKind,
  StoryBackground,
  StoryTextColor,
} from "./my-stories.contract";

/** 바탕 위 자리 — 바탕에 대한 비율(가운데 기준) · 크기 배수 · 회전(도). */
export type Placement = {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
};

/** 편집 위 스티커(단어 · 카드). */
export type EditorSticker = Placement & { readonly id: string; readonly choice: MyStoryChoice };

/** 바탕 위 글 상자(Aa, 시안 29 · 30번) — 사용자가 쓴 글 그대로. 다른 스티커처럼 끌고 크기 · 회전을 바꿉니다(글자도 같은 비율). */
export type EditorText = Placement & {
  readonly ko: string;
  readonly color: StoryTextColor;
};

export type EditorCaps = {
  readonly text: boolean;
  /** 단어를 얹을 수 있는가 — 옛 서버의 word, 또는 색 바탕(text) 위 단어. */
  readonly word: boolean;
  /** 옛 단어 RPC(`companion_post_my_story`)로 올릴 수 있는가 — kinds에 word가 있을 때만. */
  readonly wordRpc: boolean;
  readonly photo: boolean;
  /** 얹을 수 있는 것의 수(글 상자 포함). */
  readonly maxStickers: number;
};

export type EditorShare =
  | { readonly kind: "choice"; readonly choice: MyStoryChoice }
  /** 사진 위(ADR-0199) — `ko`는 올릴 한 줄(`photoLineOf`). */
  | {
      readonly kind: "photo";
      readonly ko: string;
      readonly text: EditorText | null;
      readonly overlays: readonly MyStoryOverlay[];
    }
  | {
      readonly kind: "text";
      readonly background: StoryBackground;
      readonly text: EditorText | null;
      readonly overlays: readonly MyStoryOverlay[];
    };

/** 서버 `MY_STORY_OVERLAY_MAX`(계약 패키지) — 값을 가져오면 zod가 번들에 들어가 숫자만 둡니다. */
const OVERLAY_MAX = 8;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;
/** 새 스티커 자리 — 가운데 조금 아래, 살짝 기울여(시안 27번), 겹치지 않게 하나마다 비켜 놓습니다. */
const START = { x: 0.5, y: 0.55, rotation: -4, step: 0.06 } as const;
/** 새 글 상자 자리 — 가운데 위쪽(시안 29번), 기울이지 않음. */
const TEXT_START: Placement = { x: 0.5, y: 0.3, scale: 1, rotation: 0 };

export const STORY_BACKGROUNDS: readonly StoryBackground[] = ["orange", "green", "blue", "purple"];
export const STORY_TEXT_COLORS: readonly StoryTextColor[] = ["brown", "black", "white", "orange"];

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export const round = (value: number) => Math.round(value * 1000) / 1000;

/** 사진 위 편집(ADR-0199) — 사진 서버는 글 상자 · 얹기 여덟을 늘 받습니다(`my_stories.overlays` 상한). */
export const photoEditorCaps: EditorCaps = {
  text: true,
  word: true,
  wordRpc: false,
  photo: true,
  maxStickers: OVERLAY_MAX,
};

export function editorCapsOf(kinds: readonly MyStoryPostKind[]): EditorCaps {
  const text = kinds.includes("text");
  return {
    text,
    word: text || kinds.includes("word"),
    wordRpc: kinds.includes("word"),
    photo: kinds.includes("photo"),
    maxStickers: text ? OVERLAY_MAX : 1,
  };
}

/** 스티커 하나를 놓습니다 — 하나만 되는 서버면 바꿔 끼우고, 상한(글 상자 몫 포함)이면 그대로. */
export function placeSticker(
  stickers: readonly EditorSticker[],
  choice: MyStoryChoice,
  caps: EditorCaps,
  id: string,
  hasText = false,
): readonly EditorSticker[] {
  const base = caps.maxStickers <= 1 ? [] : stickers;
  if (base.length + (hasText ? 1 : 0) >= caps.maxStickers) return stickers;
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
export function moveSticker<T extends Placement>(item: T, dx: number, dy: number): T {
  return { ...item, x: round(clamp(item.x + dx, 0, 1)), y: round(clamp(item.y + dy, 0, 1)) };
}

export type Point = { readonly x: number; readonly y: number };

/** 모서리 손잡이로 키우고 줄이기(시안 30번) — 손잡이를 바깥(오른쪽 아래)으로 끄는 만큼 커집니다. 이 거리(px)를 끌면 두 배. */
const RESIZE_SPAN = 160;

export function resizeSticker<T extends Placement>(start: T, dx: number, dy: number): T {
  return {
    ...start,
    scale: round(clamp(start.scale * (1 + (dx + dy) / (2 * RESIZE_SPAN)), MIN_SCALE, MAX_SCALE)),
  };
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/** 두 손가락 — 처음 두 점과 지금 두 점의 거리 비로 크기, 각도 차로 회전. */
export function pinchSticker<T extends Placement>(
  start: T,
  from: readonly [Point, Point],
  to: readonly [Point, Point],
): T {
  const before = distance(from[0], from[1]);
  const ratio = before === 0 ? 1 : distance(to[0], to[1]) / before;
  return {
    ...start,
    scale: round(clamp(start.scale * ratio, MIN_SCALE, MAX_SCALE)),
    rotation: round(start.rotation + angle(to[0], to[1]) - angle(from[0], from[1])),
  };
}

/** 글 상자를 마침(Done) — 앞 글 상자가 있으면 자리를 잇습니다. 친 줄바꿈은 지킵니다(`storyTextOf`). 빈 글이면 null(상자 없앰). */
export function typedText(
  ko: string,
  color: StoryTextColor,
  before: EditorText | null,
): EditorText | null {
  const line = storyTextOf(ko);
  if (line === "") return null;
  const place: Placement = before ?? TEXT_START;
  return {
    x: place.x,
    y: place.y,
    scale: place.scale,
    rotation: place.rotation,
    ko: line,
    color,
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

/** 글 상자 → 서버 overlay(kind text) — 로마자는 앱이 만들고(romanizeKorean), 뜻 줄은 서버 몫이라 보내지 않습니다. 글자색은 서버 반영 예상 칸. */
export function textOverlayOf(text: EditorText): MyStoryOverlay {
  const roman = romanizeKorean(text.ko).trim();
  return {
    kind: "text",
    ko: text.ko,
    ...(roman === "" ? {} : { roman }),
    color: text.color,
    x: text.x,
    y: text.y,
    scale: text.scale,
    rotation: text.rotation,
  };
}

/**
 * 올릴 길 — 옛 단어 RPC를 받는 서버에서 글 없이 스티커 하나면 기존 단어 올리기(반응 각도 word를 살림), 그 밖에 글 서버면 글 스토리
 * (새 서버는 단어 하나도 「색 바탕 + 단어」).
 * 빈 바탕 · 지금 서버(text 없음)의 글은 null — Share가 꺼집니다. 글을 마치면(Done) 바로 켜집니다.
 */
export function editorShareOf(
  background: StoryBackground,
  stickers: readonly EditorSticker[],
  text: EditorText | null,
  caps: EditorCaps,
  photo = false,
): EditorShare | null {
  const overlays = () => [
    ...(text === null ? [] : [textOverlayOf(text)]),
    ...stickers.map(overlayOf),
  ];
  // 사진 위(ADR-0199) — 스티커 하나여도 사진 스토리로. 한 줄(서버 필수)이 없으면 Share 꺼짐.
  if (photo) {
    const ko = photoLineOf(text, stickers);
    return ko === null ? null : { kind: "photo", ko, text, overlays: overlays() };
  }
  const [only] = stickers;
  if (caps.wordRpc && text === null && stickers.length === 1 && only !== undefined)
    return { kind: "choice", choice: only.choice };
  if (!caps.text || (text === null && stickers.length === 0)) return null;
  return {
    kind: "text",
    background,
    text,
    overlays: overlays(),
  };
}
