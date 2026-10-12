// 카탈로그 머리 카드 제목을 띄어쓰기에서만 끊어 최대 두 줄로 나눕니다.
export type CatalogTitleLines = {
  readonly lines: readonly string[];
  readonly size: "default" | "compact";
};

// 글자 수는 코드포인트로 셉니다 — UTF-16 길이로 세면 이모지 같은 글자가 둘로 잡힙니다.
const countChars = (text: string): number => Array.from(text).length;

export function catalogTitleLines(title: string, maxCharsPerLine: number): CatalogTitleLines {
  const words = title.split(" ");
  // 한 줄에 들어가거나 끊을 띄어쓰기가 없으면 한 줄 그대로입니다.
  if (words.length < 2 || countChars(title) <= maxCharsPerLine) {
    return { lines: [title], size: countChars(title) > maxCharsPerLine ? "compact" : "default" };
  }

  let best: readonly string[] = [title];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let cut = 1; cut < words.length; cut += 1) {
    const first = words.slice(0, cut).join(" ");
    const second = words.slice(cut).join(" ");
    const diff = Math.abs(countChars(first) - countChars(second));
    // 같은 차이면 앞쪽 자리를 씁니다.
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [first, second];
    }
  }

  const overflow = best.some((line) => countChars(line) > maxCharsPerLine);
  return { lines: best, size: overflow ? "compact" : "default" };
}
