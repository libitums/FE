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
