// 롤플레이 미션(ADR-0160)의 결선입니다 — 스위치 · 출처 선택 · 목록 구독. 메신저 결선(`messenger-chat-wiring.ts`)처럼
// 출처는 앱 프로세스 싱글턴이고, 지금은 가짜 출처만 있습니다. 서버 출처(`mission-start` · `chat-send` + `conversation_id` ·
// `mission-hint` · `mission-finish`)는 운영에 2단계를 적용한 뒤 `serverMissionSource` 자리에 붙입니다(PRD §0.9 · §8 N3).

import { useEffect, useState } from "@lynx-js/react";

import {
  unavailableAudioDevice,
  unavailableMissionSource,
} from "../screens/roleplay-mission/mission-unavailable";
import type { MissionAudioDevice } from "../screens/roleplay-mission/mission-voice.contract";
import type {
  MissionList,
  MissionSource,
} from "../screens/roleplay-mission/roleplay-mission.contract";
import { ROLEPLAY_MISSION_READY } from "../screens/roleplay-mission/roleplay-mission-ready";
import { devMissionAudioDevice, devMissionSource } from "./roleplay-mission-dev-fakes";

let enabledOverride: boolean | null = null;
let sourceOverride: MissionSource | null = null;
let singleton: MissionSource | null = null;
let deviceOverride: MissionAudioDevice | null = null;
let deviceSingleton: MissionAudioDevice | null = null;
const listeners = new Set<() => void>();

/** 미션 항목 · 화면을 켜는가 — 상수 스위치. 테스트 · 개발 미리보기만 덮어씁니다. */
export function roleplayMissionEnabled(): boolean {
  return enabledOverride ?? ROLEPLAY_MISSION_READY;
}

/**
 * 서버 출처의 자리입니다 — 아직 없습니다. 붙일 때 이 함수가 `MissionSource`를 돌려주고(`lib/companion-api.ts`의 인증 ·
 * `lib/chat-stream.ts`의 SSE를 그대로 씀), `roleplayMissionSource`가 시험 계정 · 서버 스위치를 보고 고릅니다.
 */
const serverMissionSource = (): MissionSource | null => null;

export function roleplayMissionSource(): MissionSource {
  if (sourceOverride !== null) return sourceOverride;
  // 가짜는 dev 빌드에만 — release는 `__DEV__`가 false라 가짜 · fixture가 번들에서 빠집니다(`roleplay-mission-dev-fakes.ts`).
  // `__DEV__ ?` 삼항을 풀지 않습니다(MD-S2).
  singleton ??=
    serverMissionSource() ?? (__DEV__ ? devMissionSource() : null) ?? unavailableMissionSource;
  return singleton;
}

/**
 * 기기 녹음 · 재생의 자리입니다 — 아직 호스트 모듈이 없습니다(파이프라인 문서 §10.2 ⑤). 붙일 때 이 함수가 `lib/`의 접점 파일
 * (모듈마다 파일 하나, ADR-0017 D3 — 녹음 모듈 새로, 재생은 `AudioPlaybackModule`의 주소 재생)로 `MissionAudioDevice`를 만듭니다.
 */
const hostAudioDevice = (): MissionAudioDevice | null => null;

export function roleplayMissionAudioDevice(): MissionAudioDevice {
  if (deviceOverride !== null) return deviceOverride;
  deviceSingleton ??=
    hostAudioDevice() ?? (__DEV__ ? devMissionAudioDevice() : null) ?? unavailableAudioDevice;
  return deviceSingleton;
}

/** 테스트 · 개발 미리보기 전용 — 스위치와 출처 · 기기 음성을 끼웁니다. 인자 없이 부르면 되돌립니다. */
export function setRoleplayMissionForTest(
  override: {
    readonly enabled: boolean;
    readonly source?: MissionSource;
    readonly device?: MissionAudioDevice;
  } | null = null,
): void {
  enabledOverride = override?.enabled ?? null;
  sourceOverride = override?.source ?? null;
  deviceOverride = override?.device ?? null;
  singleton = null;
  deviceSingleton = null;
}

/** 판이 끝났습니다(리포트를 받음) — 목록의 최고 기록을 다시 읽게 알립니다. */
export function notifyMissionResultsChanged(): void {
  for (const listener of listeners) listener();
}

/**
 * 미션 목록(`companion_list_missions()`)입니다. 스위치가 꺼져 있으면 아무것도 부르지 않고 늘 `null`입니다 —
 * 상태가 바뀌지 않으므로 지금 앱의 렌더 · 이벤트가 그대로입니다.
 */
export function useRoleplayMissions(): MissionList | null {
  const enabled = roleplayMissionEnabled();
  const [list, setList] = useState<MissionList | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => {
      roleplayMissionSource()
        .list()
        .then(
          (value) => {
            if (alive) setList(value);
          },
          () => undefined,
        );
    };
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, [enabled]);
  return enabled ? list : null;
}
