// 앱 뿌리 요소의 클래스입니다(순수). 베트남어면 강조 글꼴 토큰을 다시 정의하는 클래스를 더합니다(ADR-0091 D5).
// 일본어면 글꼴 토큰 전체에 일본어 글꼴을 먼저 두는 클래스를 더합니다(ADR-0098 D4).

import type { EntryLanguage } from "../lib/entry-language";

export function appShellClassName(splash: boolean, language: EntryLanguage): string {
  const languageClass =
    language === "vi" ? "app-lang-vi" : language === "ja" ? "app-lang-ja" : null;
  return ["app", splash ? "app-splash" : null, languageClass]
    .filter((name) => name !== null)
    .join(" ");
}
