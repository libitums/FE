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

/** 받아야 할 번역 파일 한 편입니다 — 저장된 원문이 없거나 sha가 다를 때만 생깁니다. */
export type TranslationJob = { readonly id: string; readonly ref: TranslationRef };

/** 그 언어에서 받아야 할 편들(매니페스트 순서)입니다. 영어(원문)면 빈 목록입니다. 던지지 않습니다. */
export function translationJobsOf(
  manifest: EpisodeManifest,
  language: ContentLanguage | null,
  store: ContentStore,
): TranslationJob[] {
  if (language === null) return [];
  return manifest.episodes.flatMap((entry) => {
    const ref = entry.translations?.[language];
    if (ref === undefined) return [];
    const current = safeGet(store, contentTranslationKey(language, entry.id));
    return current !== null && shaOf(current) === ref.sha256 ? [] : [{ id: entry.id, ref }];
  });
}

// 같은 파일(언어 · 편 · sha)을 받는 중이면 그 약속을 함께 씁니다 — 받기 차례와 언어 바꿈 받기가 겹쳐도 요청은 한 번입니다.
const inflight = new Map<string, Promise<string | null>>();

/** 한 편의 번역 파일 — 같은 sha면 건너뛰고, 받아 검증한 뒤 저장했으면 `<언어>/<id>`, 아니면 `null`입니다. */
async function fetchAndStore(
  input: TranslationSyncInput,
  language: ContentLanguage,
  { id, ref }: TranslationJob,
): Promise<string | null> {
  const key = contentTranslationKey(language, id);
  const current = safeGet(input.store, key);
  if (current !== null && shaOf(current) === ref.sha256) return null;
  const reply = await safeFetch(input.fetchText, ref.url);
  if (!reply.ok || reply.status !== 200 || shaOf(reply.text) !== ref.sha256) return null;
  if (decodeTranslationFile(reply.text, { episodeId: id, language }) === null) return null;
  return trySet(input.store, key, reply.text) ? `${language}/${id}` : null;
}

function syncOne(
  input: TranslationSyncInput,
  language: ContentLanguage,
  job: TranslationJob,
): Promise<string | null> {
  const key = `${language}/${job.id}/${job.ref.sha256}`;
  const running = inflight.get(key);
  if (running !== undefined) return running;
  const started = fetchAndStore(input, language, job).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, started);
  return started;
}

/** 언어 하나의 받기 결과 — 새로 저장한 `<언어>/<id>` · 받지 못한 편 수 · 받을 편 수입니다. */
export type TranslationSyncReport = {
  readonly stored: string[];
  readonly failed: number;
  readonly total: number;
};

/**
 * 받아야 할 편만 4개까지 동시에 받습니다. 한 편이 끝날 때마다 `onProgress(끝낸 편, 받을 편)`를 부릅니다. 이미 저장소에 같은
 * 파일이 있으면(다른 받기가 먼저 저장) 실패로 세지 않습니다.
 */
export async function syncTranslationsReport(
  input: TranslationSyncInput & { readonly onProgress?: (done: number, total: number) => void },
): Promise<TranslationSyncReport> {
  const { language } = input;
  if (language === null) return { stored: [], failed: 0, total: 0 };
  const jobs = translationJobsOf(input.manifest, language, input.store);
  const results: (string | null)[] = new Array<string | null>(jobs.length).fill(null);
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      const job = jobs[index];
      if (job !== undefined) results[index] = await syncOne(input, language, job);
      done += 1;
      input.onProgress?.(done, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  const stored = results.filter((value): value is string => value !== null);
  // 이 차례가 저장하지 못한 편 중 저장소에도 맞는 파일이 없는 편만 실패입니다(겹친 받기가 먼저 저장했으면 성공).
  const failed = jobs.filter((job, index) => {
    if (results[index] !== null) return false;
    const current = safeGet(input.store, contentTranslationKey(language, job.id));
    return current === null || shaOf(current) !== job.ref.sha256;
  }).length;
  return { stored, failed, total: jobs.length };
}

/** 새로 저장한 `<언어>/<id>` 목록(매니페스트 순서)을 돌려줍니다 — 받기 차례가 씁니다. */
export async function syncTranslations(input: TranslationSyncInput): Promise<string[]> {
  return (await syncTranslationsReport(input)).stored;
}
