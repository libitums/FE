// 맵을 앱이 직접 프레임마다 옮기는 부드러운 스크롤입니다. 호스트의 `scrollTo({ smooth })`는 길이를 정할 수 없고
// 짧게 휙 지나가 부자연스러웠습니다(2026-10-20 사용자 지적) — 거리에 맞춘 길이로 천천히 출발해 천천히 멈춥니다.

/** 거리(px) → 길이(ms). 짧은 거리도 너무 빠르지 않게, 긴 거리도 너무 늘어지지 않게 묶습니다. */
export function mapScrollDurationMs(distance: number): number {
  return Math.round(Math.min(900, Math.max(500, 400 + Math.abs(distance) * 0.4)));
}

/** 0..1 → 0..1. 천천히 출발해 천천히 멈춥니다(ease-in-out cubic). */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** 시작 · 끝 · 경과 시간 → 그 순간의 자리. 끝을 지나면 정확히 끝입니다. */
export function mapScrollFrameAt(from: number, to: number, elapsedMs: number, durationMs: number) {
  if (durationMs <= 0 || elapsedMs >= durationMs) return to;
  return from + (to - from) * easeInOutCubic(elapsedMs / durationMs);
}

const frameMs = 16;

/**
 * `from`에서 `to`로 `durationMs` 동안 옮깁니다. 프레임마다 `scrollTo(instant)`를 부르는 함수(`move`)를 받습니다.
 * 돌려준 함수를 부르면 멈춥니다(손댐 · 화면 떠남).
 */
export function animateMapScroll(
  from: number,
  to: number,
  durationMs: number,
  move: (scrollTop: number) => void,
  now: () => number = Date.now,
): () => void {
  const start = now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const step = (): void => {
    if (stopped) return;
    const elapsed = now() - start;
    move(mapScrollFrameAt(from, to, elapsed, durationMs));
    timer = elapsed >= durationMs ? null : setTimeout(step, frameMs);
  };
  step();
  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
  };
}
