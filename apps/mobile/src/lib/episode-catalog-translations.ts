import "background-only";

// 카탈로그의 원격 항목에 저장된 번역 파일을 입히는 순수 함수입니다(ADR-0102 D3). `episode-catalog.ts`가 커서 떼어 둡니다.

import type { ContentLanguage, Episode, EpisodeTranslations } from "./episode-content";
import type { ManifestEntry } from "./episode-manifest";
import { decodeTranslationFile, withTranslationFiles } from "./episode-translation-files";

/** 저장 파일 원문을 그 편 · 언어의 표로 풉니다 — 틀린 파일(다른 편 · 다른 언어 · 깨진 JSON)은 건너뜁니다. */
function tablesOf(
  id: string,
  stored: Readonly<Record<string, string>>,
  languages: readonly string[],
): EpisodeTranslations {
  const tables: { [L in ContentLanguage]?: Readonly<Record<string, string>> } = {};
  for (const language of languages as ContentLanguage[]) {
    const text = stored[language];
    if (text === undefined) continue;
    const table = decodeTranslationFile(text, { episodeId: id, language });
    if (table !== null) tables[language] = table;
  }
  return tables as EpisodeTranslations;
}

/**
 * 항목이 적은 언어마다 저장 원문이 맞는 파일이면 그 표로 바꿉니다(ADR-0102 D3). 항목이 적지 않은 언어는 본문에 그 언어 표가
 * **없을 때만** 저장 파일로 채웁니다 — 새 판을 보류한 편은 활성 항목이 옛 것이라 나중에 생긴 언어(zh-TW · th · my)를 적지
 * 않습니다(2026-11-27 제보). 바꿀 것이 없으면 같은 객체입니다.
 */
export function translationTablesOf(
  entry: ManifestEntry,
  episode: Episode,
  stored: Readonly<Record<string, string>> | undefined,
): Episode {
  if (stored === undefined) return episode;
  const listed = Object.keys(entry.translations ?? {});
  const own = episode.translations ?? {};
  const missing = Object.keys(stored).filter(
    (language) => !listed.includes(language) && !(language in own),
  );
  return withTranslationFiles(episode, tablesOf(entry.id, stored, [...listed, ...missing]));
}

/**
 * 원격이 이겼지만 같은 id 내장본으로 열 때(자산을 다 받기 전) — 내장본에 **없는** 언어만 저장 파일 표로 채웁니다. 내장본에
 * 있는 언어는 그 판의 표를 지킵니다(다른 판의 파일과 섞지 않음, D3). 이긴 항목이 그 언어를 적었는지는 보지 않습니다.
 * 채울 것이 없으면 같은 객체입니다.
 */
export function missingTranslationTablesOf(
  entry: ManifestEntry,
  episode: Episode,
  stored: Readonly<Record<string, string>> | undefined,
): Episode {
  if (stored === undefined) return episode;
  const own = episode.translations ?? {};
  const missing = Object.keys(stored).filter((language) => !(language in own));
  return withTranslationFiles(episode, tablesOf(entry.id, stored, missing));
}
