// 바탕 위 글 상자(Aa)의 줄 · 크기 · 끝단(A안, 사용자 결정 2026-11-25) — 순수. 편집 · 보기(친구 화면 · 보관함 · 내 스토리 보기)가 같은 규칙을 씁니다.

import { clamp, MAX_SCALE, MIN_SCALE, round, type Placement } from "./my-story-editor";

/** 글 상자 한 줄의 폭(한글 글자 수) — 바탕 80% 폭 · heading-m 22px 기준. */
const LINE_UNITS = 12;
const unitOf = (ch: string): number => (ch === " " ? 0.3 : ch.charCodeAt(0) > 0x2e7f ? 1 : 0.6);
const unitsOf = (word: string): number => {
  let sum = 0;
  for (const ch of word) sum += unitOf(ch);
  return sum;
};

/**
 * 글 상자의 줄(A안, 사용자 결정 2026-11-25) — 띄어쓰기로 나누고 한 줄 폭을 넘는 낱말은 자릅니다. 크기와 무관한 규칙이라 키우고 줄여도
 * 줄이 다시 흐르지 않고, 편집 · 보기(친구 화면 · 보관함)가 같은 줄을 그립니다. 서버엔 `ko` 그대로(줄바꿈 문자 없이) 보냅니다.
 */
export function storyTextLines(ko: string): string[] {
  const lines: string[] = [];
  let line = "";
  let used = 0;
  for (const word of ko.split(" ")) {
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
    fontSize: `${22 * settled}px`,
    lineHeight: `${28 * settled}px`,
    // 작게 해도 최소 여백 — ×·손잡이(상자 모서리, 고정 크기)가 글자와 겹치지 않고 끝 글자가 테두리에 닿지 않게.
    padding: `${Math.max(8 * settled, 8)}px ${Math.max(12 * settled, 14)}px`,
    live: round(scale / settled),
  };
}

/** 바탕 좌우 여백(px) — 상자 모서리의 ×·손잡이가 바탕 안 · Android 화면 끝 제스처 영역(약 24dp) 밖에 남게. */
const TEXT_EDGE = 36;
/** 상자의 좌우 안쪽 여백 합(px, 최소값 기준). */
const TEXT_PAD = 28;

/**
 * 글 상자 끝단 — 크기는 가장 긴 줄이 바탕 폭(좌우 여백 뺌) 안에 들 때까지만(서버 상한 3과 둘 중 작은 값), 자리(x)는 상자가 바탕 안에
 * 남게 자릅니다. 끄는 중에도 같은 상한입니다. 바탕 폭을 모르면(0) 그대로.
 */
export function textFit(
  ko: string,
  place: Pick<Placement, "scale" | "x" | "y">,
  canvas: { readonly width: number; readonly height: number },
) {
  const { scale, x, y } = place;
  const lines = storyTextLines(ko);
  let line = 0;
  for (const each of lines) line = Math.max(line, unitsOf(each) * 22);
  if (canvas.width <= 0 || canvas.height <= 0 || line <= 0) return { scale, x, y };
  const fitted = round(
    clamp(Math.min(scale, (canvas.width - 2 * TEXT_EDGE - TEXT_PAD) / line), MIN_SCALE, MAX_SCALE),
  );
  const inside = (value: number, half: number) =>
    half >= 0.5 ? 0.5 : round(clamp(value, half, 1 - half));
  const edgeX = TEXT_EDGE / canvas.width;
  const edgeY = TEXT_EDGE / canvas.height;
  return {
    scale: fitted,
    x: inside(x, (line * fitted + TEXT_PAD) / 2 / canvas.width + edgeX),
    y: inside(y, (lines.length * 28 * fitted + 16) / 2 / canvas.height + edgeY),
  };
}
