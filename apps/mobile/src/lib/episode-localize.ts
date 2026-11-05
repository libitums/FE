// 콘텐츠의 영어 칸을 UI 언어 번역으로 바꾸는 자리입니다(ADR-0091 D2). 순수 함수뿐입니다.
//
// 화면 매핑(`englishOf` 등)은 고치지 않습니다 — 그 앞에서 에피소드 전체에 한 번 적용하면 모든 화면이 같은 번역을
// 받습니다. 화면 경로가 닿는 파일이라 `lib/episode-*`는 타입만 가져옵니다.

import type { CatalogEntry } from "./episode-catalog";
import type { Episode, EpisodeTranslations } from "./episode-content.model";
import { measureTask } from "./perf-probe";
import type { UiLanguage } from "./ui-copy.contract";

/** 영어가 실리는 칸 이름입니다. 한국어 설명(`whyWrong`) · 로마자 · id는 들지 않습니다. */
const ENGLISH_KEYS: ReadonlySet<string> = new Set(["en", "glossEn", "titleEn"]);

function tableOf(episode: Episode, language: UiLanguage): Readonly<Record<string, string>> | null {
  const translations: EpisodeTranslations | undefined = episode.translations;
  if (translations === undefined || !(language in translations)) return null;
  return translations[language as keyof EpisodeTranslations] ?? null;
}

function translated(node: unknown, table: Readonly<Record<string, string>>): unknown {
  if (Array.isArray(node)) return node.map((child) => translated(child, table));
  if (node === null || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    out[key] =
      ENGLISH_KEYS.has(key) && typeof value === "string"
        ? (table[value] ?? value)
        : translated(value, table);
  }
  return out;
}

/** 그 언어 번역표가 있으면 영어 칸을 바꾼 사본, 없으면(영어 포함) 같은 객체입니다. 입력을 바꾸지 않습니다. */
export function localizeEpisode(episode: Episode, language: UiLanguage): Episode {
  const table = tableOf(episode, language);
  return table === null ? episode : (translated(episode, table) as Episode);
}

const memo = new WeakMap<readonly CatalogEntry[], Map<UiLanguage, readonly CatalogEntry[]>>();

/**
 * 카탈로그의 ready 항목마다 `localizeEpisode`를 적용합니다. 영어면 같은 카탈로그, 같은 (카탈로그, 언어)면 같은
 * 결과 객체입니다 — 레슨 계획 메모가 항목 참조를 키로 씁니다.
 */
export function localizeCatalog(
  catalog: readonly CatalogEntry[],
  language: UiLanguage,
): readonly CatalogEntry[] {
  if (language === "en") return catalog;
  let byLanguage = memo.get(catalog);
  if (byLanguage === undefined) {
    byLanguage = new Map();
    memo.set(catalog, byLanguage);
  }
  const cached = byLanguage.get(language);
  if (cached !== undefined) return cached;
  const localized = measureTask("catalog.localize", () =>
    catalog.map((entry) => {
      if (entry.status !== "ready") return entry;
      const episode = localizeEpisode(entry.episode, language);
      return episode === entry.episode ? entry : { ...entry, episode };
    }),
  );
  byLanguage.set(language, localized);
  return localized;
}
