// 맵의 첫 유닛 안내 대상과 「옛 통과로 우회된 튜토리얼」 판정입니다 — 구획 목록만 보는 순수 함수입니다.

import { isCatalogEpisodeComplete } from "../../lib/catalog-progress";
import { TUTORIAL_EPISODE_ID } from "../../lib/tutorial-episode";
import type { CatalogGate, CatalogMapSection } from "./catalog-map.contract";

/** 첫 구획이 준비된 튜토리얼이면 그 id, 아니면 null — 첫 유닛 안내의 대상입니다. */
export function mapGuideTargetOf(sections: readonly CatalogMapSection[]): string | null {
  const first = sections[0];
  return first?.kind === "catalog-ready" && first.episodeId === TUTORIAL_EPISODE_ID
    ? first.episodeId
    : null;
}

/**
 * 옛 통과 기록이 있고 튜토리얼 구획(준비됨)을 아직 끝내지 않았으면 true입니다. 구획이 없거나 준비 안 됨이면
 * false입니다.
 */
export function catalogTutorialBypassed(
  sections: readonly CatalogMapSection[],
  gate: CatalogGate,
): boolean {
  if (!gate.legacyTutorialPassed) return false;
  const section = sections.find((candidate) => candidate.episodeId === TUTORIAL_EPISODE_ID);
  if (section === undefined || section.kind !== "catalog-ready") return false;
  return !isCatalogEpisodeComplete(gate.progress, section.episodeId, section.completionKeys);
}
