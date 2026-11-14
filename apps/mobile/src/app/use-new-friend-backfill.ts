// 이미 끝낸 에피소드의 새 친구 해금 보정입니다(ADR-0117 D3 · ADR-0141). 해금은 뒤 컷을 지나는 순간 기기에 적히므로, 이 규칙
// 전에 에피소드를 끝냈거나 다른 기기 · 새 설치로 진도만 받아 온 학습자는 인물이 잠긴 채 남습니다. 진도를 다 읽은 그때의
// 진도로 끝낸 에피소드의 인물을 **시트 없이** 해금합니다 — 메신저 목록에는 첫 메시지가 NEW · 안 읽음 1로 이미 와 있습니다.
// 이번 실행에서 끝낸 에피소드는 보정하지 않습니다 — 최종 통과 순간 열면 뒤 컷 전에 열리고 시트도 못 뜹니다(뒤 컷이 엽니다).

import { useEffect, useRef } from "@lynx-js/react";

import type { CatalogProgress } from "../lib/catalog-progress";
import { isCatalogEpisodeComplete } from "../lib/catalog-progress";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { commitNewFriend } from "./new-friend-wiring";

/** 완료 조건을 모두 끝낸 에피소드 id입니다. 순서는 구획 순서입니다. */
export function completedEpisodes(
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
): readonly string[] {
  return sections
    .filter((section) => section.kind === "catalog-ready")
    .filter((section) =>
      isCatalogEpisodeComplete(
        progress,
        section.episodeId,
        section.kind === "catalog-ready" ? section.completionKeys : [],
      ),
    )
    .map((section) => section.episodeId);
}

/** 진도를 다 읽은 그때의 진도로(구획이 늦게 준비되면 그때 다시) 끝낸 에피소드의 인물을 조용히 해금합니다. */
export function useNewFriendBackfill(
  loaded: boolean,
  catalog: {
    readonly catalogSections: readonly CatalogMapSection[];
    readonly catalogProgress: CatalogProgress;
  },
  eventSink: EpisodeIntroEventSink,
): void {
  const sections = catalog.catalogSections;
  const atLoad = useRef<CatalogProgress | null>(null);
  // 진도를 다 읽은 그때의 진도를 효과에서 잡습니다(그림 단계에서 ref를 바꾸지 않음 — 리뷰 #430). 아래 효과보다 먼저 돕니다.
  useEffect(() => {
    if (loaded && atLoad.current === null) atLoad.current = catalog.catalogProgress;
  }, [loaded, catalog.catalogProgress]);
  useEffect(() => {
    if (atLoad.current === null) return;
    for (const episodeId of completedEpisodes(sections, atLoad.current))
      commitNewFriend(episodeId, "backfill", eventSink);
    // 해금 이벤트는 처음 열 때만 나므로 sink가 바뀌어도 다시 돌지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, sections]);
}
