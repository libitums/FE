// 화면 언어별 나라 이름(`country-names/<lang>.json`, ADR-0059 개정 2026-11-19) — 미리보기 뜻 줄 · 레슨 번역 줄의 `{나라}`에 섭니다.
// 번들 천장 때문에 표는 앱에 싣지 않고 콘텐츠 버킷에서 받아 기기에 둡니다(받기는 `country-names-refresh.ts`). 받기 전 · 실패 ·
// 오프라인이면 표가 없고 영어 이름이 섭니다. 디코드 · 읽기는 순수이고 던지지 않습니다. 어느 스레드든 안전합니다(저장소가 없는
// 스레드에서는 읽지 않고 기억하지도 않습니다).

import { getItem, isStorageAvailable } from "./storage";

/** 나라 이름 표를 따로 받는 화면 언어입니다(en은 영어 이름). th · my는 2026-11-20 화면 문구와 함께(ADR-0158 개정), zh-TW는 2026-11-24(ADR-0185) 더했습니다. */
export const COUNTRY_NAME_LANGUAGES: readonly string[] = [
  "es",
  "id",
  "ja",
  "vi",
  "th",
  "my",
  "zh-TW",
];

/** 콘텐츠 버킷 기준 상대 경로입니다. */
export const countryNamesPath = (language: string): string => `country-names/${language}.json`;
/** 검증을 통과한 원문을 두는 저장소 키입니다. */
export const countryNamesKey = (language: string): string =>
  `libitum.content.country-names.${language}`;

export type CountryNameTable = Readonly<Record<string, string>>;

const COUNTRY_CODE = /^[A-Z]{2}$/;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 원문을 표로 좁힙니다 — `schema`가 `country-names-1`이고 `language`가 맞고, `names`의 키가 대문자 두 글자 · 값이 빈 글자가
 * 아니어야 합니다. 하나라도 어기면 `null`(표를 통째로 버림).
 */
export function decodeCountryNames(text: string, language: string): CountryNameTable | null {
  const parsed = parseJson(text);
  if (!isPlainRecord(parsed) || parsed["schema"] !== "country-names-1") return null;
  if (parsed["language"] !== language) return null;
  const names = parsed["names"];
  if (!isPlainRecord(names)) return null;
  const table: Record<string, string> = {};
  for (const code of Object.keys(names)) {
    const name = names[code];
    if (!COUNTRY_CODE.test(code) || typeof name !== "string" || name.trim() === "") return null;
    table[code] = name;
  }
  return Object.keys(table).length === 0 ? null : table;
}

// 언어마다 한 번 읽어 둔 표(없으면 null) — 렌더마다 저장소를 부르지 않습니다. 받기가 새 원문을 두면 `rememberCountryNames`가 바꿉니다.
const tables = new Map<string, CountryNameTable | null>();

/** 받기가 검증 · 저장한 원문을 바로 기억합니다(다음 렌더부터 섭니다). 못 읽는 원문이면 표를 지웁니다. */
export function rememberCountryNames(language: string, text: string | null): void {
  tables.set(language, text === null ? null : decodeCountryNames(text, language));
}

/** 그 언어의 표 — 기기에 받아 둔 것이 없거나 그 언어의 표가 따로 없으면 null. */
export function storedCountryNames(language: string): CountryNameTable | null {
  if (!COUNTRY_NAME_LANGUAGES.includes(language)) return null;
  const known = tables.get(language);
  if (known !== undefined) return known;
  if (!isStorageAvailable()) return null;
  let text: string | null = null;
  try {
    text = getItem(countryNamesKey(language));
  } catch {
    text = null;
  }
  rememberCountryNames(language, text);
  return tables.get(language) ?? null;
}

/** 테스트 · 세션 초기화용입니다. */
export function forgetCountryNames(): void {
  tables.clear();
}
