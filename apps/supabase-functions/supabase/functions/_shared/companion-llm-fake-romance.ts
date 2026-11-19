// 가짜 LLM(`companion-llm-fake.ts`)의 로맨스 · 성 판정(검사 단계). 낱말로 수위선을 흉내 낸다 — 실제 품질과 무관하다.
//
// 수위선(ADR-0152): 성적인 말과 포옹을 넘는 스킨십(「키스」 · 「뽀뽀」)은 모든 연령에서 입력 차단, 로맨스 말(「사랑해」)은 성인이 아니면 차단.
// 완화 수위(open, ADR-0163): 스킨십과 로맨스 말은 통과, 성적인 말은 입력 · 출력 모두 차단(`sexual`).

import type { ModerationRequest, ModerationVerdict } from "./chat-send.contract.ts";
import { effectiveRomanceTier, romanceAllowed } from "./companion-safety.ts";

const sexualWords = ["[block]", "섹스", "sex"];
const intimacyWords = ["키스", "뽀뽀", "kiss"];
const romanceWords = ["사랑해"];

/** 걸리면 판정, 아니면 null(다른 규칙이 본다). `text`는 소문자로 바꾼 글. */
export function fakeRomanceVerdict(
  request: Pick<ModerationRequest, "layer" | "ageBand" | "romanceTier">,
  text: string,
): ModerationVerdict | null {
  const open = effectiveRomanceTier(request.ageBand, request.romanceTier) === "open";
  const has = (words: readonly string[]) => words.some((word) => text.includes(word));
  if (request.layer !== "input")
    return open && has(sexualWords) ? { category: "sexual", action: "block" } : null;
  if (has(sexualWords)) return { category: "sexual", action: "block" };
  if ((!open && has(intimacyWords)) || (!romanceAllowed(request.ageBand) && has(romanceWords)))
    return { category: "romance", action: "block" };
  return null;
}
