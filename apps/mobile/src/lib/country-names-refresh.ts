import "background-only";

// 화면 언어의 나라 이름 표(`country-names/<lang>.json`)를 한 번 받아 기기에 두는 한 차례입니다(ADR-0059 개정 2026-11-19).
// `app-policy-refresh.ts`와 같은 규칙 — 유효하면 저장, 서버에 없으면 저장본 제거, 그 밖 실패 · 형식 틀림은 저장본을 둡니다.
import {
  COUNTRY_NAME_LANGUAGES,
  countryNamesKey,
  countryNamesPath,
  decodeCountryNames,
  rememberCountryNames,
} from "./country-names";
import { ABSENT_HTTP_CODES } from "./episode-asset-sync";
import { safeAvailable, safeGet, tryRemove, trySet } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import type { FetchText, FetchTextResult } from "./episode-remote";
import { loadUiLanguage } from "./ui-language";

export type CountryNamesRefresh =
  | "skipped"
  | "updated"
  | "unchanged"
  | "removed"
  | "absent"
  | "unavailable"
  | "invalid";

export type CountryNamesRefreshDeps = {
  readonly fetchText: FetchText;
  readonly store: ContentStore;
  /** 화면 언어(없으면 저장된 UI 언어) — 표가 따로 없는 언어(en · th · my)면 받지 않습니다. */
  readonly language?: string;
};

async function safeFetch(fetchText: FetchText, path: string): Promise<FetchTextResult> {
  try {
    return await fetchText(path, { kind: "fresh" });
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * 그 언어의 표를 분 단위 키(`?m=`)로 한 번 받습니다. 유효하면 원문을 저장하고 기억하며(같으면 그대로), 서버에 없으면
 * (400 · 403 · 404 · 410) 저장본을 지우고, 그 밖 실패 · 형식 틀림은 저장본을 둡니다. 던지지 않습니다.
 */
export async function refreshCountryNames(
  deps: CountryNamesRefreshDeps,
): Promise<CountryNamesRefresh> {
  const { fetchText, store } = deps;
  const language = deps.language ?? loadUiLanguage();
  if (!COUNTRY_NAME_LANGUAGES.includes(language)) return "skipped";
  if (!safeAvailable(store)) return "unavailable";
  const key = countryNamesKey(language);
  const reply = await safeFetch(fetchText, countryNamesPath(language));
  if (!reply.ok) return "unavailable";
  if (ABSENT_HTTP_CODES.has(reply.status)) {
    if (safeGet(store, key) === null) return "absent";
    if (!tryRemove(store, key)) return "unavailable";
    rememberCountryNames(language, null);
    return "removed";
  }
  if (reply.status !== 200) return "unavailable";
  if (decodeCountryNames(reply.text, language) === null) return "invalid";
  if (safeGet(store, key) === reply.text) return "unchanged";
  if (!trySet(store, key, reply.text)) return "unavailable";
  rememberCountryNames(language, reply.text);
  return "updated";
}

// 이 실행에서 네 언어를 한 번 받았는가 — 실행마다 처음 한 번입니다(앱 프로세스 단위).
let launched = false;

/**
 * 받기 차례 하나의 나라 이름 표 받기(2026-11-19 — 오프라인에서 언어를 바꿔도 이름이 있게). 실행의 첫 차례는 지금 언어와 상관없이
 * es · id · ja · vi 넷을 차례로 받아 새것 · 바뀐 것을 저장합니다(파일이 작습니다). 그 뒤 차례 — 언어를 바꿔 저장했을 때 · 호스트
 * 신호 — 는 지금 언어의 표가 기기에 없을 때만 그 하나를 받습니다. 던지지 않습니다.
 */
export async function syncCountryNames(
  deps: CountryNamesRefreshDeps,
): Promise<readonly CountryNamesRefresh[]> {
  if (!launched) {
    launched = true;
    const results: CountryNamesRefresh[] = [];
    for (const language of COUNTRY_NAME_LANGUAGES) {
      results.push(await refreshCountryNames({ ...deps, language }));
    }
    return results;
  }
  const language = deps.language ?? loadUiLanguage();
  if (!COUNTRY_NAME_LANGUAGES.includes(language)) return ["skipped"];
  if (safeGet(deps.store, countryNamesKey(language)) !== null) return ["unchanged"];
  return [await refreshCountryNames({ ...deps, language })];
}

/** 테스트 · 세션 초기화용입니다. */
export function resetCountryNamesSync(): void {
  launched = false;
}
