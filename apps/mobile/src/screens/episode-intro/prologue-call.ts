// 서사 통화의 순수 로직입니다. DOM · 컴포넌트를 만지지 않습니다. 에피소드마다의 서사
// 형식과 대본은 `app/episode-prologues.ts`가 집니다.

import type { PrologueCallVolume } from "./episode-intro.contract";

/** 대사 한 줄이 머무는 시간(초)입니다. 음성이 생기면 음성 길이가 이 자리를 대신합니다. */
export const prologueLineSeconds = 3;

export type PrologueCallProgress = {
  /** 지금 보이는 대사의 자리입니다. */
  readonly lineIndex: number;
  /** 마지막 대사까지 흘렀습니다. */
  readonly ended: boolean;
};

/**
 * 통화가 이어진 시간(초)에서 지금 대사와 끝남을 냅니다. 대사마다 `lineSeconds`씩
 * 머물고, 마지막 대사가 머문 뒤 끝납니다.
 */
export function prologueCallProgress(
  elapsedSeconds: number,
  lineCount: number,
  lineSeconds: number = prologueLineSeconds,
): PrologueCallProgress {
  const index = Math.floor(Math.max(0, elapsedSeconds) / lineSeconds);
  return {
    // 대사가 없으면 자리를 0에 둡니다 — `lineCount - 1`이 -1이 되어 음수 자리를 내지 않게
    // 합니다(대사 0줄은 곧장 끝난 통화입니다).
    lineIndex: lineCount > 0 ? Math.min(index, lineCount - 1) : 0,
    ended: index >= lineCount,
  };
}

/** 통화 시계입니다 — `0:00`, `1:05`. */
export function prologueCallClock(elapsedSeconds: number): string {
  const seconds = Math.max(0, Math.floor(elapsedSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const initialPrologueCallVolume: PrologueCallVolume = 4;

const volumeSteps: readonly PrologueCallVolume[] = [1, 2, 3, 4, 5];

/** 소리 크기를 한 단계 바꿉니다. 양 끝에서는 그대로입니다. */
export function stepPrologueCallVolume(
  volume: PrologueCallVolume,
  direction: "down" | "up",
): PrologueCallVolume {
  const index = volumeSteps.indexOf(volume) + (direction === "up" ? 1 : -1);
  return volumeSteps[index] ?? volume;
}
