// 이미 막간을 끝낸 진도의 새 친구 해금 보정입니다(ADR-0117 D3). 해금은 막간을 끝내는 순간 기기에 적히므로, 이 규칙 전에 막간을
// 끝냈거나 다른 기기 · 새 설치로 진도만 받아 온 학습자는 미나가 잠긴 채 남습니다. 진도를 다 읽은 뒤 끝낸 막간이 있는 에피소드의
// 인물을 **시트 없이** 해금합니다 — 메신저 목록에는 첫 메시지가 NEW · 안 읽음 1로 이미 와 있습니다.

import { useEffect } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import { isCatalogUnitDone } from "../lib/catalog-progress";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { commitNewFriend } from "./new-friend-wiring";

/** 막간(이야기 유닛) 가운데 하나라도 끝낸 에피소드 id입니다. 순서는 구획 순서입니다. */
export function episodesWithClearedInterlude(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): readonly string[] {
  const out: string[] = [];
  for (const section of sections) {
    if (section.kind !== "catalog-ready") continue;
    const storyKeys = section.storyKeys ?? [];
    if (storyKeys.some((key) => isCatalogUnitDone(progress, section.episodeId, key))) {
      out.push(section.episodeId);
    }
  }
  return out;
}

/** 진도를 다 읽은 뒤(그리고 진도가 바뀔 때마다) 끝낸 막간의 인물을 조용히 해금합니다. 이미 연 인물은 그대로입니다. */
export function useNewFriendBackfill(
  loaded: boolean,
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): void {
  useEffect(() => {
    if (!loaded) return;
    for (const episodeId of episodesWithClearedInterlude(sections, progress)) {
      commitNewFriend(episodeId);
    }
  }, [loaded, sections, progress]);
}
