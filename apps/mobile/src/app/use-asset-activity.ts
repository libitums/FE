import { useCallback, useState } from "@lynx-js/react";

import { percentOf } from "./cover-download-state";
import type { AssetActivity } from "./cover-download-state";

export type AssetActivityState = {
  /** 받기 차례가 마지막으로 알린 편의 파일 진행. 없으면 `null`. */
  readonly activity: AssetActivity | null;
  /** 받기 차례가 도는 중인가 — 실행 시작에 곧 돌므로 참에서 시작합니다. */
  readonly syncing: boolean;
  readonly setSyncing: (syncing: boolean) => void;
  readonly onAssetProgress: (episodeId: string, done: number, total: number) => void;
};

/**
 * 표지 받기 표시(ADR-0165)가 읽는 받기 진행입니다. 파일마다 알림이 오지만 같은 편 · 같은 퍼센트면 상태를 바꾸지 않아
 * 맵이 퍼센트가 바뀔 때만 다시 그립니다.
 */
export function useAssetActivity(): AssetActivityState {
  const [activity, setActivity] = useState<AssetActivity | null>(null);
  const [syncing, setSyncing] = useState(true);
  const onAssetProgress = useCallback((episodeId: string, done: number, total: number) => {
    const next = { episodeId, done, total };
    setActivity((previous) =>
      previous !== null &&
      previous.episodeId === episodeId &&
      percentOf(previous) === percentOf(next) &&
      previous.done >= previous.total === done >= total
        ? previous
        : next,
    );
  }, []);
  return { activity, syncing, setSyncing, onAssetProgress };
}
