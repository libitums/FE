// 롤플레이 미션의 가짜 출처 · 가짜 기기 음성을 만드는 **dev 전용** 자리입니다. 가짜(`mission-fake-*.ts`) · fixture를 import하는
// 제품 파일은 여기 하나뿐입니다(`roleplay-mission-dev-fakes.unit.test.ts` MD-S1).
//
// release 번들에서 빠지는 길은 탐침 화면(`render-dev-probe.tsx`, ADR-0171)과 같습니다. 결선(`roleplay-mission-wiring.ts`)이
// `__DEV__ ? devMissionSource() : null`로만 부르고, release 빌드는 `__DEV__`를 `false`로 바꿔 넣어 호출이 죽은 코드가 됩니다.
// `lynx.config.ts`가 이 파일을 부수 효과 없는 모듈로 표시해 쓰이지 않는 import가 가짜 · fixture를 끌고 들어오지 않습니다.
// 이 파일에 모듈 최상위 부수 효과를 두지 않습니다 — 표시가 거짓이 됩니다.

import { createFakeMissionSource } from "../screens/roleplay-mission/mission-fake-source";
import { createFakeAudioDevice } from "../screens/roleplay-mission/mission-fake-voice";
import { missionListFixture } from "../screens/roleplay-mission/mission-fixture";
import type { MissionAudioDevice } from "../screens/roleplay-mission/mission-voice.contract";
import type {
  MissionList,
  MissionListItem,
  MissionSource,
} from "../screens/roleplay-mission/roleplay-mission.contract";

/** 이 글이 든 턴은 처음 한 번 보내기에 실패합니다(QA — 「보내지 못함」 · 다시 보내기). */
export const DEV_MISSION_FAIL_TURN = "#fail";
/** 이 글을 한 판에서 한 번이라도 보내면 그 판의 첫 채점이 실패합니다(QA — 채점 실패 · 다시 시도). */
export const DEV_MISSION_FAIL_GRADING = "#gradefail";

/**
 * 개발 미리보기의 목록 — 편의점(1화) · 카페(6화)는 열려 끝까지 돌고, 잠긴 미션 예시로 2화 항목 하나를 더 둡니다(대본 없음 ·
 * 시작하면 `not_available`). 계약 fixture(`missionListFixture`)는 바꾸지 않습니다 — 그쪽은 패키지 fixture와 같은 값입니다.
 */
export function devMissionList(): MissionList {
  const [store, ...rest] = missionListFixture.missions;
  const lockedExample: MissionListItem | null =
    store === undefined
      ? null
      : {
          ...store,
          id: "u02-checkin",
          episodeId: "u02-checkin",
          title: { en: "Locked mission example" },
          unlocked: false,
        };
  return {
    ...missionListFixture,
    missions: [
      ...(store === undefined ? [] : [{ ...store, unlocked: true }]),
      ...rest,
      ...(lockedExample === null ? [] : [lockedExample]),
    ],
  };
}

/** 개발 미리보기의 가짜 출처 — 채점 대기 판 하나(카페 「Report ready」 → 곧장 리포트)와 QA용 실패 낱말을 둡니다. */
export function devMissionSource(): MissionSource {
  return createFakeMissionSource({
    list: devMissionList(),
    pendingReport: true,
    failTurnOn: DEV_MISSION_FAIL_TURN,
    failTurnOnce: true,
    gradingFailOn: DEV_MISSION_FAIL_GRADING,
  });
}

/** 녹음 길이는 실제로 누른 시간 — 0.4초 안에 두 번 누르면 「짧음」 안내(QA). */
export function devMissionAudioDevice(): MissionAudioDevice {
  return createFakeAudioDevice({ seconds: "elapsed" });
}
