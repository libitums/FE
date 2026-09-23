// 진입 흐름의 언어 어휘 자리 (LIB-261 계약 §2.2). 순수 함수뿐이다.
//
// 라벨 표는 export하지 않는다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을
// 짓는다(`session-options.ts` · `screens/notifications/notifications.ts` 선례).
//
// LIB-261 (logic): 타입·시그니처는 계약 §2.2 최종본이다. 값·함수 본문도 이 단계가
// 계약 §0.3 D-b의 값으로 채운다.

// 2026-09-21 디자인 반영: 목록이 Intermediate English · Vietnamese · Spanish · Japanese로 바뀌었고
// 지금은 영어만 고를 수 있다(`isEntryLanguageAvailable`). 옛 목록(ko · en · ja · vi)을 대체한다.
export type EntryLanguage = "en" | "vi" | "es" | "ja";
export type EntryLanguageLabel = "Intermediate English" | "Vietnamese" | "Spanish" | "Japanese";

// 목록의 렌더 순서다.
export const entryLanguages: readonly EntryLanguage[] = ["en", "vi", "es", "ja"];

// `entryLanguages[0]`과 같은 값이어야 한다는 성질을 unit이 단언한다(계약 §0.3 D-b) —
// 리터럴이 아니라 「목록의 첫 항목」이라는 성질이다.
export const initialEntryLanguage: EntryLanguage = "en";

// `default` 없는 switch — 언어가 늘면 TS2366으로 선다.
export function entryLanguageLabel(language: EntryLanguage): EntryLanguageLabel {
  switch (language) {
    case "en": {
      return "Intermediate English";
    }
    case "vi": {
      return "Vietnamese";
    }
    case "es": {
      return "Spanish";
    }
    case "ja": {
      return "Japanese";
    }
  }
}

// 지금 고를 수 있는 언어인가. 영어 과정만 열려 있고 나머지는 목록에 보이되 고를 수 없다.
export function isEntryLanguageAvailable(language: EntryLanguage): boolean {
  switch (language) {
    case "en": {
      return true;
    }
    case "vi":
    case "es":
    case "ja": {
      return false;
    }
  }
}
