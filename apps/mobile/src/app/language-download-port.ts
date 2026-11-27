// 언어 바꿈 받기의 경계입니다(ADR-0102 개정 ⟨언어 바꿈 받기⟩) — 저장된 매니페스트로 그 언어의 받을 번역 파일을 세고, 받기
// 차례와 같은 함수(`syncTranslationsReport`)로 받은 뒤 새로 저장한 파일이 있으면 카탈로그를 다시 읽습니다. 던지지 않습니다.

import {
  CONTENT_MANIFEST_KEY,
  CONTENT_RECEIVED_MANIFEST_KEY,
  hostContentStore,
  safeGet,
} from "../lib/episode-cache";
import type { ContentStore } from "../lib/episode-cache";
import { parseCachedManifest } from "../lib/episode-catalog";
import type { ContentLanguage } from "../lib/episode-content";
import type { EpisodeManifest } from "../lib/episode-manifest";
import type { FetchText } from "../lib/episode-remote";
import { fetchContentText } from "../lib/episode-remote";
import { syncTranslationsReport, translationJobsOf } from "../lib/episode-translation-sync";
import type { TranslationSyncReport } from "../lib/episode-translation-sync";
import { readNetworkProperties } from "../lib/network-status";

/** 받을 편 수 · 크기(매니페스트가 적은 바이트 합)입니다. 받을 것이 없으면 `null`입니다. */
export type LanguageDownloadPlan = { readonly total: number; readonly bytes: number };

export type LanguageDownloadPort = {
  readonly plan: (language: ContentLanguage) => LanguageDownloadPlan | null;
  readonly run: (
    language: ContentLanguage,
    onProgress: (done: number, total: number) => void,
  ) => Promise<TranslationSyncReport>;
  /** 호스트가 오프라인이라고 알릴 때만 참입니다(모르면 거짓 — 받아 보고 실패로 다룹니다). */
  readonly offline: () => boolean;
};

type PortDeps = {
  readonly store: ContentStore;
  readonly fetchText: FetchText;
  readonly reload: () => void;
  readonly offline: () => boolean;
};

// 받은 매니페스트(보류가 있을 때만 있음)가 가장 새 항목입니다 — 없으면 활성 매니페스트입니다.
function storedManifest(store: ContentStore): EpisodeManifest | null {
  return (
    parseCachedManifest(safeGet(store, CONTENT_RECEIVED_MANIFEST_KEY)) ??
    parseCachedManifest(safeGet(store, CONTENT_MANIFEST_KEY))
  );
}

export function createLanguageDownloadPort(deps: PortDeps): LanguageDownloadPort {
  return {
    plan: (language) => {
      const manifest = storedManifest(deps.store);
      if (manifest === null) return null;
      const jobs = translationJobsOf(manifest, language, deps.store);
      if (jobs.length === 0) return null;
      return { total: jobs.length, bytes: jobs.reduce((sum, job) => sum + job.ref.bytes, 0) };
    },
    run: async (language, onProgress) => {
      const manifest = storedManifest(deps.store);
      if (manifest === null) return { stored: [], failed: 0, total: 0 };
      const report = await syncTranslationsReport({
        fetchText: deps.fetchText,
        store: deps.store,
        manifest,
        language,
        onProgress,
      });
      if (report.stored.length > 0) deps.reload();
      return report;
    },
    offline: deps.offline,
  };
}

/** 앱의 포트 — 호스트 저장소 · 콘텐츠 fetch · 연결 상태 모듈을 씁니다. */
export function hostLanguageDownloadPort(reload: () => void): LanguageDownloadPort {
  return createLanguageDownloadPort({
    store: hostContentStore,
    fetchText: fetchContentText,
    reload,
    offline: () => readNetworkProperties().network === "offline",
  });
}
