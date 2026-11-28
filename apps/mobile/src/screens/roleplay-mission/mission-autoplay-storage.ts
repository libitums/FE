// 미션 대화의 상대역 말 자동 재생 설정의 기기 저장입니다 — 세션 옵션(`lib/session-options-storage.ts`)과 같은 방식: 키 하나에
// `"on"` / `"off"`, 정확히 `"off"`일 때만 끔이고 나머지(없음 · 깨진 값)는 기본값 켬. 저장소가 없거나 실패해도 던지지 않습니다.
// 기기 범위라 로그아웃에서 지우지 않습니다. 꺼져 있어도 말풍선의 다시 듣기 · 힌트 예문 듣기는 됩니다.

import { getItem, setItem } from "../../lib/storage";

export const missionAutoPlayStorageKey = "libitum.roleplay-mission.autoplay";

export function loadMissionAutoPlay(): boolean {
  try {
    return getItem(missionAutoPlayStorageKey) !== "off";
  } catch {
    return true;
  }
}

export function saveMissionAutoPlay(on: boolean): void {
  try {
    setItem(missionAutoPlayStorageKey, on ? "on" : "off");
  } catch {
    // 쓰기 실패는 이번 실행의 선택만 잃습니다 — 다음 실행은 기본값(켬)으로 시작합니다.
  }
}
