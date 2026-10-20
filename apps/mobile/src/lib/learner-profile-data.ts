import "background-only";

// 내장 나라 표와 미리보기 틀의 접점입니다. 자산(`content/learner-profile.json`)은 백그라운드에서만 읽고,
// 화면은 `LearnerProfilePort`로만 닿습니다.

import assetJson from "../../content/learner-profile.json";
import type {
  LearnerCountry,
  LearnerProfilePort,
  LearnerProfilePreview,
} from "./learner-profile.contract";
import { learnerCountryTextOf, learnerNameFrom, pickLearnerName } from "./learner-profile";
import { fillPlaceholders } from "./placeholder-fill";

export { learnerCountryTextOf };

type PreviewTemplate = { readonly ko: string; readonly en: string };
type Asset = {
  readonly sampleName: string;
  readonly name: PreviewTemplate;
  readonly country: PreviewTemplate;
  readonly countries: readonly LearnerCountry[];
  readonly randomNames: readonly string[];
};

const isText = (value: unknown): value is string => typeof value === "string" && value !== "";

function templateFrom(raw: unknown): PreviewTemplate {
  const { ko, en } = (raw ?? {}) as { ko?: unknown; en?: unknown };
  if (!isText(ko) || !isText(en)) {
    throw new Error("learner profile asset: invalid preview template");
  }
  return { ko, en };
}

/** `[code, ko, roman, en]` 또는 `[…, 0 | 1, "별칭|별칭"]` 한 행입니다. */
function countryFrom(row: unknown): LearnerCountry {
  const cells = Array.isArray(row) ? (row as unknown[]) : [];
  const [code, ko, roman, en, article, aliases] = cells;
  if (!isText(code) || !isText(ko) || !isText(roman) || !isText(en)) {
    throw new Error(`learner profile asset: invalid country row ${JSON.stringify(row)}`);
  }
  const names = isText(aliases) ? aliases.split("|") : [];
  return {
    code,
    ko,
    roman,
    en,
    ...(article === 1 ? { article: "the" as const } : {}),
    ...(names.length > 0 ? { aliases: names } : {}),
  };
}

// 내장 자산은 코드와 함께 배포되는 데이터라, 디코드 실패는 빌드 시점 결함입니다. 런타임 무예외 원칙의
// 예외로 모듈 평가에서 던집니다(`episode-bundled.ts`의 매니페스트와 같습니다).
function assetFrom(raw: unknown): Asset {
  const { preview, countries, randomNames } = (raw ?? {}) as {
    preview?: unknown;
    countries?: unknown;
    randomNames?: unknown;
  };
  const { sampleName, name, country } = (preview ?? {}) as {
    sampleName?: unknown;
    name?: unknown;
    country?: unknown;
  };
  if (!isText(sampleName) || !Array.isArray(countries) || !Array.isArray(randomNames)) {
    throw new Error("learner profile asset: invalid shape");
  }
  // 무작위 이름은 그대로 이름 칸에 서므로 이름 규칙(ADR-0059 D5)을 지켜야 합니다.
  const names = (randomNames as unknown[]).map((name) => {
    const checked = typeof name === "string" ? learnerNameFrom(name) : null;
    if (checked === null || !checked.ok || checked.name !== name) {
      throw new Error(`learner profile asset: invalid random name ${JSON.stringify(name)}`);
    }
    return checked.name;
  });
  if (names.length < 2) throw new Error("learner profile asset: too few random names");
  return {
    sampleName,
    name: templateFrom(name),
    country: templateFrom(country),
    countries: (countries as unknown[]).map(countryFrom),
    randomNames: names,
  };
}

const asset = assetFrom(assetJson);

/** 이름 칸에 미리 채우는 무작위 이름 목록입니다(여러 문화권의 짧은 이름). */
export const learnerRandomNames: readonly string[] = asset.randomNames;

/** 영어 이름 순으로 실린 나라 표입니다. */
export const learnerCountries: readonly LearnerCountry[] = asset.countries;

const ACCENT_FOLDS: readonly (readonly [RegExp, string])[] = [
  [/[àáâãäå]/g, "a"],
  [/ç/g, "c"],
  [/[èéêë]/g, "e"],
  [/[ìíîï]/g, "i"],
  [/ñ/g, "n"],
  [/[òóôõö]/g, "o"],
  [/[ùúûü]/g, "u"],
  [/[ýÿ]/g, "y"],
  [/[‘’ʼ]/g, "'"],
];

/** 소문자로 바꾸고 악센트 글자를 ASCII로 접습니다. */
export function foldLatin(text: string): string {
  let folded = text.toLowerCase();
  for (const [pattern, replacement] of ACCENT_FOLDS) {
    folded = folded.replace(pattern, replacement);
  }
  return folded;
}

const WORD_BREAK = /[ -]/;

/** 질의와 이름의 어울림 순위입니다(작을수록 앞). 어울리지 않으면 `null`. */
function rankOf(country: LearnerCountry, query: string): number | null {
  const key = foldLatin(country.en);
  if (key.startsWith(query)) {
    return 0;
  }
  if (key.split(WORD_BREAK).some((word) => word.startsWith(query))) {
    return 1;
  }
  if (key.includes(query)) {
    return 2;
  }
  return (country.aliases ?? []).some((alias) => alias.startsWith(query)) ? 3 : null;
}

export function searchLearnerCountries(
  countries: readonly LearnerCountry[],
  query: string,
): readonly LearnerCountry[] {
  const folded = foldLatin(query).replace(/\s+/g, " ").trim();
  if (folded === "") {
    return countries;
  }
  // 안정 정렬에 기대지 않고 순위 묶음 넷에 입력 순서대로 밀어 넣은 뒤 잇습니다.
  const buckets: LearnerCountry[][] = [[], [], [], []];
  for (const country of countries) {
    const rank = rankOf(country, folded);
    if (rank !== null) {
      buckets[rank]?.push(country);
    }
  }
  return ([] as LearnerCountry[]).concat(...buckets);
}

/** 미리보기입니다. 문장 틀과 견본 이름은 자산에서 읽습니다. */
export function learnerProfilePreviewOf(
  name: string | null,
  country: LearnerCountry | null,
): LearnerProfilePreview {
  if (name === null && country === null) {
    const profile = { name: asset.sampleName };
    return {
      kind: "example",
      lines: [
        {
          ko: fillPlaceholders(asset.name.ko, profile, "ko"),
          en: fillPlaceholders(asset.name.en, profile, "en"),
        },
      ],
    };
  }
  const profile = {
    ...(name === null ? {} : { name }),
    ...(country === null ? {} : { country: learnerCountryTextOf(country) }),
  };
  const lines = [
    ...(name === null ? [] : [asset.name]),
    ...(country === null ? [] : [asset.country]),
  ].map((template) => ({
    ko: fillPlaceholders(template.ko, profile, "ko"),
    en: fillPlaceholders(template.en, profile, "en"),
  }));
  return { kind: "yours", lines };
}

const countriesByCode = new Map<string, LearnerCountry>(
  learnerCountries.map((country): [string, LearnerCountry] => [country.code, country]),
);

export const learnerProfilePort: LearnerProfilePort = {
  search: (query) => searchLearnerCountries(learnerCountries, query),
  byCode: (code) => countriesByCode.get(code) ?? null,
  previewOf: learnerProfilePreviewOf,
  randomName: (previous) => pickLearnerName(learnerRandomNames, previous, Math.random),
};
