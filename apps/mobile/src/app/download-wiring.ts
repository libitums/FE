// 설정 › 다운로드 화면의 결선입니다(ADR-0095 D8). 저장 · 연결 종류 · 받기 다시 돌리기를 화면 props로 묶습니다.

import { allowEpisodes, loadMobileDataPolicy, saveMobileDataPolicy } from "../lib/download-policy";
import { readNetworkProperties } from "../lib/network-status";
import type { DownloadSettingsScreenProps } from "../screens/download-settings/download-settings.contract";

/** 받기 훅이 내주는 것 — 받기 차례를 다시 돌리기와 받은 크기 읽기(백그라운드 저장소). 테스트 · Explorer는 없을 수 있습니다. */
export type DownloadControls = {
  readonly requestSync: () => void;
  readonly loadDownloadedBytes: () => number | null;
  /** 그 편의 그림 · 음성을 다 받았는가(에피소드를 열 때의 받기 판정, D6). */
  readonly assetsComplete: (episodeId: string) => boolean;
  /** 목록에 실린 그 편의 그림 · 음성 크기 — 받기 시트의 크기 줄. 없으면 `null`. */
  readonly assetsBytes: (episodeId: string) => number | null;
  /** 목록을 마지막으로 받은 시각(epoch ms) — 끝 카드 · 모두 끝낸 뒤 시트(D9). 없으면 `null`. */
  readonly manifestCheckedAt: number | null;
};

export type DownloadSettingsWiring = Omit<DownloadSettingsScreenProps, "onBack">;

export function downloadSettingsWiring(
  controls: DownloadControls | undefined,
  catalogIds: () => readonly string[],
): DownloadSettingsWiring {
  return {
    loadPolicy: loadMobileDataPolicy,
    savePolicy: (policy) => {
      saveMobileDataPolicy(policy);
      // 「항상」으로 바꾸면 미뤄 둔 편을 지금 받습니다.
      if (policy === "always") controls?.requestSync();
    },
    isOnMobileData: () => {
      const cost = readNetworkProperties().networkCost;
      return cost === "metered" || cost === "constrained";
    },
    loadDownloadedBytes: () => controls?.loadDownloadedBytes() ?? null,
    onDownloadAll: () => {
      allowEpisodes(catalogIds());
      controls?.requestSync();
    },
  };
}
