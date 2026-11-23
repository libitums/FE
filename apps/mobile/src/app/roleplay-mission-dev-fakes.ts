// 롤플레이 미션의 가짜 출처 · 가짜 기기 음성을 만드는 **dev 전용** 자리입니다. 가짜(`mission-fake-*.ts`) · fixture를 import하는
// 제품 파일은 여기 하나뿐입니다(`roleplay-mission-dev-fakes.unit.test.ts` MD-S1).
//
// release 번들에서 빠지는 길은 탐침 화면(`render-dev-probe.tsx`, ADR-0171)과 같습니다. 결선(`roleplay-mission-wiring.ts`)이
// `__DEV__ ? devMissionSource() : null`로만 부르고, release 빌드는 `__DEV__`를 `false`로 바꿔 넣어 호출이 죽은 코드가 됩니다.
// `lynx.config.ts`가 이 파일을 부수 효과 없는 모듈로 표시해 쓰이지 않는 import가 가짜 · fixture를 끌고 들어오지 않습니다.
// 이 파일에 모듈 최상위 부수 효과를 두지 않습니다 — 표시가 거짓이 됩니다.

import { createFakeMissionSource } from "../screens/roleplay-mission/mission-fake-source";
import { createFakeAudioDevice } from "../screens/roleplay-mission/mission-fake-voice";
import type { MissionAudioDevice } from "../screens/roleplay-mission/mission-voice.contract";
import type { MissionSource } from "../screens/roleplay-mission/roleplay-mission.contract";

/** 개발 미리보기의 가짜 출처 — 채점 대기 판 하나를 둡니다(「Report ready」 → 곧장 리포트 흐름). */
export function devMissionSource(): MissionSource {
  return createFakeMissionSource({ pendingReport: true });
}

export function devMissionAudioDevice(): MissionAudioDevice {
  return createFakeAudioDevice();
}
