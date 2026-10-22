// 로마자 줄을 강조 조각으로 나누고 빈칸 문장을 채우는 순수 함수입니다.

export type TextRoleSize = "m" | "s";

/** 문자열 안 범위입니다(시작 인덱스 · 길이). */
export type TextSpan = { readonly start: number; readonly length: number };

export type RomanizationSegment = { readonly text: string; readonly emphasis: "none" | "answer" };

/** 범위 밖이거나 길이 0이면 강조 없는 한 조각입니다(던지지 않습니다). 빈 조각은 만들지 않습니다. */
export function romanizationSegmentsOf(
  text: string,
  emphasis: TextSpan | undefined,
): readonly RomanizationSegment[] {
  const whole: readonly RomanizationSegment[] = [{ text, emphasis: "none" }];
  if (emphasis === undefined) return whole;
  const { start, length } = emphasis;
  if (!(start >= 0) || !(length > 0) || start + length > text.length) return whole;
  const segments: RomanizationSegment[] = [];
  if (start > 0) segments.push({ text: text.slice(0, start), emphasis: "none" });
  segments.push({ text: text.slice(start, start + length), emphasis: "answer" });
  if (start + length < text.length) {
    segments.push({ text: text.slice(start + length), emphasis: "none" });
  }
  return segments;
}

const blankMarker = "___";

/** 첫 `___`를 정답 로마자로 바꾼 전체 문장과 그 조각의 범위입니다. 채울 수 없으면 문맥 그대로입니다. */
export function clozeRomanizationOf(
  contextRoman: string,
  answerRoman: string | undefined,
): { readonly text: string; readonly emphasis?: TextSpan } {
  const answer = answerRoman?.trim();
  const at = contextRoman.indexOf(blankMarker);
  if (!answer || at < 0) return { text: contextRoman };
  return {
    text: contextRoman.slice(0, at) + answer + contextRoman.slice(at + blankMarker.length),
    emphasis: { start: at, length: answer.length },
  };
}
