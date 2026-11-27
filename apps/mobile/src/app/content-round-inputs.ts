// 받기 차례마다 한 번 읽는 입력입니다 — 자산 받기 정책 · 번역 언어(`use-episode-content-refresh.ts`에서 떼어 냄, 300줄 분할).

import type { AssetDecision, AssetTarget } from "../lib/download-policy";
import {
  assetDownloadDecision,
  loadAllowedEpisodes,
  loadMobileDataPolicy,
} from "../lib/download-policy";
import { bundledCatalogInput } from "../lib/episode-bundled";
import type { ContentLanguage } from "../lib/episode-content";
import { readNetworkProperties } from "../lib/network-status";
import { prefetchWindowOf } from "../lib/prefetch-window";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { loadUiLanguage } from "../lib/ui-language";

/**
 * 받기 차례마다 한 번 읽는 정책 — 연결 종류 · 저장된 설정 · 허락한 편 · 미리 받기 창(ADR-0157). 차례 안에서는 같은 값을
 * 씁니다. 진행을 아직 모르면 창은 내장 매니페스트 순서의 앞 편(새 사용자 창)입니다.
 */
export function assetPolicyForRound(): (id: string, target: AssetTarget) => AssetDecision {
  const network = readNetworkProperties();
  const policy = loadMobileDataPolicy();
  const allowed = loadAllowedEpisodes();
  const window = prefetchWindowOf(bundledCatalogInput.manifest.episodes.map((entry) => entry.id));
  return (episodeId, target) =>
    assetDownloadDecision({
      network,
      policy,
      allowed,
      episodeId,
      tutorialId: TUTORIAL_EPISODE_ID,
      target,
      window,
    });
}

/** 받기 차례마다 지금 UI 언어를 읽습니다 — 영어(원문)면 번역 파일을 받지 않습니다(ADR-0102 D3). */
export function translationLanguageForRound(): ContentLanguage | null {
  const language = loadUiLanguage();
  return language === "en" ? null : language;
}
