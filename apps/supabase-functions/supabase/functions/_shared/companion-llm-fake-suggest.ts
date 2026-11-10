// 가짜 LLM 계층(`companion-llm-fake.ts`)의 추천 답변 칩 후보. 최근 대화의 낱말로 검증 실패를 일부러 일으킨다 — 「[suggest-bad]」 ·
// 「[unsafe-suggest]」 · 「[suggest-dup]」 · 「[suggest-none]」(`companion-llm-fake.ts` 머리말).

import type { SuggestRequest, SuggestionDraft } from "./companion-suggest.contract.ts";
import { suggestionMeaningLanguage } from "./companion-suggest-prompts.ts";

export function fakeSuggestions(request: SuggestRequest): SuggestionDraft[] {
  const recent = request.history.map((entry) => entry.text).join("\n");
  const language = suggestionMeaningLanguage(request.l1);
  const polite = (request.speechLevel ?? "polite") === "polite";
  const lines: [string, string][] = polite
    ? [
        ["elaborate", "저도 오늘 한국어 공부를 조금 했어요."],
        ["ask", `${request.character.name}은 오늘 뭐 했어요?`],
        ["reflect", "와, 정말 재미있었겠어요!"],
      ]
    : [
        ["elaborate", "나도 오늘 한국어 공부를 조금 했어."],
        ["ask", "너는 오늘 뭐 했어?"],
        ["reflect", "와, 진짜 재미있었겠다!"],
      ];
  if (recent.includes("[unsafe-suggest]")) lines[2] = ["reflect", "[unsafe] 위험한 칩이에요"];
  // 「[suggest-dup]」 → 둘째 후보가 첫째와 거의 같다(검증에서 빠짐). 「[suggest-none]」 → 모두 서식 위반(통과 0).
  if (recent.includes("[suggest-dup]")) lines[1] = ["ask", lines[0]![1].replace(".", "!")];
  if (recent.includes("[suggest-none]")) for (const line of lines) line[1] = `*${line[1]}*`;
  const items = lines.map(([intent, text]) => ({
    intent,
    text,
    meaning: language === null ? null : `[${language}] ${text}`,
  }));
  return recent.includes("[suggest-bad]") ? items.slice(0, 2) : items;
}
