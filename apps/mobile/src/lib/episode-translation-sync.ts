import "background-only";

// 받기 차례의 번역 단계(ADR-0102 D3) — 지금 UI 언어의 번역 파일만 받아 sha256을 맞춰 보고 저장합니다. 던지지 않습니다.
// 번역은 텍스트라 요금제 연결에서도 받습니다(ADR-0095 D5의 「본문」 줄). 한 편이 실패해도 다음 편으로 갑니다.

import { contentTranslationKey, safeGet, trySet } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import type { ContentLanguage } from "./episode-content";
import type { EpisodeManifest } from "./episode-manifest";
import type { FetchText, FetchTextResult } from "./episode-remote";
import { decodeTranslationFile } from "./episode-translation-files";
import { sha256Hex, utf8Bytes } from "./sha256";

export type TranslationSyncInput = {
  readonly fetchText: FetchText;
  readonly store: ContentStore;
  readonly manifest: EpisodeManifest;
  /** 받을 언어 — 영어(원문)면 `null`이라 아무것도 받지 않습니다. */
  readonly language: ContentLanguage | null;
};

const shaOf = (text: string): string => sha256Hex(utf8Bytes(text));

async function safeFetch(fetchText: FetchText, relative: string): Promise<FetchTextResult> {
  try {
    return await fetchText(relative, { kind: "fresh" });
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** 새로 저장한 `<언어>/<id>` 목록을 돌려줍니다. 저장된 원문의 sha가 같으면 받지 않습니다. */
export async function syncTranslations(input: TranslationSyncInput): Promise<string[]> {
  const { fetchText, store, manifest, language } = input;
  if (language === null) return [];
  const stored: string[] = [];
  for (const entry of manifest.episodes) {
    const ref = entry.translations?.[language];
    if (ref === undefined) continue;
    const key = contentTranslationKey(language, entry.id);
    const current = safeGet(store, key);
    if (current !== null && shaOf(current) === ref.sha256) continue;
    const reply = await safeFetch(fetchText, ref.url);
    if (!reply.ok || reply.status !== 200 || shaOf(reply.text) !== ref.sha256) continue;
    if (decodeTranslationFile(reply.text, { episodeId: entry.id, language }) === null) continue;
    if (trySet(store, key, reply.text)) stored.push(`${language}/${entry.id}`);
  }
  return stored;
}
