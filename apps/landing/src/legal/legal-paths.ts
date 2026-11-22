import type { LegalDocumentId, LegalLanguage } from "./legal.contract";

/** 본문이 있는 언어입니다. 첫째(영어)가 기준본이고 `/privacy/` · `/terms/`에 섭니다. */
export const legalLanguages: readonly LegalLanguage[] = ["en", "ko"];
export const legalDefaultLanguage: LegalLanguage = "en";

/** 문서의 순서입니다. 푸터와 문서 사이 링크가 이 순서로 섭니다. */
export const legalDocumentIds: readonly LegalDocumentId[] = ["terms", "privacy"];

/** 사이트 언어를 본문이 있는 언어로 바꿉니다. 번역본이 없는 언어는 기준본(영어)입니다. */
export const legalLanguageFor = (language: string): LegalLanguage =>
  legalLanguages.find((code) => code === language) ?? legalDefaultLanguage;

/** 그 언어판 문서의 사이트 루트 기준 주소입니다(`/privacy/` · `/ko/privacy/`). */
export const legalPathFor = (id: LegalDocumentId, language: LegalLanguage): string =>
  language === legalDefaultLanguage ? `/${id}/` : `/${language}/${id}/`;
