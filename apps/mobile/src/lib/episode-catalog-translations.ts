import "background-only";

// 카탈로그의 원격 항목에 저장된 번역 파일을 입히는 순수 함수입니다(ADR-0102 D3). `episode-catalog.ts`가 커서 떼어 둡니다.

import type { ContentLanguage, Episode, EpisodeTranslations } from "./episode-content";
import type { ManifestEntry } from "./episode-manifest";
import { decodeTranslationFile, withTranslationFiles } from "./episode-translation-files";

/** 항목이 적은 언어마다 저장 원문이 맞는 파일이면 그 표로 바꾼 에피소드, 하나도 없으면 같은 객체입니다. */
export function translationTablesOf(
  entry: ManifestEntry,
  episode: Episode,
  stored: Readonly<Record<string, string>> | undefined,
): Episode {
  if (entry.translations === undefined || stored === undefined) return episode;
  const tables: { [L in ContentLanguage]?: Readonly<Record<string, string>> } = {};
  for (const language of Object.keys(entry.translations) as ContentLanguage[]) {
    const text = stored[language];
    if (text === undefined) continue;
    const table = decodeTranslationFile(text, { episodeId: entry.id, language });
    if (table !== null) tables[language] = table;
  }
  return withTranslationFiles(episode, tables as EpisodeTranslations);
}

/**
 * 원격이 이겼지만 같은 id 내장본으로 열 때(자산을 다 받기 전) — 내장본에 **없는** 언어만 저장 파일 표로 채웁니다. 내장본에
 * 있는 언어는 그 판의 표를 지킵니다(다른 판의 파일과 섞지 않음, D3). 채울 것이 없으면 같은 객체입니다.
 */
export function missingTranslationTablesOf(
  entry: ManifestEntry,
  episode: Episode,
  stored: Readonly<Record<string, string>> | undefined,
): Episode {
  if (stored === undefined) return episode;
  const own = episode.translations ?? {};
  const missing: Record<string, string> = {};
  for (const [language, text] of Object.entries(stored)) {
    if (!(language in own)) missing[language] = text;
  }
  // 채울 언어가 없으면 표 덧씌우기를 부르지 않고 같은 객체를 돌려줍니다.
  if (Object.keys(missing).length === 0) return episode;
  return translationTablesOf(entry, episode, missing);
}
