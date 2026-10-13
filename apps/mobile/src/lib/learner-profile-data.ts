import "background-only";

// 내장 나라 표와 미리보기 틀의 접점입니다. 자산(`content/learner-profile.json`)은 백그라운드에서만 읽고,
// 화면은 `LearnerProfilePort`로만 닿습니다.

import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfilePreview,
} from "./learner-profile.contract";
import type { LearnerCountryText } from "./placeholder-fill";

export const learnerCountries: readonly LearnerCountry[] = [];

/** 소문자로 바꾸고 악센트 글자를 ASCII로 접습니다. */
export function foldLatin(text: string): string {
  return text;
}

export function searchLearnerCountries(
  countries: readonly LearnerCountry[],
  _query: string,
): readonly LearnerCountry[] {
  return countries;
}

/** 문장에 서는 세 표기입니다 — 관사가 있으면 `en` 앞에 붙습니다. */
export function learnerCountryTextOf(country: LearnerCountry): LearnerCountryText {
  return { ko: country.ko, roman: country.roman, en: country.en };
}

/** 미리보기입니다. 문장 틀과 견본 이름은 자산에서 읽습니다. */
export function learnerProfilePreviewOf(
  _name: string | null,
  _country: LearnerCountry | null,
): LearnerProfilePreview {
  return { kind: "example", lines: [] };
}

export const learnerProfilePort: LearnerProfilePort = {
  search: (query) => searchLearnerCountries(learnerCountries, query),
  byCode: () => null,
  previewOf: learnerProfilePreviewOf,
};
