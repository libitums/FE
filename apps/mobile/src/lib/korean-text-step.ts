// 한글 주인공 줄의 글자 단계를 글자 수와 밀도로 고르는 순수 함수입니다. 껍데기만 있는 단계입니다.

import type { LearningDensity } from "./learning-density";
import type { TextRoleSize } from "./romanization-segments";

export type KoreanTextStep = "display" | "heading-l" | "heading-m" | "heading-s";

export function koreanTextStepOf(_text: string, _density: LearningDensity): KoreanTextStep {
  return "display";
}

export type KoreanBrandTone = "brand-primary" | "fg-brand";

export function koreanBrandToneOf(_step: KoreanTextStep): KoreanBrandTone {
  return "brand-primary";
}

export function romanizationSizeFor(_step: KoreanTextStep): TextRoleSize {
  return "m";
}
