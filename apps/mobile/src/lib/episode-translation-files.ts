import "background-only";

// 언어별 번역 파일(`translation-1`, ADR-0102)의 디코더와 에피소드 표 덧씌우기입니다. 순수 함수만 둡니다.
// 표 정규화(문자열 아닌 값 · 빈 값 버림)는 본문 안 표와 같은 episode-core `translationsOf`를 씁니다.

import { translationsOf } from "./episode-content";
import type { ContentLanguage, Episode, EpisodeTranslations } from "./episode-content";

export type TranslationFileTarget = {
  readonly episodeId: string;
  readonly language: ContentLanguage;
};

function parsed(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** 그 에피소드 · 언어의 `translation-1` 파일이면 남은 표, 아니면(틀림 · 빈 표) `null`입니다. 던지지 않습니다. */
export function decodeTranslationFile(
  text: string,
  target: TranslationFileTarget,
): Readonly<Record<string, string>> | null {
  const doc = parsed(text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return null;
  const { schema, episode, language, entries } = doc as Record<string, unknown>;
  if (schema !== "translation-1" || episode !== target.episodeId || language !== target.language) {
    return null;
  }
  return translationsOf({ [target.language]: entries }).translations?.[target.language] ?? null;
}

/**
 * 파일 표가 있는 언어는 본문 표를 통째로 바꾼 사본입니다 — 한 언어 안에서 두 출처를 섞지 않습니다(D3). 덧씌울 표가
 * 없으면 같은 객체입니다. 입력을 바꾸지 않습니다.
 */
export function withTranslationFiles(episode: Episode, tables: EpisodeTranslations): Episode {
  if (Object.keys(tables).length === 0) return episode;
  return { ...episode, translations: { ...episode.translations, ...tables } };
}
