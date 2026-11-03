// 앱 뿌리 요소의 클래스입니다(순수). 베트남어면 강조 글꼴 토큰을 다시 정의하는 클래스를 더합니다(ADR-0091 D5).

import type { EntryLanguage } from "../lib/entry-language";

export function appShellClassName(splash: boolean, language: EntryLanguage): string {
  return ["app", splash ? "app-splash" : null, language === "vi" ? "app-lang-vi" : null]
    .filter((name) => name !== null)
    .join(" ");
}
