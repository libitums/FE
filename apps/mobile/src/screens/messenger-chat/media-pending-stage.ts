// 사진 · 음성 대기 문구의 단계입니다. 서버는 진행 단계를 주지 않아 기다린 시간만으로 넘깁니다 — 운영 대기 중간값(2026-11-17 ~ 22:
// 사진 19초 · 음성 4초)에 맞춘 시각이고, 마지막 단계는 도착할 때까지 남습니다. 순수.

/** 단계가 시작되는 시각(ms, 요청부터). */
export const PHOTO_STAGE_MARKS: readonly number[] = [0, 5000, 11000, 17000];
export const VOICE_STAGE_MARKS: readonly number[] = [0, 2500];

/** 기다린 시간의 단계 — 기기 시각이 거꾸로 가도(음수) 첫 단계입니다. */
export function stageAt(marks: readonly number[], elapsedMs: number): number {
  let stage = 0;
  for (let index = 1; index < marks.length; index += 1) {
    if (elapsedMs >= (marks[index] ?? Infinity)) stage = index;
  }
  return stage;
}

/** 지금 단계에서 다음 단계까지 남은 시간 — 마지막 단계면 null, 이미 지났으면 0. */
export function nextStageDelay(
  marks: readonly number[],
  stage: number,
  elapsedMs: number,
): number | null {
  const next = marks[stage + 1];
  return next === undefined ? null : Math.max(0, next - elapsedMs);
}
