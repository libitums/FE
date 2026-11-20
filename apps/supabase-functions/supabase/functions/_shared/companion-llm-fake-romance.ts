// 가짜 LLM(`companion-llm-fake.ts`)의 로맨스 · 성 판정(검사 단계). 낱말로 수위선을 흉내 낸다 — 실제 품질과 무관하다.
//
// 적용 로맨스 선(ADR-0168): 성적인 말은 어느 선이든 입력 · 출력 모두 차단(`sexual`). 키스(「키스」 · 「뽀뽀」)는 kiss 선부터 통과,
// 로맨스 말(「사랑해」)은 성인이 아니면(none) 차단. 통과한 로맨스 낱말은 운영처럼 `allow` + `romance`로 남긴다(트래킹).

import type { ModerationRequest, ModerationVerdict } from "./chat-send.contract.ts";
import { defaultRomanceLine, romanceAtLeast } from "./companion-safety.ts";

const sexualWords = ["[block]", "섹스", "sex"];
const intimacyWords = ["키스", "뽀뽀", "kiss"];
const romanceWords = ["사랑해"];

/** 로맨스 · 성 낱말이 있으면 판정(차단 또는 허용 + `romance`), 없으면 null(다른 규칙이 본다). `text`는 소문자로 바꾼 글. */
export function fakeRomanceVerdict(
  request: Pick<ModerationRequest, "layer" | "ageBand" | "romanceLine">,
  text: string,
): ModerationVerdict | null {
  const line = request.romanceLine ?? defaultRomanceLine(request.ageBand);
  const has = (words: readonly string[]) => words.some((word) => text.includes(word));
  if (has(sexualWords)) return { category: "sexual", action: "block" };
  const intimacy = has(intimacyWords);
  const romance = has(romanceWords);
  if (
    request.layer === "input" &&
    ((!romanceAtLeast(line, "kiss") && intimacy) || (line === "none" && romance))
  )
    return { category: "romance", action: "block" };
  return intimacy || romance ? { category: "romance", action: "allow" } : null;
}
