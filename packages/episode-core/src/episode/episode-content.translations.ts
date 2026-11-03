// 에피소드 최상위 번역표의 정규화입니다(ADR-0091 D1) — 「영어 원문 → 번역」. 순수 함수만 둡니다.
// 틀린 부분은 버리고 경고 하나를 남깁니다. 에피소드를 거부하지 않습니다.

import type { ContentLanguage, DecodeIssue, EpisodeTranslations } from "./episode-content.model";
import { isRecord, issue } from "./episode-content.normalize";

const LANGUAGES: readonly ContentLanguage[] = ["vi", "id"];

export type TranslationsPlan = {
  readonly translations: EpisodeTranslations | undefined;
  readonly warnings: readonly DecodeIssue[];
};

/** 와이어 `translations` → 도메인 표. 모르는 언어 키는 조용히 버립니다. */
export function translationsOf(wire: unknown): TranslationsPlan {
  if (wire === undefined) return { translations: undefined, warnings: [] };
  const invalid = (path: string, message: string): TranslationsPlan => ({
    translations: undefined,
    warnings: [issue("invalid-translation", path, message)],
  });
  if (!isRecord(wire)) return invalid("translations", "translations must be an object");
  const result: { [L in ContentLanguage]?: Record<string, string> } = {};
  const warnings: DecodeIssue[] = [];
  for (const language of LANGUAGES) {
    const table = wire[language];
    if (table === undefined) continue;
    if (!isRecord(table)) {
      warnings.push(issue("invalid-translation", `translations.${language}`, "must be an object"));
      continue;
    }
    const kept: Record<string, string> = {};
    let dropped = 0;
    for (const [english, translated] of Object.entries(table)) {
      if (typeof translated === "string" && translated.trim() !== "") kept[english] = translated;
      else dropped += 1;
    }
    if (dropped > 0) {
      warnings.push(
        issue(
          "invalid-translation",
          `translations.${language}`,
          `dropped ${dropped} entries that are not non-empty strings`,
        ),
      );
    }
    if (Object.keys(kept).length > 0) result[language] = kept;
  }
  return { translations: Object.keys(result).length > 0 ? result : undefined, warnings };
}
