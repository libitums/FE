// 사진 · 음성 대기 문구의 단계입니다. 서버는 진행 단계를 주지 않아 기다린 시간만으로 넘깁니다 — 운영 대기 중간값(2026-11-17 ~ 22:
// 사진 19초 · 음성 4초)에 맞춘 시각이고, 마지막 단계는 도착할 때까지 남습니다. 순수.
// 기다린 시간은 **기기 시계로만** 잽니다(리뷰 #541) — 메시지의 `at`은 서버 방에서 서버 시계라, 기기 시계와 빼면 시계가 어긋난 기기에서
// 곧바로 마지막 단계가 뜨거나 첫 단계에서 멈춥니다. 말풍선이 처음 선 때를 기억해 두고(`PendingClock`) 다시 설 때 이어 갑니다.

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

/** 대기 말풍선이 처음 선 때의 기억(기기 시계). 메시지 id별 · 묶음(인물 × 매체)별. */
export type PendingClock = {
  readonly byId: Map<string, number>;
  readonly byGroup: Map<string, { start: number; endedAt: number | null }>;
};

export const createPendingClock = (): PendingClock => ({ byId: new Map(), byGroup: new Map() });

/** 자리표시자가 서버 줄로 바뀌어(id가 달라져) 말풍선이 다시 설 때 이어 가는 틈. */
const SWAP_MS = 2000;
/** 이보다 오래된 기억은 버립니다. */
const KEEP_MS = 10 * 60 * 1000;

/**
 * 이 말풍선의 시작 시각입니다. 같은 메시지가 다시 서면(방을 나갔다 들어옴) 처음 선 때, id가 바뀌어 곧바로 다시 서면(같은 묶음이 아직
 * 떠 있거나 내려간 지 `SWAP_MS` 안) 그 묶음의 시작, 그 밖에는 지금.
 */
export function pendingStartOf(
  clock: PendingClock,
  id: string | undefined,
  group: string | undefined,
  now: number,
): number {
  for (const [key, start] of clock.byId) if (now - start > KEEP_MS) clock.byId.delete(key);
  const known = id === undefined ? undefined : clock.byId.get(id);
  const running = group === undefined ? undefined : clock.byGroup.get(group);
  const carried =
    running !== undefined &&
    now - running.start <= KEEP_MS &&
    (running.endedAt === null || now - running.endedAt <= SWAP_MS)
      ? running.start
      : undefined;
  const start = known ?? carried ?? now;
  if (id !== undefined) clock.byId.set(id, start);
  if (group !== undefined) clock.byGroup.set(group, { start, endedAt: null });
  return start;
}

/** 말풍선이 내려갔습니다 — 곧바로 다시 서면 이어 가도록 내려간 때를 적습니다. */
export function pendingEnded(clock: PendingClock, group: string | undefined, now: number): void {
  const running = group === undefined ? undefined : clock.byGroup.get(group);
  if (group !== undefined && running !== undefined)
    clock.byGroup.set(group, { start: running.start, endedAt: now });
}
