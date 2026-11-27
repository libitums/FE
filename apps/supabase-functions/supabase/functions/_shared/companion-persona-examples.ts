// 페르소나 대화 예시(2026-11-28 Haiku 평가 루프의 증류). 인물마다 Opus가 쓴 모범 답 가운데 다른 Opus가 고른 6개 — 작은 모델이 인물의
// 목소리 · 길이 · 수준을 따라 하게 시스템 프롬프트 앞부분(캐시)에 싣는다. 페르소나 카드에 `examples`가 있으면 그쪽이 먼저다(나중에 DB로 옮길 자리).
// 표는 `scripts/haiku-loop/examples-build.py`가 만든다(손으로 고치지 않는다).

import type { PersonaCard, PersonaExample } from "./chat-send.contract.ts";
import { personaExampleTable } from "./companion-persona-examples.data.ts";

export function examplesFor(
  characterId: string | undefined,
  persona: Pick<PersonaCard, "examples">,
): readonly PersonaExample[] {
  if (persona.examples !== undefined) return persona.examples;
  return characterId === undefined ? [] : (personaExampleTable[characterId] ?? []);
}

/** 「Who you are」 뒤에 붙는 예시 절. 없으면 빈 글. */
export function examplesSection(examples: readonly PersonaExample[], name: string): string {
  if (examples.length === 0) return "";
  const body = examples
    .map((example) => {
      const before = (example.history ?? [])
        .map(([role, text]) => `${role === "user" ? "Learner" : name}: ${text}`)
        .join("\n");
      return `${before === "" ? "" : `${before}\n`}Learner: ${example.learner}\n${name}:\n${example.reply.join("\n")}`;
    })
    .join("\n\n");
  return `- Example exchanges — they show your voice, length and level. Never copy their lines, facts, jokes, props or gestures (find your own each time), and always follow the speech level under "This learner" even if it differs:\n${body}\n`;
}
