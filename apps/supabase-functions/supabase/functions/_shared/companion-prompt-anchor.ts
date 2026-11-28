// 이번 턴 지시 — 매 턴 인물 상기문(post-history instruction, 2026-11-28 Haiku 평가 루프 i8)과 지시 잇기.
// `companion-prompt.ts`가 다시 내보낸다(파일 길이 제한으로 나눔).

import type { PersonaCard } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";

/**
 * 매 턴 상기문(post-history instruction) — 학습자 말 뒤의 이번 턴 지시에 늘 붙인다. 긴 대화에서 작은 모델이 인물을 잃고 기본 말투로 돌아가는 것을
 * 막는다(2026-11-28 Haiku 평가 루프 i8). 짧고 긍정형으로.
 */
export function personaAnchor(persona: PersonaCard, speechLevel: SpeechLevel): string {
  const level = speechLevel === "polite" ? "polite 해요체" : "반말";
  const style = persona.speech
    ? ` ${persona.speech.replace(/\s+$/, "").replace(/[.。]?$/, ".")}`
    : "";
  return `Reply as ${persona.name}, in your own voice.${style} Keep it to 1 or 2 short chat bubbles in ${level} with easy everyday words, react first to what they just said, and ask at most one question.`;
}

/** 이번 턴 지시 여러 개를 한 system 메시지로. 빈 것은 뺀다. */
export const joinDirectives = (...parts: readonly (string | null | undefined)[]): string | null => {
  const kept = parts.filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );
  return kept.length === 0 ? null : kept.join("\n\n");
};
