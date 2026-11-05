import "background-only";

// 받기 차례의 번역 단계(ADR-0102 D3) — 지금 UI 언어의 번역 파일만 받아 sha256을 맞춰 보고 저장합니다. 던지지 않습니다.
// 번역은 텍스트라 요금제 연결에서도 받습니다(ADR-0095 D5의 「본문」 줄). 한 편이 실패해도 다음 편으로 갑니다.

import { contentTranslationKey, safeGet, trySet } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import type { ContentLanguage } from "./episode-content";
import type { EpisodeManifest, TranslationRef } from "./episode-manifest";
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

/** 동시에 받는 파일 수 — 그림 · 음성 받기와 같습니다(ADR-0071). */
const CONCURRENCY = 4;

/** 한 편의 번역 파일 — 같은 sha면 건너뛰고, 받아 검증한 뒤 저장했으면 `<언어>/<id>`, 아니면 `null`입니다. */
async function syncOne(
  input: TranslationSyncInput,
  language: ContentLanguage,
  id: string,
  ref: TranslationRef,
): Promise<string | null> {
  const key = contentTranslationKey(language, id);
  const current = safeGet(input.store, key);
  if (current !== null && shaOf(current) === ref.sha256) return null;
  const reply = await safeFetch(input.fetchText, ref.url);
  if (!reply.ok || reply.status !== 200 || shaOf(reply.text) !== ref.sha256) return null;
  if (decodeTranslationFile(reply.text, { episodeId: id, language }) === null) return null;
  return trySet(input.store, key, reply.text) ? `${language}/${id}` : null;
}

/** 새로 저장한 `<언어>/<id>` 목록(매니페스트 순서)을 돌려줍니다. 4개까지 동시에 받습니다. */
export async function syncTranslations(input: TranslationSyncInput): Promise<string[]> {
  const { manifest, language } = input;
  if (language === null) return [];
  const jobs = manifest.episodes.flatMap((entry) => {
    const ref = entry.translations?.[language];
    return ref === undefined ? [] : [{ id: entry.id, ref }];
  });
  const results: (string | null)[] = new Array<string | null>(jobs.length).fill(null);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      const job = jobs[index];
      if (job !== undefined) results[index] = await syncOne(input, language, job.id, job.ref);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  return results.filter((stored): stored is string => stored !== null);
}
