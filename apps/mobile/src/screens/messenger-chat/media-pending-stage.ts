// 사진 · 음성 대기 문구의 단계입니다. 서버는 진행 단계를 주지 않아 기다린 시간만으로 넘깁니다 — 운영 대기 중간값(2026-11-17 ~ 22:
// 사진 19초 · 음성 4초)에 맞춘 시각이고, 마지막 단계는 도착할 때까지 남습니다. 순수.
// 기다린 시간은 **기기 시계로만** 잽니다(리뷰 #541) — 대기 줄이 처음 놓일 때 기기 시계를 `startedAt`으로 싣고(`chat-remote-send.ts` ·
// 가짜 출처), 자리표시자가 서버 줄로 바뀌어도 그 값을 넘깁니다(`chat-remote-media.ts`). 줄의 `at`은 서버 방에서 서버 시계라, 기기 시계와
// 빼면 시계가 어긋난 기기에서 곧바로 마지막 단계가 뜨거나 첫 단계에서 멈춥니다.

/** 단계가 시작되는 시각(ms, 요청부터). */
export const PHOTO_STAGE_MARKS: readonly number[] = [0, 5000, 11000, 17000];
// 음성은 시연용 방의 도착(2.5초)보다 앞에 둬 둘째 문구가 보이게 합니다.
export const VOICE_STAGE_MARKS: readonly number[] = [0, 1500];

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
