// 여정맵 파이널 노드가 푸는 계획을 고릅니다 — 구획에 이야기 파이널 원천(level-3 S8)이 있으면 그 유닛의 이야기 턴,
// 없으면(옛 콘텐츠) RP 턴입니다. 롤플레이 탭은 이것을 쓰지 않고 RP 턴(`catalogFinalPlanFor`)을 그대로 씁니다.

import type { LearnerProfile } from "../lib/placeholder-fill";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { catalogFinalPlanFor } from "./catalog-final-model";
import type { CatalogFinalPlan } from "./catalog-final-model";
import { catalogFillOf } from "./catalog-lesson-plan";
import { catalogStoryFinalPlanOf } from "./catalog-story-final-model";
import type { CatalogStoryFinalPlan } from "./catalog-story-final-model";
import type { EpisodeContent } from "./episode-content";

export type CatalogJourneyFinalPlan =
  | ({ readonly kind: "story" } & CatalogStoryFinalPlan)
  | ({ readonly kind: "roleplay" } & CatalogFinalPlan);

// 같은 ready 항목 참조 + 같은 프로필 참조면 같은 계획 참조입니다(`catalogFinalPlanFor`와 같은 까닭 — 화면이
// 다시 그려져도 타일 섞임 · 턴 참조가 흔들리지 않게).
const memo = new WeakMap<object, WeakMap<object, CatalogJourneyFinalPlan>>();

export function catalogJourneyFinalPlanFor(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
  profile: LearnerProfile,
): CatalogJourneyFinalPlan | null {
  const entry = content.catalog.find((candidate) => candidate.id === episodeId);
  const section = sections.find((candidate) => candidate.episodeId === episodeId);
  if (entry === undefined || entry.status !== "ready" || section?.kind !== "catalog-ready") {
    return null;
  }
  const sourceKey = section.storyFinalKey;
  if (sourceKey === undefined) {
    const roleplay = catalogFinalPlanFor(content, sections, episodeId, profile);
    return roleplay === null ? null : { kind: "roleplay", ...roleplay };
  }
  let byProfile = memo.get(entry);
  if (byProfile === undefined) {
    byProfile = new WeakMap();
    memo.set(entry, byProfile);
  }
  const known = byProfile.get(profile);
  if (known !== undefined && known.ordinal === section.ordinal) return known;
  const plan: CatalogJourneyFinalPlan = {
    kind: "story",
    ...catalogStoryFinalPlanOf(
      entry,
      section.ordinal,
      sourceKey,
      catalogFillOf(content, profile),
      content.imageUrlOf,
    ),
  };
  byProfile.set(profile, plan);
  return plan;
}
