// 바탕 위 글 상자(Aa)의 줄 · 크기 · 끝단(A안, 사용자 결정 2026-11-25) — 순수. 편집 · 보기(친구 화면 · 보관함 · 내 스토리 보기)가 같은 규칙을 씁니다.

import { round, type Placement } from "./my-story-editor";
import { placedFit, type CanvasBox } from "./my-story-fit";

/** 글 상자 한 줄의 폭(한글 글자 수) — 바탕 80% 폭 · heading-m 22px 기준. */
const LINE_UNITS = 12;
const unitOf = (ch: string): number => (ch === " " ? 0.3 : ch.charCodeAt(0) > 0x2e7f ? 1 : 0.6);
export const unitsOf = (word: string): number => {
  let sum = 0;
  for (const ch of word) sum += unitOf(ch);
  return sum;
};

/**
 * 글 상자의 줄(A안, 사용자 결정 2026-11-25) — 띄어쓰기로 나누고 한 줄 폭을 넘는 낱말은 자릅니다. 크기와 무관한 규칙이라 키우고 줄여도
 * 줄이 다시 흐르지 않고, 편집 · 보기(친구 화면 · 보관함)가 같은 줄을 그립니다. 사용자가 친 줄바꿈(`\n`)에서 먼저 나눕니다 — 서버엔 `ko`를
 * 줄바꿈 그대로 보냅니다(overlay 글은 서버가 그대로 저장, 2026-11-27 확인).
 */
export function storyTextLines(ko: string): string[] {
  const lines: string[] = [];
  for (const typed of ko.split("\n")) lines.push(...wrapLine(typed));
  return lines;
}

/** 사용자가 친 한 줄을 한 줄 폭에 맞춰 나눕니다(띄어쓰기 기준, 긴 낱말은 자름). */
function wrapLine(typed: string): string[] {
  const lines: string[] = [];
  let line = "";
  let used = 0;
  for (const word of typed.split(" ")) {
    let rest = word;
    while (rest !== "") {
      const need = unitsOf(rest);
      if (line !== "" && used + unitOf(" ") + need <= LINE_UNITS) {
        line = `${line} ${rest}`;
        used += unitOf(" ") + need;
        rest = "";
      } else if (line === "" && need <= LINE_UNITS) {
        line = rest;
        used = need;
        rest = "";
      } else if (line !== "") {
        lines.push(line);
        line = "";
        used = 0;
      } else {
        // 한 줄보다 긴 낱말 — 폭만큼 잘라 한 줄로.
        let cut = "";
        let width = 0;
        for (const ch of rest) {
          if (width + unitOf(ch) > LINE_UNITS) break;
          cut += ch;
          width += unitOf(ch);
        }
        lines.push(cut);
        rest = rest.slice(cut.length);
      }
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/**
 * 글 상자 그리기 크기 — 확정한 크기(`settled`)는 글자 · 줄 높이 · 안쪽 여백에 곱해 선명하게, 끄는 동안 바뀐 몫(`scale / settled`)만
 * transform(`live`)으로 둡니다. 손을 떼면 settled = scale이 되어 live 1(같은 가운데 기준이라 튀지 않음).
 */
export function textBoxSizeOf(scale: number, settled: number) {
  return {
    fontSize: `${round(22 * settled)}px`,
    lineHeight: `${round(28 * settled)}px`,
    // 작게 해도 최소 여백 — ×·손잡이(상자 모서리, 고정 크기)가 글자와 겹치지 않고 끝 글자가 테두리에 닿지 않게.
    padding: `${round(Math.max(8 * settled, 8))}px ${round(Math.max(12 * settled, 14))}px`,
    live: round(scale / settled),
  };
}

/** 글 상자의 테두리 합(px, 좌우 · 위아래 2px씩). */
const TEXT_BORDER = 4;

/** 글 상자를 크기 s로 확정했을 때의 px 크기(회전 전) — 가장 긴 줄 · 줄 수 · 안쪽 여백(`textBoxSizeOf`) · 테두리. */
export function textBoxPx(ko: string, scale: number) {
  return textBoxAt(textBaseOf(ko), scale);
}

/** 크기 1의 가장 긴 줄 폭 · 줄 수 — 끝단 찾기가 크기마다 줄을 다시 나누지 않게 한 번만 셉니다. */
function textBaseOf(ko: string) {
  const lines = storyTextLines(ko);
  let line = 0;
  for (const each of lines) line = Math.max(line, unitsOf(each) * 22);
  return { line, count: lines.length };
}

const textBoxAt = (base: { line: number; count: number }, scale: number) => ({
  width: base.line * scale + 2 * Math.max(12 * scale, 14) + TEXT_BORDER,
  height: base.count * 28 * scale + 2 * Math.max(8 * scale, 8) + TEXT_BORDER,
});

/**
 * 글 상자 끝단 — 회전한 상자의 외접 사각형이 바탕(가장자리 여백 · 오른쪽 도구 열 뺌) 안에 들 때까지만 커지고(서버 상한 3과 둘 중 작은
 * 값), 자리는 그 사각형이 바탕 안에 남게 안쪽으로 밉니다(`placedFit`). 끄는 중 · 돌리는 중에도 같은 상한. 바탕 폭을 모르면(0) 그대로.
 */
export function textFit(
  ko: string,
  place: Pick<Placement, "scale" | "x" | "y"> & { readonly rotation?: number },
  canvas: CanvasBox,
  settled: number = place.scale,
) {
  const base = textBaseOf(ko);
  if (base.count === 0) return { scale: place.scale, x: place.x, y: place.y };
  return placedFit((scale) => textBoxAt(base, scale), place, canvas, settled);
}
