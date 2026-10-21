// 자동 스크롤의 길이입니다. 움직임 자체는 main thread가 돌립니다(`use-map-glide.ts`).

/** 거리(px) → 길이(ms). 짧은 거리도 너무 빠르지 않게, 긴 거리도 너무 늘어지지 않게 1.0 ~ 1.6초로 묶습니다. */
export function mapScrollDurationMs(distance: number): number {
  return Math.round(Math.min(1600, Math.max(1000, 800 + Math.abs(distance) * 0.4)));
}
