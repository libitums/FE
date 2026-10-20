// 맵을 앱이 직접 프레임마다 옮기는 부드러운 스크롤입니다. 호스트의 `scrollTo({ smooth })`는 길이를 정할 수 없고
// 짧게 휙 지나가 부자연스러웠습니다(2026-10-20 사용자 지적) — 거리에 맞춘 길이로 빠르게 출발해 길게 감속하며 멈춥니다.
// 프레임은 화면 갱신(`requestAnimationFrame`)에 맞춥니다 — 고정 16ms 타이머는 갱신과 어긋나 계단처럼 보였습니다.

/** 거리(px) → 길이(ms). 짧은 거리도 너무 빠르지 않게, 긴 거리도 너무 늘어지지 않게 묶습니다. */
export function mapScrollDurationMs(distance: number): number {
  return Math.round(Math.min(1100, Math.max(700, 600 + Math.abs(distance) * 0.35)));
}

/** 0..1 → 0..1. 빠르게 출발해 길게 감속합니다(ease-out quint) — 끝이 미끄러지듯 내려앉습니다. */
export function easeOutQuint(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 5;
}

/** 시작 · 끝 · 경과 시간 → 그 순간의 자리. 끝을 지나면 정확히 끝입니다. */
export function mapScrollFrameAt(from: number, to: number, elapsedMs: number, durationMs: number) {
  if (durationMs <= 0 || elapsedMs >= durationMs) return to;
  return from + (to - from) * easeOutQuint(elapsedMs / durationMs);
}

type FrameScheduler = {
  readonly request: (callback: () => void) => unknown;
  readonly cancel: (handle: unknown) => void;
};

// 화면 갱신에 맞춘 프레임입니다. 없는 환경(테스트 등)에서는 16ms 타이머로 갑니다.
const defaultScheduler: FrameScheduler =
  typeof requestAnimationFrame === "function"
    ? {
        request: (callback) => requestAnimationFrame(() => callback()),
        cancel: (handle) => cancelAnimationFrame(handle as number),
      }
    : {
        request: (callback) => setTimeout(callback, 16),
        cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      };

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
  scheduler: FrameScheduler = defaultScheduler,
): () => void {
  const start = now();
  let handle: unknown = null;
  let stopped = false;
  let last = Number.NaN;
  const step = (): void => {
    if (stopped) return;
    const elapsed = now() - start;
    // 반 픽셀 밑의 변화는 보내지 않습니다 — 끝자락의 같은 자리 호출로 프레임을 쓰지 않습니다.
    const next = Math.round(mapScrollFrameAt(from, to, elapsed, durationMs) * 2) / 2;
    if (next !== last || elapsed >= durationMs) {
      last = next;
      move(elapsed >= durationMs ? to : next);
    }
    handle = elapsed >= durationMs ? null : scheduler.request(step);
  };
  step();
  return () => {
    stopped = true;
    if (handle !== null) scheduler.cancel(handle);
  };
}
