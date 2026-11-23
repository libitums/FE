// 롤플레이 미션 route(`roleplay-mission`)를 그립니다(ADR-0160). 나가기는 대본형 롤플레이와 같은 콜백(롤플레이 목록으로)이고,
// 출처 · 스위치는 결선 모듈(`roleplay-mission-wiring.ts`)이 집니다 — `ScreenWiring`에 칸을 더하지 않습니다.

import type { Screen } from "./nav-state";
import { RoleplayMissionRoute } from "./RoleplayMissionFlow";
import {
  notifyMissionResultsChanged,
  roleplayMissionAudioDevice,
  roleplayMissionSource,
} from "./roleplay-mission-wiring";
import { firstCoverImageOf } from "./roleplay-story-model";
import type { ScreenWiring } from "./screen-wiring";

export function renderRoleplayMission(
  screen: Extract<Screen, { name: "roleplay-mission" }>,
  wiring: ScreenWiring,
) {
  return (
    <RoleplayMissionRoute
      key={screen.missionId}
      missionId={screen.missionId}
      insets={wiring.safeAreaInsets}
      source={roleplayMissionSource()}
      device={roleplayMissionAudioDevice()}
      imageUrlOf={(episodeId) => firstCoverImageOf(wiring.episodeContent, episodeId)}
      ordinalOf={(episodeId) =>
        wiring.catalogSections.find((section) => section.episodeId === episodeId)?.ordinal ?? null
      }
      onExit={wiring.onExitRoleplayStory}
      onReport={notifyMissionResultsChanged}
    />
  );
}
