// 로마자 줄을 강조 조각으로 나누고 빈칸 문장을 채우는 순수 함수입니다. 껍데기만 있는 단계입니다.

export type TextRoleSize = "m" | "s";

/** 문자열 안 범위입니다(시작 인덱스 · 길이). */
export type TextSpan = { readonly start: number; readonly length: number };

export type RomanizationSegment = { readonly text: string; readonly emphasis: "none" | "answer" };

export function romanizationSegmentsOf(
  text: string,
  _emphasis: TextSpan | undefined,
): readonly RomanizationSegment[] {
  return [{ text, emphasis: "none" }];
}

export function clozeRomanizationOf(
  contextRoman: string,
  _answerRoman: string | undefined,
): { readonly text: string; readonly emphasis?: TextSpan } {
  return { text: contextRoman };
}
