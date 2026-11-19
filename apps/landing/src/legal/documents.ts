import type { LegalDocument, LegalDocumentId, LegalLanguage } from "./legal.contract";
import { privacyEn } from "./privacy-en";
import { privacyKo } from "./privacy-ko";
import { termsEn } from "./terms-en";
import { termsKo } from "./terms-ko";

/** 법률 문서 전부입니다. 문서를 더하거나 언어판을 더하면 여기에 올립니다(README 「법률 문서」). */
export const legalDocuments: Record<LegalDocumentId, Record<LegalLanguage, LegalDocument>> = {
  privacy: { en: privacyEn, ko: privacyKo },
  terms: { en: termsEn, ko: termsKo },
};

export const legalDocument = (id: LegalDocumentId, language: LegalLanguage): LegalDocument =>
  legalDocuments[id][language];
