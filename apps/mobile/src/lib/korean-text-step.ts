// 한글 주인공 줄의 글자 단계를 글자 수와 밀도로 고르는 순수 함수입니다.
//
// 자동 축소(글자를 상자에 맞춰 줄이기)를 쓰지 않습니다. 길이에서 단계를 고르면 같은 문항은
// 어디서나 같은 크기이고, 그 규칙을 unit이 봅니다. 경계는 카드 폭(약 336pt)에서 한 줄 · 두 줄에
// 들어가는 한글 글자 수입니다 — display 한 줄 10자, heading-l 두 줄 24자.

import type { LearningDensity } from "./learning-density";
import type { TextRoleSize } from "./romanization-segments";

export type KoreanTextStep = "display" | "heading-l" | "heading-m" | "heading-s";

const regularLineLength = 10;
const regularCapacity = 24;

const steps: readonly KoreanTextStep[] = ["display", "heading-l", "heading-m", "heading-s"];

/** 공백도 한 자로 셉니다. compact는 같은 길이에서 한 단계 아래입니다. */
export function koreanTextStepOf(text: string, density: LearningDensity): KoreanTextStep {
  const length = text.length;
  const base = length <= regularLineLength ? 0 : length <= regularCapacity ? 1 : 2;
  return steps[density === "compact" ? base + 1 : base] ?? "heading-s";
}

export type KoreanBrandTone = "brand-primary" | "fg-brand";

/** 가장 작은 단계는 큰 글자 기준 대비가 모자라 글자색 쪽 주황을 씁니다. */
export function koreanBrandToneOf(step: KoreanTextStep): KoreanBrandTone {
  return step === "heading-s" ? "fg-brand" : "brand-primary";
}

/** 로마자 크기는 한글 단계에서 나옵니다. */
export function romanizationSizeFor(step: KoreanTextStep): TextRoleSize {
  return step === "display" || step === "heading-l" ? "m" : "s";
}
