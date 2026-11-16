// 첫 인사의 정해진 말입니다 — 생성 실패 때의 정해진 인사(`greetingLines`)와 해금 선톡(`unlockLines`, ADR-0152).
// 답 모델을 부르지 않는 글이라 `companion-greet-handler.ts`에서 떼어 둡니다.

import type { PersonaCard, Segment } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";

/** 페르소나 칸 `greetingLines`(마이그레이션 20261121) — 말투 단계별 정해진 첫 인사. 없는 칸은 아래 기본 줄. */
export type GreetingPersona = PersonaCard & {
  readonly greetingLines?: Partial<Record<SpeechLevel, string>>;
  /** 정해진 첫 말의 말풍선들(마이그레이션 20261204) — 해금 순간, 그리고 방이 비었을 때의 첫 인사. 첫 만남이라 존댓말 한 벌뿐이다. */
  readonly unlockLines?: readonly string[];
};

const defaultLines: Record<SpeechLevel, string> = {
  polite: "안녕하세요! 만나서 반가워요. 오늘 하루는 어땠어요?",
  casual: "안녕! 만나서 반가워. 오늘 하루는 어땠어?",
  slang: "안녕! 반가워~ 오늘 어땠어?",
};

/** 정해진 첫 인사 — 페르소나의 그 말투 줄, 없으면 페르소나의 존댓말 줄, 그것도 없으면 기본 줄. */
export function cannedGreeting(persona: GreetingPersona, speechLevel: SpeechLevel): Segment[] {
  const lines = persona.greetingLines;
  return [
    { kind: "speech", text: lines?.[speechLevel] ?? lines?.polite ?? defaultLines[speechLevel] },
  ];
}

/** 해금 선톡 — 페르소나의 정해진 말풍선들. 칸이 없거나 비었으면 정해진 첫 인사 한 줄. */
export function unlockGreeting(persona: GreetingPersona, speechLevel: SpeechLevel): Segment[] {
  const lines = (persona.unlockLines ?? [])
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return lines.length === 0
    ? cannedGreeting(persona, speechLevel)
    : lines.map((text) => ({ kind: "speech", text }));
}
