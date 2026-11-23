// 사진 · 음성 대기 문구의 단계입니다. 서버는 진행 단계를 주지 않아 기다린 시간만으로 넘깁니다 — 운영 대기 중간값(2026-11-17 ~ 22:
// 사진 19초 · 음성 4초)에 맞춘 시각이고, 마지막 단계는 도착할 때까지 남습니다. 순수.
// 기다린 시간은 **기기 시계로만** 잽니다(리뷰 #541) — 대기 줄이 처음 놓일 때 기기 시계를 `startedAt`으로 싣고(`chat-remote-send.ts` ·
// 가짜 출처), 자리표시자가 서버 줄로 바뀌어도 그 값을 넘깁니다(`chat-remote-media.ts`). 줄의 `at`은 서버 방에서 서버 시계라, 기기 시계와
// 빼면 시계가 어긋난 기기에서 곧바로 마지막 단계가 뜨거나 첫 단계에서 멈춥니다.

/** 단계가 시작되는 시각(ms, 요청부터). */
export const PHOTO_STAGE_MARKS: readonly number[] = [0, 5000, 11000, 17000];
export const VOICE_STAGE_MARKS: readonly number[] = [0, 2500];
/**
 * 서버가 단계를 알려 줄 때(ADR-0146 개정 2026-11-23): 「구상 중」은 첫 문구 하나에 머물고, 「그리는 중」은 그때부터 문구 2 ~ 4를
 * 넘깁니다(운영 그리기 13 ~ 17초). 서버가 알려 주지 않으면(옛 서버 · 가짜 방) 위 `PHOTO_STAGE_MARKS`로 추정합니다.
 */
export const PREPARING_STAGE_MARKS: readonly number[] = [0];
export const DRAWING_STAGE_MARKS: readonly number[] = [0, 6000, 12000];

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

/** 단계의 문구 — 단계가 문구 수를 넘으면 마지막 문구(시각 표와 문구 표가 어긋나도 빈 글이 되지 않게). */
export function stageLine(lines: readonly string[], stage: number): string {
  return lines[Math.min(stage, lines.length - 1)] ?? "";
}

/**
 * 타이머 한 번 사이에 흐른 시간 — 기기 시계의 차이(`deltaMs`)를 씁니다(화면이 가려져 타이머가 늦게 불리면 실제로 흐른 만큼).
 * 시계가 뒤로 갔으면(음수) 타이머가 기다린 만큼(`waitedMs`)으로 쳐, 단계가 멈추지 않습니다.
 */
export function elapsedStep(deltaMs: number, waitedMs: number): number {
  return deltaMs < 0 ? waitedMs : deltaMs;
}
