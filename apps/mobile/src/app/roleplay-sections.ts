// 롤플레이 탭의 구획입니다 — 본편 에피소드마다 롤플레이 하나. **진행에서 파생합니다**(ADR-0007 D3).
// 튜토리얼 에피소드(u00)도 구획을 만들지 않습니다(ADR-0076 적용 기록).
// 미션 스위치가 켜져 있으면 그 에피소드 구획의 대본형 항목 아래 미션 항목이 하나 더 섭니다(ADR-0160 · PRD §4.1).

import type { CatalogProgress } from "../lib/catalog-progress";
import type { LearnerProfile } from "../lib/placeholder-fill";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { RoleplaySection } from "../screens/roleplay-list/roleplay-list.contract";
import { missionReportBadgeOf } from "../screens/roleplay-mission/mission-report-ready";
import type { MissionList } from "../screens/roleplay-mission/roleplay-mission.contract";
import type { EpisodeContent } from "./episode-content";
import { useRoleplayMissions } from "./roleplay-mission-entry";
import { catalogRoleplaySectionsOf, firstCoverImageOf } from "./roleplay-story-model";

export type RoleplaySectionsInput = {
  readonly catalog: {
    readonly episodeContent: EpisodeContent;
    readonly catalogSections: readonly CatalogMapSection[];
    readonly catalogProgress: CatalogProgress;
  };
  readonly learnerFill: LearnerProfile;
  readonly episodeLabel: (ordinal: number) => string;
  /** 미션 목록 — 스위치가 꺼져 있거나 아직 읽지 않았으면 `null`(구획이 지금과 같습니다). */
  readonly missions?: MissionList | null;
};

export function roleplaySectionsOf(input: RoleplaySectionsInput): readonly RoleplaySection[] {
  const sections = catalogRoleplaySectionsOf(
    input.catalog.episodeContent,
    input.catalog.catalogSections.filter((section) => section.episodeId !== TUTORIAL_EPISODE_ID),
    input.catalog.catalogProgress,
    input.learnerFill,
    input.episodeLabel,
  );
  const missions = input.missions ?? null;
  return !__ROLEPLAY_MISSION_IN_BUNDLE__ || missions === null
    ? sections
    : withMissionItems(sections, missions, input.catalog.episodeContent);
}

/** 에피소드 구획마다 그 에피소드의 미션을 대본형 항목 뒤에 붙입니다. 구획이 없는 미션은 싣지 않습니다. */
export function withMissionItems(
  sections: readonly RoleplaySection[],
  missions: MissionList,
  content: EpisodeContent,
): readonly RoleplaySection[] {
  return sections.map((section) => {
    const own = missions.missions.filter((mission) => mission.episodeId === section.episodeId);
    if (own.length === 0) return section;
    return {
      ...section,
      items: [
        ...section.items,
        ...own.map((mission) => ({
          form: "mission" as const,
          unitId: `mission-${mission.id}` as const,
          episodeId: mission.episodeId,
          missionId: mission.id,
          title: mission.title.en,
          goalCount: mission.goals.length,
          bestScore: mission.best?.totalScore ?? null,
          reportBadge: missionReportBadgeOf(missions, mission.id),
          imageUrl: firstCoverImageOf(content, mission.episodeId),
        })),
      ],
    };
  });
}

/** 앱 세션이 부르는 입구 — 미션 목록을 구독해 구획에 싣습니다. 스위치가 꺼져 있으면 `roleplaySectionsOf`와 같습니다. */
export function useRoleplaySections(input: RoleplaySectionsInput): readonly RoleplaySection[] {
  // 빌드 상수라 훅을 부르는 차례는 실행 중에 바뀌지 않습니다(ME-S2).
  const missions = __ROLEPLAY_MISSION_IN_BUNDLE__ ? useRoleplayMissions() : null;
  return roleplaySectionsOf({ ...input, missions });
}
