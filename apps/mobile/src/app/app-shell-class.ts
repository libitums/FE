// 앱 뿌리 요소의 클래스입니다(순수). 베트남어면 강조 글꼴 토큰을 다시 정의하는 클래스를 더합니다(ADR-0091 D5).
// 일본어면 글꼴 토큰 전체에 일본어 글꼴을 먼저 두는 클래스를 더합니다(ADR-0098 D4).
// 미얀마어면 줄 간격 토큰을 넓히는 클래스를 더합니다 — 위아래로 쌓이는 글자가 줄끼리 닿습니다(ADR-0158 개정 2026-11-20).

import type { EntryLanguage } from "../lib/entry-language";

function languageClassOf(language: EntryLanguage): string | null {
  if (language === "vi") return "app-lang-vi";
  if (language === "ja") return "app-lang-ja";
  if (language === "my") return "app-lang-my";
  return null;
}

export function appShellClassName(splash: boolean, language: EntryLanguage): string {
  return ["app", splash ? "app-splash" : null, languageClassOf(language)]
    .filter((name) => name !== null)
    .join(" ");
}
