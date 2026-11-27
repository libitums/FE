// 글 상자(Aa)의 줄바꿈 — 순수. 사용자가 친 줄바꿈(Enter)을 지키고, 빈 줄 · 앞뒤 공백 · 너무 많은 줄은 정리합니다.

/** 글 상자의 줄 수 상한(사용자가 친 줄바꿈 기준) — 넘는 줄은 마지막 줄에 띄어 붙입니다. */
export const TEXT_LINES_MAX = 8;

/** 쓴 글 → 올릴 글. 줄마다 앞뒤 공백을 지우고 빈 줄은 뺍니다. 줄이 없으면 빈 글. */
export function storyTextOf(typed: string): string {
  const lines = typed
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length <= TEXT_LINES_MAX) return lines.join("\n");
  const head = lines.slice(0, TEXT_LINES_MAX - 1);
  const tail = lines.slice(TEXT_LINES_MAX - 1).join(" ");
  return [...head, tail].join("\n");
}
