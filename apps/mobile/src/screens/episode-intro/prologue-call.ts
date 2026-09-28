// 서사 통화의 대본과 순수 로직입니다. DOM · 컴포넌트를 만지지 않습니다.

import type { PrologueCall, PrologueCallVolume } from "./episode-intro.contract";

// ⚠ 이음매입니다(「임시 입력값의 이음매」 — `docs/conventions/code.md`).
//
// **무엇이 임시인가** — 튜토리얼 통화의 상대 이름과 대사 전부입니다. `PrologueCall`
// 타입은 임시가 아닙니다.
//
// **무엇이 막고 있나** — 서사의 대본이 아직 없습니다. 튜토리얼 이야기(카페에서 지민을
// 만나는 줄기)에 맞춰 짧게 지은 값입니다.
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 표의 값입니다. 에피소드가 늘면 그 에피소드의
// 통화가 여기 더해집니다. 통화가 없는 에피소드는 표지의 `Next`가 곧장 유닛을 엽니다.
//
// export하지 않습니다 — 읽는 함수가 계약입니다.
const callsByEpisode: Readonly<Record<string, PrologueCall>> = {
  tutorial: {
    callerName: "지민",
    lines: [
      { text: "여보세요?", translation: "Hello?" },
      { text: "나 지민이야. 오늘 시간 있어?", translation: "It's Jimin. Are you free today?" },
      { text: "카페에서 만나자!", translation: "Let's meet at the cafe!" },
      { text: "이따 봐!", translation: "See you later!" },
    ],
  },
};

/** 그 에피소드의 서사 통화입니다. 없으면 `undefined`입니다 — 오류가 아닙니다. */
export function prologueCallFor(episodeId: string): PrologueCall | undefined {
  return callsByEpisode[episodeId];
}

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
    lineIndex: Math.min(index, lineCount - 1),
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
