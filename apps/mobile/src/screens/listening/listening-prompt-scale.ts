// 제시문의 글자 크기를 문장 길이에서 정합니다. 경계는 한글 주인공 줄의 단계 규칙
// (`koreanTextStepOf`, regular)과 같은 값입니다 — 그 단계에 맞춘 세 갈래 이름만 남겨 둡니다.

import { koreanTextStepOf } from "../../lib/korean-text-step";

/** 제시문 크기 단계입니다. l = display(한 줄), m = heading-l(두 줄까지), s = 그보다 긴 글입니다. */
export type ListeningPromptScale = "l" | "m" | "s";

export function listeningPromptScale(text: string): ListeningPromptScale {
  const step = koreanTextStepOf(text, "regular");
  if (step === "display") return "l";
  return step === "heading-l" ? "m" : "s";
}
