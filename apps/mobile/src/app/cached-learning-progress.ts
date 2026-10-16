// 서버가 마지막으로 확인한 진행을 사용자별로 기기에 둡니다(표시용). 로그아웃 시 유지하고 계정 삭제 성공 시 지웁니다.
// 미전송 진행(pending-learning-progress)과 달리 저장 루프를 일으키지 않습니다.
// 설계: docs/adr/0062-progress-cache-first.md
import { getItem, removeItem, setItem } from "../lib/storage";
import { journeyProgressFrom, learningProgressSnapshotFrom } from "./learning-progress";
import type { JourneyProgressState } from "./learning-progress";

export function cachedProgressKey(userId: string): `libitum.progress.cached.${string}` {
  return `libitum.progress.cached.${userId}`;
}

/** 없음 · 깨진 값 · 모르는 버전 · 저장소 예외는 모두 null입니다. 깨진 값은 지우지 않고 다음 쓰기가 덮습니다. */
export function readCachedProgress(userId: string): JourneyProgressState | null {
  "background only";
  try {
    return journeyProgressFrom(JSON.parse(getItem(cachedProgressKey(userId)) ?? "null"));
  } catch {
    return null;
  }
}

export function writeCachedProgress(userId: string, state: JourneyProgressState): void {
  "background only";
  try {
    setItem(cachedProgressKey(userId), JSON.stringify(learningProgressSnapshotFrom(state)));
  } catch {
    // 저장본은 표시용입니다. 쓰지 못해도 동기화를 멈추지 않고 다음 시점에 다시 씁니다.
  }
}

export function clearCachedProgress(userId: string): void {
  "background only";
  try {
    removeItem(cachedProgressKey(userId));
  } catch {
    // 지우지 못해도 계정 삭제 뒤처리를 멈추지 않습니다.
  }
}
