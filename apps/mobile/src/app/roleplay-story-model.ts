// 에피소드 롤플레이의 모델입니다 — 최종 테스트의 턴(같은 계획 함수)과 표지 컷을 한 흐름으로 묶습니다.
// 롤플레이 탭의 카탈로그 구획도 여기서 만듭니다(에피소드를 끝내면 열림).

import type { CatalogProgress } from "../lib/catalog-progress";
import { isCatalogUnitDone } from "../lib/catalog-progress";
import type { NonEmpty } from "../lib/non-empty";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogRoleplayTurn } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { RoleplaySection } from "../screens/roleplay-list/roleplay-list.contract";
import { roleplayStoryCutsOf } from "../screens/roleplay-story/roleplay-story";
import { catalogCoverModelOf } from "./catalog-cover-wiring";
import { catalogFinalPlanFor } from "./catalog-final-model";
import type { EpisodeContent } from "./episode-content";

export type RoleplayStoryModel = {
  readonly ordinal: number;
  readonly title: string;
  readonly counterpartName: string;
  readonly turns: NonEmpty<CatalogRoleplayTurn>;
  /** 대화 앞에 보일 표지 컷 — 없으면 곧장 대화입니다. */
  readonly cuts: CatalogCuts | null;
  readonly imageUrl: string | null;
  readonly wildcards: readonly string[];
};

/** 판정에서 뺄 낱말 — 채워 넣은 이름 · 나라(한국어 표기)입니다. */
export function roleplayWildcardsOf(profile: LearnerProfile): readonly string[] {
  const country = typeof profile.country === "string" ? profile.country : profile.country?.ko;
  return [profile.name, country].filter(
    (value): value is string => value !== undefined && value.trim() !== "",
  );
}

/** 말할 턴이 없거나 준비되지 않은 에피소드면 `null`입니다. */
export function roleplayStoryModelOf(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  episodeId: string,
  profile: LearnerProfile,
): RoleplayStoryModel | null {
  const section = sections.find((item) => item.episodeId === episodeId);
  const plan = catalogFinalPlanFor(content, sections, episodeId, profile);
  const [first, ...rest] = plan?.turns ?? [];
  if (
    section === undefined ||
    section.kind !== "catalog-ready" ||
    plan === null ||
    first === undefined
  ) {
    return null;
  }
  const cover = catalogCoverModelOf(content, sections, episodeId, profile);
  const lastCut = cover?.cuts[cover.cuts.length - 1];
  return {
    ordinal: plan.ordinal,
    title: section.titleEn ?? section.title,
    counterpartName: plan.counterpartName,
    turns: [first, ...rest],
    cuts: cover === null ? null : roleplayStoryCutsOf(cover.cuts, first.line.ko),
    imageUrl: lastCut?.imageUrl ?? first.imageUrl,
    wildcards: roleplayWildcardsOf(profile),
  };
}

/**
 * 롤플레이 탭의 카탈로그 구획입니다 — 준비된 에피소드마다 하나, 항목은 그 에피소드의 롤플레이 하나입니다.
 * 에피소드의 완료 키(`completion.requires`)를 모두 끝내면 열립니다. 말할 턴이 없는 에피소드는 싣지 않습니다.
 */
export function catalogRoleplaySectionsOf(
  content: EpisodeContent,
  sections: readonly CatalogMapSection[],
  progress: CatalogProgress,
  profile: LearnerProfile,
  episodeLabel: (ordinal: number) => string,
): readonly RoleplaySection[] {
  return sections.flatMap((section): readonly RoleplaySection[] => {
    if (section.kind !== "catalog-ready") return [];
    const plan = catalogFinalPlanFor(content, sections, section.episodeId, profile);
    if (plan === null || plan.turns.length === 0) return [];
    return [
      {
        episodeId: section.episodeId,
        label: episodeLabel(section.ordinal),
        title: `${section.titleEn ?? section.title}.`,
        unlocked: section.completionKeys.every((key) =>
          isCatalogUnitDone(progress, section.episodeId, key),
        ),
        items: [
          {
            form: "story",
            unitId: `story-${section.episodeId}`,
            episodeId: section.episodeId,
            title: section.titleEn ?? section.title,
            lineCount: plan.turns.length,
          },
        ],
        premiumItems: [],
      },
    ];
  });
}
