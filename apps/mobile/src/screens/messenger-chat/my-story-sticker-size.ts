// 단어 스티커의 크기 — 순수. 글 상자와 같은 방식: 확정한 크기(`settled`)는 글자 셋(단어 · 로마자 · 뜻)의 글자 · 줄 높이 · 사이 · 안쪽
// 여백에 곱해 선명하게 그리고, 끄는 동안 바뀐 몫(`scale / settled`)만 transform으로 둡니다. 편집 · 보기가 같은 함수를 씁니다.

import { round, type Placement } from "./my-story-editor";
import { placedFit, type CanvasBox } from "./my-story-fit";
import { unitsOf } from "./my-story-text";

/** 스티커 글자 셋 — 로마자 · 뜻이 비면 그 줄을 그리지 않습니다. */
export type StickerWords = {
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
};

/** 크기 1의 값(px) — heading-m 22/28 · caption 11/16 · label-m 12/16, 줄 사이 2, 안쪽 여백 8/16. */
const KO = { font: 22, line: 28 } as const;
const ROMAN = { font: 11, line: 16 } as const;
const MEANING = { font: 12, line: 16 } as const;
const GAP = 2;
/** 스티커 테두리 합(px) — 고르면 2px 점선이라 큰 쪽으로. */
const STICKER_BORDER = 4;

const px = (value: number) => `${round(value)}px`;
const padY = (scale: number) => Math.max(8 * scale, 8);
const padX = (scale: number) => Math.max(16 * scale, 14);

/** 그리기 값 — 작게 해도 최소 여백(×·손잡이가 글자와 겹치지 않게). */
export function stickerSizeOf(scale: number, settled: number) {
  const text = (size: { font: number; line: number }) => ({
    fontSize: px(size.font * settled),
    lineHeight: px(size.line * settled),
  });
  return {
    ko: text(KO),
    roman: text(ROMAN),
    meaning: text(MEANING),
    gap: px(GAP * settled),
    padding: `${px(padY(settled))} ${px(padX(settled))}`,
    live: round(scale / settled),
  };
}

/** 크기 1의 글자 몫(여백 · 테두리 빼고) — 가장 넓은 줄 · 줄 높이 합 · 사이. 끝단 찾기가 크기마다 다시 세지 않게 한 번만 셉니다. */
function stickerBaseOf(words: StickerWords) {
  const rows = [
    { text: words.ko, size: KO },
    { text: words.roman, size: ROMAN },
    { text: words.meaning, size: MEANING },
  ].filter((row, index) => index === 0 || row.text !== "");
  let width = 0;
  let height = 0;
  for (const row of rows) {
    width = Math.max(width, unitsOf(row.text) * row.size.font);
    height += row.size.line;
  }
  return { width, height: height + GAP * (rows.length - 1) };
}

const stickerBoxAt = (base: { width: number; height: number }, scale: number) => ({
  width: base.width * scale + 2 * padX(scale) + STICKER_BORDER,
  height: base.height * scale + 2 * padY(scale) + STICKER_BORDER,
});

/** 스티커를 크기 s로 확정했을 때의 px 크기(회전 전) — 가장 넓은 줄 · 줄 높이 합 · 사이 · 여백 · 테두리. */
export function stickerBoxPx(words: StickerWords, scale: number) {
  return stickerBoxAt(stickerBaseOf(words), scale);
}

/** 스티커 끝단 — 글 상자와 같은 규칙(`placedFit`): 회전한 외접 사각형이 바탕(여백 · 도구 열 뺌) 안. */
export function stickerFit(
  words: StickerWords,
  place: Pick<Placement, "scale" | "x" | "y" | "rotation">,
  canvas: CanvasBox,
  settled: number = place.scale,
) {
  const base = stickerBaseOf(words);
  return placedFit((scale) => stickerBoxAt(base, scale), place, canvas, settled);
}
