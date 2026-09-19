// 진입 흐름의 언어 어휘 자리 (LIB-261 계약 §2.2). 순수 함수뿐이다.
//
// 라벨 표는 export하지 않는다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을
// 짓는다(`session-options.ts` · `screens/notifications/notifications.ts` 선례).
//
// LIB-261 (logic): 타입·시그니처는 계약 §2.2 최종본이다. 값·함수 본문도 이 단계가
// 계약 §0.3 D-b의 값으로 채운다.

export type EntryLanguage = "ko" | "en" | "ja" | "vi";
export type EntryLanguageLabel = "한국어" | "English" | "日本語" | "Tiếng Việt";

// 계약 순서(§0.3 D-b) — 목록의 렌더 순서이기도 하다.
export const entryLanguages: readonly EntryLanguage[] = ["ko", "en", "ja", "vi"];

// `entryLanguages[0]`과 같은 값이어야 한다는 성질을 unit이 단언한다(계약 §0.3 D-b) —
// 리터럴이 아니라 「목록의 첫 항목」이라는 성질이다.
export const initialEntryLanguage: EntryLanguage = "ko";

// `default` 없는 switch — 언어가 늘면 TS2366으로 선다. 라벨은 자리표다(계약 §8) —
// `ui` 테스트가 리터럴을 단언하지 않는다.
export function entryLanguageLabel(language: EntryLanguage): EntryLanguageLabel {
  switch (language) {
    case "ko": {
      return "한국어";
    }
    case "en": {
      return "English";
    }
    case "ja": {
      return "日本語";
    }
    case "vi": {
      return "Tiếng Việt";
    }
  }
}
